/**
 * @fileoverview Hook for managing a single mood entry
 * @module hooks/useMoodEntry
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { MoodEntry, MoodGrade } from '../types';
import { getEntry, peekEntryFromSessionCache, upsertEntry, createEntry } from '../storage/entries';
import { primeAppStorage } from '../storage/prime';
import { getToday, isLatestRequest, nextRequestId } from '../utils';
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

function applyEntrySnapshot(
  entry: MoodEntry | null,
  setMood: (v: MoodGrade | null | ((p: MoodGrade | null) => MoodGrade | null)) => void,
  setNote: (v: string | ((p: string) => string)) => void,
  setIsExisting: (v: boolean | ((p: boolean) => boolean)) => void
): void {
  const nextMood = entry?.mood ?? null;
  const nextNote = entry?.note ?? '';
  const nextExisting = !!entry;
  setMood((prev) => (prev === nextMood ? prev : nextMood));
  setNote((prev) => (prev === nextNote ? prev : nextNote));
  setIsExisting((prev) => (prev === nextExisting ? prev : nextExisting));
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

  const [mood, setMood] = useState<MoodGrade | null>(null);
  const [note, setNote] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    nextRequestId(loadReqIdRef);
    const peeked = peekEntryFromSessionCache(date);
    if (peeked !== undefined) {
      applyEntrySnapshot(peeked, setMood, setNote, setIsExisting);
    }
  }, [date]);

  const load = useCallback(async () => {
    const reqId = nextRequestId(loadReqIdRef);
    try {
      let peeked = peekEntryFromSessionCache(date);
      if (peeked === undefined) {
        await primeAppStorage();
        peeked = peekEntryFromSessionCache(date);
      }
      const entry = peeked !== undefined ? peeked : await getEntry(date);
      if (!mountedRef.current || !isLatestRequest(loadReqIdRef, reqId)) return;
      applyEntrySnapshot(entry, setMood, setNote, setIsExisting);
    } catch {
      logger.warn('today.loadEntry.failed', { dateKey: date });
    }
  }, [date]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!mood) return false;

    const reqId = nextRequestId(saveReqIdRef);
    const entry = createEntry(date, mood, note);

    // Optimistic UI: haptics + “Saved” immediately; disk write continues async.
    setIsExisting(true);
    onSaveSuccessRef.current?.();

    void upsertEntry(entry)
      .then(() => {
        if (!mountedRef.current || !isLatestRequest(saveReqIdRef, reqId)) return;
      })
      .catch((error) => {
        if (mountedRef.current && isLatestRequest(saveReqIdRef, reqId)) {
          onSaveErrorRef.current?.(error as Error);
        }
      });

    return true;
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
    setMood,
    setNote,
    load,
    save,
    reset,
  };
}
