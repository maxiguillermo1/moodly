/**
 * @fileoverview Journal screen - Scrollable timeline of all entries
 * @module screens/JournalScreen
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MoodEntry, MoodGrade } from '../types';
import { ScreenHeader, MoodBadge } from '../components';
import {
  getEntriesSortedDesc,
  upsertEntry,
  deleteEntry,
} from '../storage';
import { getRelativeDayLabel, formatDateForDisplay } from '../utils';
import { logger } from '../security';
import { PerfProfiler, usePerfScreen } from '../perf';
import { colors, spacing, borderRadius, typography } from '../theme';
import { JournalEditModal } from './journal/JournalEditModal';
import { Touchable } from '../ui/Touchable';
import { interactionQueue } from '../system/interactionQueue';
import { haptics } from '../system/haptics';

/**
 * PERF experiment toggle (small + reversible).
 *
 * Baseline-first rule:
 * - Keep this as `'flatlist'` to collect baseline numbers.
 * - Switch to `'flashlist'` to collect post-change numbers.
 *
 * Rollback:
 * - Set back to `'flatlist'` (no other code changes needed).
 */
const JOURNAL_LIST_IMPL: 'flatlist' | 'flashlist' = 'flatlist';

export default function JournalScreen() {
  usePerfScreen('Journal', { listIds: ['list.journal'] });

  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const [editMood, setEditMood] = useState<MoodGrade | null>(null);
  const [editNote, setEditNote] = useState('');

  const loadCountRef = useRef(0);

  const reloadJournalEntries = useCallback(async () => {
    const phase = loadCountRef.current === 0 ? 'cold' : 'warm';
    loadCountRef.current += 1;
    const p: any = (globalThis as any).performance;
    const start = typeof p?.now === 'function' ? p.now() : Date.now();
    const sorted = await getEntriesSortedDesc();
    setEntries((prev) => (prev === sorted ? prev : sorted));
    const end = typeof p?.now === 'function' ? p.now() : Date.now();
    logger.perf('journal.loadEntries', {
      phase,
      source: 'sessionCache',
      durationMs: Number(((end as number) - (start as number)).toFixed(1)),
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadJournalEntries();
    }, [reloadJournalEntries])
  );

  const handleTapEntry = useCallback((entry: MoodEntry) => {
    haptics.select();
    setEditingEntry(entry);
    setEditMood(entry.mood);
    setEditNote(entry.note);
  }, []);

  const handleLongPressEntry = useCallback((entry: MoodEntry) => {
    Alert.alert(
      'Delete Entry',
      `Delete your entry for ${formatDateForDisplay(entry.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.date);
              reloadJournalEntries();
            } catch {
              logger.warn('journal.delete.failed', { dateKey: entry.date });
              Alert.alert('Error', 'Failed to delete. Please try again.');
            }
          },
        },
      ]
    );
  }, [reloadJournalEntries]);

  const handleCloseEdit = useCallback(() => {
    setEditingEntry(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingEntry || !editMood) return;

    try {
      await upsertEntry({
        ...editingEntry,
        mood: editMood,
        note: editNote.trim(),
        updatedAt: Date.now(),
      });

      haptics.success();
      setEditingEntry(null);
      reloadJournalEntries();
    } catch {
      haptics.error();
      logger.warn('journal.edit.save.failed', { dateKey: editingEntry.date });
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  }, [editMood, editNote, editingEntry, reloadJournalEntries]);

  const keyExtractor = useCallback((item: MoodEntry) => item.date, []);

  const JournalRow = useMemo(() => {
    return React.memo(function Row(props: {
      entry: MoodEntry;
      onTap: (e: MoodEntry) => void;
      onLongPress: (e: MoodEntry) => void;
    }) {
      const { entry, onTap, onLongPress } = props;
      const handlePress = useCallback(() => onTap(entry), [entry, onTap]);
      const handleLong = useCallback(() => onLongPress(entry), [entry, onLongPress]);
      return (
        <Touchable
          style={styles.row}
          onPress={handlePress}
          onLongPress={handleLong}
          accessibilityRole="button"
          accessibilityLabel={`${getRelativeDayLabel(entry.date)} entry`}
        >
          <View style={styles.rowLeft}>
            <Text style={styles.rowTitle} allowFontScaling>
              {getRelativeDayLabel(entry.date)}
            </Text>
            <Text style={styles.rowSubtitle} allowFontScaling numberOfLines={1}>
              {entry.note || 'No note'}
            </Text>
          </View>

          <MoodBadge grade={entry.mood} size="sm" />
        </Touchable>
      );
    });
  }, []);

  const renderEntry = useCallback(
    ({ item }: { item: MoodEntry }) => {
      return <JournalRow entry={item} onTap={handleTapEntry} onLongPress={handleLongPressEntry} />;
    },
    [JournalRow, handleLongPressEntry, handleTapEntry]
  );

  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📔</Text>
        <Text style={styles.emptyTitle}>Your Journal is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Start tracking your mood on the Today tab to see your entries here
        </Text>
      </View>
    );
  }, []);

  const listContentStyle = useMemo(
    () => [styles.listContent, entries.length === 0 && styles.emptyContainer],
    [entries.length]
  );

  const onScrollBeginDrag = useCallback(() => {
    interactionQueue.setUserScrolling(true);
    interactionQueue.setMomentum(false);
  }, []);

  const onScrollEndDrag = useCallback(() => {
    interactionQueue.setUserScrolling(false);
  }, []);

  const onMomentumScrollBegin = useCallback(() => {
    interactionQueue.setUserScrolling(true);
    interactionQueue.setMomentum(true);
  }, []);

  const onMomentumScrollEnd = useCallback(() => {
    interactionQueue.setMomentum(false);
    interactionQueue.setUserScrolling(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Journal" />

      <PerfProfiler id="list.journal">
        {JOURNAL_LIST_IMPL === 'flashlist' ? (
          /**
           * PERF: FlashList improves virtualization + memory behavior for large lists.
           * This is a low-risk swap because it’s a FlatList-compatible surface for our usage.
           *
           * FlashList v2 note:
           * - `estimatedItemSize` is deprecated/removed, so we do NOT pass it.
           */
          <FlashList
            data={entries}
            keyExtractor={keyExtractor}
            renderItem={renderEntry}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={listContentStyle as any}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollBegin={onMomentumScrollBegin}
            onMomentumScrollEnd={onMomentumScrollEnd}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={keyExtractor}
            renderItem={renderEntry}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={listContentStyle as any}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            initialNumToRender={12}
            windowSize={7}
            maxToRenderPerBatch={12}
            updateCellsBatchingPeriod={50}
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollBegin={onMomentumScrollBegin}
            onMomentumScrollEnd={onMomentumScrollEnd}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </PerfProfiler>

      <JournalEditModal
        editingEntry={editingEntry}
        editMood={editMood}
        editNote={editNote}
        setEditMood={setEditMood}
        setEditNote={setEditNote}
        onCancel={handleCloseEdit}
        onSave={handleSaveEdit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.system.background,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  rowLeft: {
    flex: 1,
    marginRight: spacing[3],
  },
  rowTitle: {
    ...typography.headline,
    color: colors.system.label,
  },
  rowSubtitle: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    marginTop: 2,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing[10],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...typography.title2,
    color: colors.system.label,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.system.secondaryLabel,
    textAlign: 'center',
  },
});
