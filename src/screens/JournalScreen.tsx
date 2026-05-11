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
import { MoodEntry, MoodGrade, MoodGradeColorStyle } from '../types';
import { ScreenHeader, MoodBadge } from '../components';
import {
  getEntriesSortedDesc,
  upsertEntry,
  deleteEntry,
} from '../storage';
import { getRelativeDayLabel, formatDateForDisplay } from '../utils';
import { logger } from '../security';
import { PerfProfiler, usePerfScreen } from '../perf';
import { useAppTheme, spacing, borderRadius, typography } from '../theme';
import { JournalEditModal } from './journal/JournalEditModal';
import { Touchable } from '../ui/Touchable';
import { interactionQueue } from '../system/interactionQueue';
import { haptics } from '../system/haptics';

/**
 * PERF experiment toggle (small + reversible).
 *
 * Default: `'flashlist'` for smoother scrolling and lower memory on long timelines.
 *
 * Rollback:
 * - Set to `'flatlist'` if you need to compare baselines or hit a FlashList edge case.
 */
const JOURNAL_LIST_IMPL: 'flatlist' | 'flashlist' = 'flashlist';

export default function JournalScreen() {
  usePerfScreen('Journal', { listIds: ['list.journal'] });
  const appTheme = useAppTheme();
  const s = appTheme.system;
  const windowHeight = appTheme.windowHeight;
  const moodGradeColorStyle = appTheme.moodGradeColorStyle;
  const isDark = appTheme.isDark;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: s.background,
        },
        listContent: {
          paddingHorizontal: spacing[4],
          paddingBottom: 120,
        },
        emptyContainer: {
          flexGrow: 1,
          justifyContent: 'center',
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: s.secondaryBackground,
          borderRadius: borderRadius.lg,
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          marginTop: spacing[2],
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
        },
        rowLeft: {
          flex: 1,
          marginRight: spacing[3],
        },
        rowTitle: {
          ...typography.headline,
          color: s.label,
        },
        rowSubtitle: {
          ...typography.footnote,
          color: s.secondaryLabel,
          marginTop: 2,
        },
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
          color: s.label,
          marginBottom: spacing[2],
          textAlign: 'center',
        },
        emptySubtitle: {
          ...typography.body,
          color: s.secondaryLabel,
          textAlign: 'center',
        },
      }),
    [s]
  );

  const listSurfaceStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: s.background }),
    [s.background]
  );

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
    function Row(props: {
      entry: MoodEntry;
      onTap: (e: MoodEntry) => void;
      onLongPress: (e: MoodEntry) => void;
      moodGradeColorStyle: MoodGradeColorStyle;
      isDark: boolean;
    }) {
      const { entry, onTap, onLongPress, moodGradeColorStyle: moodStyle, isDark: moodIsDark } = props;
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
            <Text style={styles.rowTitle} allowFontScaling maxFontSizeMultiplier={1.3}>
              {getRelativeDayLabel(entry.date)}
            </Text>
            <Text style={styles.rowSubtitle} allowFontScaling numberOfLines={1} maxFontSizeMultiplier={1.34}>
              {entry.note || 'No note'}
            </Text>
          </View>

          <MoodBadge grade={entry.mood} size="sm" moodGradeColorStyle={moodStyle} isDark={moodIsDark} />
        </Touchable>
      );
    }
    return Row;
  }, [styles]);

  const renderEntry = useCallback(
    ({ item }: { item: MoodEntry }) => {
      return <JournalRow entry={item} moodGradeColorStyle={moodGradeColorStyle} isDark={isDark} onTap={handleTapEntry} onLongPress={handleLongPressEntry} />;
    },
    [JournalRow, handleLongPressEntry, handleTapEntry, isDark, moodGradeColorStyle]
  );

  const renderEmptyState = useCallback(() => {
    return (
      <View style={[styles.emptyContainer, { minHeight: Math.round(Math.min(windowHeight * 0.5, 480)) }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📔</Text>
          <Text style={styles.emptyTitle} allowFontScaling maxFontSizeMultiplier={1.28}>
            Your Journal is Empty
          </Text>
          <Text style={styles.emptySubtitle} allowFontScaling maxFontSizeMultiplier={1.35}>
            Start tracking your mood on the Today tab to see your entries here
          </Text>
        </View>
      </View>
    );
  }, [styles.emptyContainer, styles.emptyState, styles.emptyIcon, styles.emptyTitle, styles.emptySubtitle, windowHeight]);

  const listContentStyle = useMemo(
    () => [styles.listContent, { flexGrow: 1 }],
    [styles.listContent]
  );

  const journalListExtraData = useMemo(() => ({ moodGradeColorStyle, isDark }), [isDark, moodGradeColorStyle]);

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
            style={listSurfaceStyle}
            contentContainerStyle={listContentStyle as any}
            drawDistance={500}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollBegin={onMomentumScrollBegin}
            onMomentumScrollEnd={onMomentumScrollEnd}
            keyboardShouldPersistTaps="handled"
            extraData={journalListExtraData}
          />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={keyExtractor}
            renderItem={renderEntry}
            ListEmptyComponent={renderEmptyState}
            style={listSurfaceStyle}
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
            extraData={journalListExtraData}
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
