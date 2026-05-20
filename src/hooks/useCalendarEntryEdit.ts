/**
 * @fileoverview Calendar day selection + quick-edit sheet state and save.
 * @module hooks/useCalendarEntryEdit
 */

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Alert, AppState } from 'react-native';
import type { MoodEntry, MoodGrade } from '../types';
import { createEntry, upsertEntry } from '../storage/entries';
import { isValidLocalCalendarDayKey } from '../utils';
import { logger } from '../security';
import { perfProbe } from '../perf';
import { haptics } from '../system/haptics';
import { useCalendarDayPress } from './useCalendarDayPress';

export type CalendarEntryEditConfig = {
  initialSelectedDate: string;
  mountedRef: MutableRefObject<boolean>;
  entriesRevisionRef: MutableRefObject<number>;
  setEntriesByMonthKey: React.Dispatch<React.SetStateAction<Record<string, Record<string, MoodEntry>>>>;
  reduceMotion: boolean;
};

export function useCalendarEntryEdit({
  initialSelectedDate,
  mountedRef,
  entriesRevisionRef,
  setEntriesByMonthKey,
  reduceMotion,
}: CalendarEntryEditConfig) {
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMood, setEditMood] = useState<MoodGrade | null>(null);
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const getEntryReqIdRef = useRef(0);

  const closeEdit = useCallback(() => setIsEditOpen(false), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      if (!mountedRef.current) return;
      if (isSavingRef.current) setIsSaving(true);
    });
    return () => sub.remove();
  }, [mountedRef]);

  const handlePressDate = useCalendarDayPress({
    getEntryReqIdRef,
    setSelectedDate,
    setEditMood,
    setEditNote,
    setIsEditOpen,
  });

  const handleSave = useCallback(async () => {
    const saveStartMs = perfProbe.enabled ? perfProbe.nowMs() : 0;
    if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.modalSave');
    if (!isValidLocalCalendarDayKey(selectedDate)) {
      Alert.alert('Error', 'This day could not be saved. Try selecting the day again.');
      return;
    }
    if (!editMood) {
      Alert.alert('Pick a mood', 'Choose a mood before saving.');
      return;
    }
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    const next = createEntry(selectedDate, editMood, editNote);
    mountedRef.current &&
      setEntriesByMonthKey((prev) => {
        const mk = selectedDate.slice(0, 7);
        const monthMap = prev[mk] ?? {};
        entriesRevisionRef.current += 1;
        return { ...prev, [mk]: { ...monthMap, [selectedDate]: next } };
      });
    if (!reduceMotion) haptics.success();
    mountedRef.current && setIsEditOpen(false);
    if (perfProbe.enabled) {
      perfProbe.measureSince('calendar.modalSave.success', saveStartMs, { phase: 'warm', source: 'ui' });
      perfProbe.setCulpritPhase(null);
    }

    void upsertEntry(next)
      .catch(() => {
        if (!reduceMotion) haptics.error();
        logger.warn('calendar.save.failed', { dateKey: selectedDate });
        Alert.alert('Error', 'Failed to save. Please try again.');
        if (perfProbe.enabled) {
          perfProbe.measureSince('calendar.modalSave.failed', saveStartMs, { phase: 'warm', source: 'ui' });
        }
      })
      .finally(() => {
        isSavingRef.current = false;
      });
  }, [editMood, editNote, entriesRevisionRef, mountedRef, reduceMotion, selectedDate, setEntriesByMonthKey]);

  return {
    selectedDate,
    selectedDateRef,
    isEditOpen,
    editMood,
    editNote,
    isSaving,
    setEditMood,
    setEditNote,
    closeEdit,
    handlePressDate,
    handleSave,
  };
}
