/**
 * @fileoverview Hook for managing a single mood entry
 * @module hooks/useMoodEntry
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { MoodGrade } from '../types';
import { getEntry, upsertEntry, createEntry } from '../storage';
import { getToday } from '../utils';
import { logger } from '../security';

interface UseMoodEntryOptions {
  date?: string;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface UseMoodEntryReturn {
  /** Currently selected mood grade */
  mood: MoodGrade | null;
  /** Note text */
  note: string;
  /** Whether an existing entry was loaded */
  isExisting: boolean;
  /** Saving state */
  isSaving: boolean;
  /** Set the mood grade */
  setMood: (mood: MoodGrade) => void;
  /** Set the note text */
  setNote: (note: string) => void;
  /** Load entry for the date */
  load: () => Promise<void>;
  /** Save the current entry */
  save: () => Promise<boolean>;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for managing mood entry state and persistence
 */
export function useMoodEntry(options: UseMoodEntryOptions = {}): UseMoodEntryReturn {
  const { date = getToday(), onSaveSuccess, onSaveError } = options;
  /** Keep latest callbacks without changing `save` identity every parent render (Today tab perf). */
  const onSaveSuccessRef = useRef(onSaveSuccess);
  const onSaveErrorRef = useRef(onSaveError);
  onSaveSuccessRef.current = onSaveSuccess;
  onSaveErrorRef.current = onSaveError;
  const mountedRef = useRef(true);
  const loadReqIdRef = useRef(0);
  const saveReqIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [mood, setMood] = useState<MoodGrade | null>(null);
  const [note, setNote] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const reqId = ++loadReqIdRef.current;
    try {
      const entry = await getEntry(date);
      if (!mountedRef.current || reqId !== loadReqIdRef.current) return;
      const nextMood = entry?.mood ?? null;
      const nextNote = entry?.note ?? '';
      const nextExisting = !!entry;
      // Avoid focus/refetch churn when values are unchanged (Today tab stays mounted under tabs).
      setMood((prev) => (prev === nextMood ? prev : nextMood));
      setNote((prev) => (prev === nextNote ? prev : nextNote));
      setIsExisting((prev) => (prev === nextExisting ? prev : nextExisting));
    } catch {
      // Defensive: storage issues should never crash the UI.
      // Keep prior state if possible; otherwise reset to safe defaults.
      logger.warn('today.loadEntry.failed', { dateKey: date });
    }
  }, [date]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!mood) return false;

    const reqId = ++saveReqIdRef.current;
    setIsSaving(true);
    try {
      const entry = createEntry(date, mood, note);
      await upsertEntry(entry);
      if (!mountedRef.current || reqId !== saveReqIdRef.current) return true;
      setIsExisting(true);
      onSaveSuccessRef.current?.();
      return true;
    } catch (error) {
      if (mountedRef.current && reqId === saveReqIdRef.current) {
        onSaveErrorRef.current?.(error as Error);
      }
      return false;
    } finally {
      if (mountedRef.current && reqId === saveReqIdRef.current) setIsSaving(false);
    }
  }, [date, mood, note]);

  const reset = useCallback(() => {
    setMood(null);
    setNote('');
    setIsExisting(false);
  }, []);

  return {
    mood,
    note,
    isExisting,
    isSaving,
    setMood,
    setNote,
    load,
    save,
    reset,
  };
}
