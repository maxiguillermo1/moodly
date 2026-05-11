/**
 * @fileoverview Hook for managing a single mood entry
 * @module hooks/useMoodEntry
 */

import { useState, useCallback } from 'react';
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

  const [mood, setMood] = useState<MoodGrade | null>(null);
  const [note, setNote] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const entry = await getEntry(date);
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

    setIsSaving(true);
    try {
      const entry = createEntry(date, mood, note);
      await upsertEntry(entry);
      setIsExisting(true);
      onSaveSuccess?.();
      return true;
    } catch (error) {
      onSaveError?.(error as Error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [date, mood, note, onSaveSuccess, onSaveError]);

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
