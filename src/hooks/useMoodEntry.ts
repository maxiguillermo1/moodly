/**
 * @fileoverview Hook for managing a single mood entry
 * @module hooks/useMoodEntry
 */

import { useState, useCallback } from 'react';
import { MoodGrade } from '../types';
import { getEntry, upsertEntry, createEntry } from '../data';
import { getToday } from '../lib/utils/date';

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
  /** Loading state */
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const entry = await getEntry(date);
      if (entry) {
        setMood(entry.mood);
        setNote(entry.note);
        setIsExisting(true);
      } else {
        setMood(null);
        setNote('');
        setIsExisting(false);
      }
    } catch (e) {
      // Defensive: storage issues should never crash the UI.
      // Keep prior state if possible; otherwise reset to safe defaults.
      console.warn('[useMoodEntry] load failed:', e);
    } finally {
      setIsLoading(false);
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
    isLoading,
    isSaving,
    setMood,
    setNote,
    load,
    save,
    reset,
  };
}
