/**
 * @fileoverview Journal screen - Scrollable timeline of all entries
 * @module features/journal/screens/JournalScreen
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  SectionList,
  ActivityIndicator,
  type SectionListRenderItemInfo,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MoodEntry, MoodGrade } from '@/types';
import { ScreenHeader, screenHeaderPrimaryTabPaddingX } from '@/components';
import { upsertEntry, deleteEntry } from '@/storage';
import {
  formatDateForDisplay,
  isValidLocalCalendarDayKey,
  monthNameLongEn,
  buildMonthSections,
  buildWeekdaySections,
  buildMoodSections,
  applySoloMonthFilter,
  applySoloWeekdayFilter,
  applySoloMoodFilter,
  a11yAnnouncementForViewMode,
  scanJournalEntryPresence,
  nextMoodSoloFromHeaderTap,
  nextWeekdaySoloFromHeaderTap,
  nextMonthSoloFromHeaderTap,
  JOURNAL_WEEKDAY_SECTION_NAMES,
  type JournalViewMode,
  type JournalListSection,
} from '@/utils';
import { logger } from '@/security';
import { PerfProfiler, usePerfScreen } from '@/perf';
import { useJournalEntriesLoad } from '@/hooks';
import { useAppTheme, spacing, borderRadius, typography } from '@/theme';
import { JournalEntryRow } from '../components/JournalEntryRow';
import { JournalEditModal } from './JournalEditModal';
import { Touchable } from '@/ui/Touchable';
import { haptics } from '@/system/haptics';
import { useScrollDrivenTabBarVisibility, useShowTabBarOnScreenBlur } from '@/hooks';
import { announceForAccessibility, formatMoodA11yLabel } from '@/system/accessibility';

const JOURNAL_VIEW_OPTIONS: { mode: JournalViewMode; label: string }[] = [
  { mode: 'newest', label: 'Newest first' },
  { mode: 'oldest', label: 'Oldest first' },
  { mode: 'byMonth', label: 'By month' },
  { mode: 'byDay', label: 'By weekday (Mon–Sun)' },
  { mode: 'byMood', label: 'By mood (A+–F)' },
];

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
  const {
    showTabBar,
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
  } = useScrollDrivenTabBarVisibility();
  useShowTabBarOnScreenBlur(showTabBar);
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
          paddingHorizontal: screenHeaderPrimaryTabPaddingX,
          paddingBottom: 120,
        },
        sortHeader: {
          alignSelf: 'stretch',
          paddingTop: spacing[1],
          paddingBottom: spacing[1],
        },
        sortTriggerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: spacing[1],
        },
        sortTriggerLabel: {
          ...typography.subhead,
          color: s.secondaryLabel,
          fontWeight: '600',
        },
        sortMenuCard: {
          marginTop: spacing[2],
          borderRadius: borderRadius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          backgroundColor: s.secondaryBackground,
          overflow: 'hidden',
        },
        sortMenuRow: {
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: s.separator,
        },
        sortMenuRowLast: {
          borderBottomWidth: 0,
        },
        sortMenuRowSelected: {
          backgroundColor: s.tertiaryFill,
        },
        sortMenuRowLabel: {
          ...typography.body,
          color: s.label,
        },
        sortMenuRowLabelMuted: {
          color: s.secondaryLabel,
        },
        journalFlatEntryTotal: {
          ...typography.caption2,
          color: s.tertiaryLabel,
          marginTop: spacing[1],
          alignSelf: 'flex-start',
          fontVariant: ['tabular-nums'],
        },
        journalSectionHeaderShell: {
          marginTop: spacing[5],
          marginBottom: spacing[2],
        },
        journalSectionHeaderFirst: {
          marginTop: spacing[2],
        },
        journalSectionCaption: {
          ...typography.caption1,
          fontWeight: '600',
          color: s.secondaryLabel,
          letterSpacing: 0.48,
          textTransform: 'uppercase',
        },
        /** Weekday + month group titles: strong primary emphasis. */
        journalSectionCaptionBold: {
          ...typography.caption1,
          fontWeight: '700',
          color: s.label,
          letterSpacing: 0.48,
          textTransform: 'uppercase',
        },
        journalSectionMeta: {
          ...typography.footnote,
          color: s.tertiaryLabel,
          marginTop: spacing[1],
          fontVariant: ['tabular-nums'],
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
          fontSize: 63,
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
        loadingEmpty: {
          paddingTop: spacing[8],
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [s]
  );

  const listSurfaceStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: s.background }),
    [s.background]
  );

  const [viewMode, setViewMode] = useState<JournalViewMode>('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  /** By mood: `null` = all grades visible (after long press); otherwise only that grade (sort opens on A+). */
  const [byMoodSoloGrade, setByMoodSoloGrade] = useState<MoodGrade | null>(null);
  /** By month: `null` = all months; otherwise only that `YYYY-MM` section (tap month header to cycle). */
  const [byMonthSoloKey, setByMonthSoloKey] = useState<string | null>(null);
  /** By weekday: `null` = all days; 0–6 = Mon–Sun solo (tap header to cycle). */
  const [byDaySoloWeekday, setByDaySoloWeekday] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const [editMood, setEditMood] = useState<MoodGrade | null>(null);
  const [editNote, setEditNote] = useState('');
  const { entriesDesc, journalLoadCompleted, mountedRef, focusedRef, reload: reloadJournalEntries } =
    useJournalEntriesLoad();

  const flatEntries = useMemo(() => {
    if (viewMode === 'oldest') {
      const n = entriesDesc.length;
      if (n <= 1) return entriesDesc;
      const out: MoodEntry[] = new Array(n);
      for (let i = 0; i < n; i += 1) out[i] = entriesDesc[n - 1 - i]!;
      return out;
    }
    return entriesDesc;
  }, [entriesDesc, viewMode]);

  const journalEntryPresence = useMemo(() => scanJournalEntryPresence(entriesDesc), [entriesDesc]);

  const monthSectionsBase = useMemo(
    () => (viewMode === 'byMonth' ? buildMonthSections(entriesDesc) : []),
    [entriesDesc, viewMode]
  );
  const weekdaySectionsBase = useMemo(
    () => (viewMode === 'byDay' ? buildWeekdaySections(entriesDesc) : []),
    [entriesDesc, viewMode]
  );
  const moodSectionsBase = useMemo(
    () => (viewMode === 'byMood' ? buildMoodSections(entriesDesc) : []),
    [entriesDesc, viewMode]
  );

  const journalSectionsForList = useMemo((): JournalListSection[] => {
    switch (viewMode) {
      case 'byMonth':
        return applySoloMonthFilter(monthSectionsBase, byMonthSoloKey);
      case 'byDay':
        return applySoloWeekdayFilter(weekdaySectionsBase, byDaySoloWeekday);
      case 'byMood':
        return applySoloMoodFilter(moodSectionsBase, byMoodSoloGrade);
      default:
        return [];
    }
  }, [
    byDaySoloWeekday,
    byMonthSoloKey,
    byMoodSoloGrade,
    monthSectionsBase,
    moodSectionsBase,
    viewMode,
    weekdaySectionsBase,
  ]);

  useEffect(() => {
    if (viewMode !== 'byMonth' || byMonthSoloKey === null) return;
    if (!journalEntryPresence.monthKeysSet.has(byMonthSoloKey)) setByMonthSoloKey(null);
  }, [byMonthSoloKey, journalEntryPresence.monthKeysSet, viewMode]);

  useEffect(() => {
    if (viewMode !== 'byDay' || byDaySoloWeekday === null) return;
    if (!journalEntryPresence.weekdaySet.has(byDaySoloWeekday)) setByDaySoloWeekday(null);
  }, [byDaySoloWeekday, journalEntryPresence.weekdaySet, viewMode]);

  const advanceByMoodHeaderTap = useCallback(
    (fromGrade: MoodGrade) => {
      const { moodsWithEntries } = journalEntryPresence;
      if (moodsWithEntries.length === 0) return;

      haptics.select();
      const next = nextMoodSoloFromHeaderTap(fromGrade, byMoodSoloGrade, moodsWithEntries);
      setByMoodSoloGrade(next);
      if (next === null) {
        announceForAccessibility('Showing all mood groups');
      } else {
        announceForAccessibility(`Showing only mood ${formatMoodA11yLabel(next)}`);
      }
    },
    [byMoodSoloGrade, journalEntryPresence]
  );

  const moodSectionHeaderA11yHint = byMoodSoloGrade === null
    ? 'Tap to show only A plus. Long press to show all grades.'
    : 'Tap to show the next mood with entries. Long press to show all grades.';

  const clearByMoodSolo = useCallback(() => {
    if (byMoodSoloGrade === null) return;
    haptics.select();
    setByMoodSoloGrade(null);
    announceForAccessibility('Showing all mood groups');
  }, [byMoodSoloGrade]);

  const advanceByWeekdayHeaderTap = useCallback(
    (fromW: number) => {
      const { weekdaysWithEntries } = journalEntryPresence;
      if (weekdaysWithEntries.length === 0) return;

      haptics.select();
      const next = nextWeekdaySoloFromHeaderTap(fromW, byDaySoloWeekday, weekdaysWithEntries);
      setByDaySoloWeekday(next);
      if (next === null) {
        announceForAccessibility('Showing all weekday groups');
      } else {
        announceForAccessibility(`Showing only ${JOURNAL_WEEKDAY_SECTION_NAMES[next]}`);
      }
    },
    [byDaySoloWeekday, journalEntryPresence]
  );

  const clearByDaySolo = useCallback(() => {
    if (byDaySoloWeekday === null) return;
    haptics.select();
    setByDaySoloWeekday(null);
    announceForAccessibility('Showing all weekday groups');
  }, [byDaySoloWeekday]);

  const advanceByMonthHeaderTap = useCallback(
    (fromMonthKey: string) => {
      const { monthKeysWithEntries } = journalEntryPresence;
      if (monthKeysWithEntries.length === 0) return;

      haptics.select();
      const next = nextMonthSoloFromHeaderTap(fromMonthKey, byMonthSoloKey, monthKeysWithEntries);
      setByMonthSoloKey(next);
      if (next === null) {
        announceForAccessibility('Showing all months');
      } else {
        const monthNum = parseInt(next.slice(5, 7), 10);
        const yearNum = parseInt(next.slice(0, 4), 10);
        const monthIx = monthNum >= 1 && monthNum <= 12 ? monthNum - 1 : 0;
        const title = `${monthNameLongEn(monthIx)} ${yearNum}`.toUpperCase();
        announceForAccessibility(`Showing only ${title}`);
      }
    },
    [byMonthSoloKey, journalEntryPresence]
  );

  const clearByMonthSolo = useCallback(() => {
    if (byMonthSoloKey === null) return;
    haptics.select();
    setByMonthSoloKey(null);
    announceForAccessibility('Showing all months');
  }, [byMonthSoloKey]);

  const isGroupedView = viewMode === 'byMonth' || viewMode === 'byDay' || viewMode === 'byMood';

  const toggleSortMenu = useCallback(() => {
    haptics.select();
    setSortMenuOpen((o) => !o);
  }, []);

  const selectViewMode = useCallback((next: JournalViewMode) => {
    if (next === viewMode) {
      setSortMenuOpen(false);
      return;
    }
    haptics.select();
    setViewMode(next);
    setSortMenuOpen(false);
    if (next === 'byMood') {
      setByMoodSoloGrade('A+');
    } else {
      setByMoodSoloGrade(null);
    }
    if (next !== 'byMonth') {
      setByMonthSoloKey(null);
    }
    if (next !== 'byDay') {
      setByDaySoloWeekday(null);
    }
    announceForAccessibility(a11yAnnouncementForViewMode(next));
  }, [viewMode]);

  const renderSortHeader = useCallback(() => {
    if (entriesDesc.length === 0) return null;
    return (
      <View style={styles.sortHeader}>
        <Touchable
          onPress={toggleSortMenu}
          accessibilityRole="button"
          accessibilityLabel="Sort"
          accessibilityHint="Shows journal ordering and grouping options"
          accessibilityState={{ expanded: sortMenuOpen }}
        >
          <View style={styles.sortTriggerRow}>
            <Text style={styles.sortTriggerLabel} allowFontScaling maxFontSizeMultiplier={1.3}>
              Sort
            </Text>
            <Ionicons
              name={sortMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={s.secondaryLabel}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </View>
        </Touchable>

        {(viewMode === 'newest' || viewMode === 'oldest') && !sortMenuOpen ? (
          <Text style={styles.journalFlatEntryTotal} allowFontScaling maxFontSizeMultiplier={1.34}>
            {entriesDesc.length} {entriesDesc.length === 1 ? 'entry' : 'entries'}
          </Text>
        ) : null}

        {sortMenuOpen ? (
          <View style={styles.sortMenuCard} accessibilityViewIsModal>
            {JOURNAL_VIEW_OPTIONS.map((opt, idx) => {
              const selected = viewMode === opt.mode;
              const isLast = idx === JOURNAL_VIEW_OPTIONS.length - 1;
              return (
                <Touchable
                  key={opt.mode}
                  onPress={() => selectViewMode(opt.mode)}
                  style={[
                    styles.sortMenuRow,
                    isLast && styles.sortMenuRowLast,
                    selected && styles.sortMenuRowSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.sortMenuRowLabel, !selected && styles.sortMenuRowLabelMuted]}
                    allowFontScaling
                    maxFontSizeMultiplier={1.32}
                  >
                    {opt.label}
                  </Text>
                </Touchable>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  }, [entriesDesc.length, selectViewMode, sortMenuOpen, styles, s.secondaryLabel, toggleSortMenu, viewMode]);

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
              if (mountedRef.current) void reloadJournalEntries();
            } catch {
              if (!mountedRef.current || !focusedRef.current) return;
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
    if (!isValidLocalCalendarDayKey(editingEntry.date)) {
      logger.warn('journal.edit.save.invalidDateKey', { dateKey: editingEntry.date });
      Alert.alert('Error', 'Could not save this entry. Please try again.');
      return;
    }

    try {
      await upsertEntry({
        ...editingEntry,
        mood: editMood,
        note: editNote.trim(),
        updatedAt: Date.now(),
      });

      if (!mountedRef.current || !focusedRef.current) return;
      haptics.success();
      announceForAccessibility(`Saved ${formatDateForDisplay(editingEntry.date)}`);
      setEditingEntry(null);
      void reloadJournalEntries();
    } catch {
      if (!mountedRef.current || !focusedRef.current) return;
      haptics.error();
      logger.warn('journal.edit.save.failed', { dateKey: editingEntry.date });
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  }, [editMood, editNote, editingEntry, reloadJournalEntries]);

  const keyExtractor = useCallback((item: MoodEntry) => item.date, []);

  const journalRowStyles = useMemo(
    () => ({
      row: styles.row,
      rowLeft: styles.rowLeft,
      rowTitle: styles.rowTitle,
      rowSubtitle: styles.rowSubtitle,
    }),
    [styles.row, styles.rowLeft, styles.rowTitle, styles.rowSubtitle]
  );

  const renderEntry = useCallback(
    ({ item }: SectionListRenderItemInfo<MoodEntry, JournalListSection> | { item: MoodEntry }) => {
      return (
        <JournalEntryRow
          entry={item}
          moodGradeColorStyle={moodGradeColorStyle}
          isDark={isDark}
          onTap={handleTapEntry}
          onLongPress={handleLongPressEntry}
          rowStyles={journalRowStyles}
        />
      );
    },
    [handleLongPressEntry, handleTapEntry, isDark, journalRowStyles, moodGradeColorStyle]
  );

  const renderJournalSectionHeader = useCallback(
    ({ section }: { section: JournalListSection }) => {
      const shellStyle = [
        styles.journalSectionHeaderShell,
        section.isFirst && styles.journalSectionHeaderFirst,
      ];
      if (section.kind === 'mood' && section.moodGrade) {
        const g = section.moodGrade;
        return (
          <View style={shellStyle}>
            <Touchable
              onPress={() => advanceByMoodHeaderTap(g)}
              onLongPress={clearByMoodSolo}
              accessibilityRole="button"
              accessibilityLabel={formatMoodA11yLabel(g)}
              accessibilityHint={moodSectionHeaderA11yHint}
            >
              <View>
                <Text style={styles.journalSectionCaptionBold} allowFontScaling maxFontSizeMultiplier={1.3}>
                  {section.title}
                </Text>
                <Text style={styles.journalSectionMeta} allowFontScaling maxFontSizeMultiplier={1.34}>
                  {section.subtitle}
                </Text>
              </View>
            </Touchable>
          </View>
        );
      }
      if (section.kind === 'day' && section.weekdayIndex0 !== undefined) {
        const w = section.weekdayIndex0;
        return (
          <View style={shellStyle}>
            <Touchable
              onPress={() => advanceByWeekdayHeaderTap(w)}
              onLongPress={clearByDaySolo}
              accessibilityRole="button"
              accessibilityLabel={JOURNAL_WEEKDAY_SECTION_NAMES[w]}
              accessibilityHint="Tap to hide other weekdays and show the next day. Long press to show all weekdays."
            >
              <View>
                <Text style={styles.journalSectionCaptionBold} allowFontScaling maxFontSizeMultiplier={1.3}>
                  {section.title}
                </Text>
                <Text style={styles.journalSectionMeta} allowFontScaling maxFontSizeMultiplier={1.34}>
                  {section.subtitle}
                </Text>
              </View>
            </Touchable>
          </View>
        );
      }
      if (section.kind === 'month' && section.monthKey) {
        const mk = section.monthKey;
        const monthNum = parseInt(mk.slice(5, 7), 10);
        const yearNum = parseInt(mk.slice(0, 4), 10);
        const monthIx = monthNum >= 1 && monthNum <= 12 ? monthNum - 1 : 0;
        const a11yMonth = `${monthNameLongEn(monthIx)} ${yearNum}`;
        return (
          <View style={shellStyle}>
            <Touchable
              onPress={() => advanceByMonthHeaderTap(mk)}
              onLongPress={clearByMonthSolo}
              accessibilityRole="button"
              accessibilityLabel={a11yMonth}
              accessibilityHint="Tap to hide other months and show the next month. Long press to show all months."
            >
              <View>
                <Text style={styles.journalSectionCaptionBold} allowFontScaling maxFontSizeMultiplier={1.3}>
                  {section.title}
                </Text>
                <Text style={styles.journalSectionMeta} allowFontScaling maxFontSizeMultiplier={1.34}>
                  {section.subtitle}
                </Text>
              </View>
            </Touchable>
          </View>
        );
      }
      return (
        <View style={shellStyle}>
          <Text style={styles.journalSectionCaption} allowFontScaling maxFontSizeMultiplier={1.3}>
            {section.title}
          </Text>
          <Text style={styles.journalSectionMeta} allowFontScaling maxFontSizeMultiplier={1.34}>
            {section.subtitle}
          </Text>
        </View>
      );
    },
    [
      advanceByMoodHeaderTap,
      advanceByMonthHeaderTap,
      advanceByWeekdayHeaderTap,
      clearByDaySolo,
      clearByMonthSolo,
      clearByMoodSolo,
      moodSectionHeaderA11yHint,
      styles,
    ]
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

  const renderListEmpty = useCallback(() => {
    if (!journalLoadCompleted) {
      return (
        <View style={[styles.loadingEmpty, { minHeight: Math.round(Math.min(windowHeight * 0.35, 220)) }]}>
          <ActivityIndicator color={s.secondaryLabel} />
        </View>
      );
    }
    return renderEmptyState();
  }, [journalLoadCompleted, renderEmptyState, s.secondaryLabel, styles.loadingEmpty, windowHeight]);

  const listContentStyle = useMemo(
    () => [styles.listContent, { flexGrow: 1 }],
    [styles.listContent]
  );

  /** Fingerprint so FlashList/SectionList refresh cells when entry bodies change (not only length). */
  const journalEntriesStamp = useMemo(() => {
    const n = entriesDesc.length;
    if (n === 0) return 0;
    const first = entriesDesc[0]!;
    const last = entriesDesc[n - 1]!;
    return n ^ first.updatedAt ^ last.updatedAt ^ first.date.length ^ last.date.length;
  }, [entriesDesc]);

  const journalListExtraData = useMemo(
    () => ({
      moodGradeColorStyle,
      isDark,
      viewMode,
      sortMenuOpen,
      journalLoadCompleted,
      byMoodSoloGrade,
      byMonthSoloKey,
      byDaySoloWeekday,
      journalEntriesStamp,
      /** Reference bumps when row StyleSheet outputs change (theme / font scale). */
      journalRowStyles,
    }),
    [
      byDaySoloWeekday,
      byMonthSoloKey,
      byMoodSoloGrade,
      isDark,
      journalEntriesStamp,
      journalLoadCompleted,
      journalRowStyles,
      moodGradeColorStyle,
      sortMenuOpen,
      viewMode,
    ]
  );

  const scrollListProps = useMemo(
    () => ({
      onScrollBeginDrag,
      onScrollEndDrag,
      onMomentumScrollBegin,
      onMomentumScrollEnd,
      keyboardShouldPersistTaps: 'handled' as const,
    }),
    [onMomentumScrollBegin, onMomentumScrollEnd, onScrollBeginDrag, onScrollEndDrag]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Journal" contentPaddingHorizontal={screenHeaderPrimaryTabPaddingX} />

      <PerfProfiler id="list.journal">
        {isGroupedView ? (
          <SectionList<MoodEntry, JournalListSection>
            key={
              viewMode === 'byMood'
                ? `journal-mood-${byMoodSoloGrade ?? 'all'}`
                : viewMode === 'byDay'
                  ? `journal-weekday-${byDaySoloWeekday ?? 'all'}`
                  : viewMode === 'byMonth'
                    ? `journal-month-${byMonthSoloKey ?? 'all'}`
                    : `journal-${viewMode}`
            }
            sections={journalSectionsForList}
            keyExtractor={keyExtractor}
            renderItem={renderEntry}
            renderSectionHeader={renderJournalSectionHeader}
            ListHeaderComponent={renderSortHeader}
            ListEmptyComponent={renderListEmpty}
            style={listSurfaceStyle}
            contentContainerStyle={listContentStyle as any}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            {...scrollListProps}
            extraData={journalListExtraData}
          />
        ) : JOURNAL_LIST_IMPL === 'flashlist' ? (
          /**
           * PERF: FlashList improves virtualization + memory behavior for large lists.
           * This is a low-risk swap because it’s a FlatList-compatible surface for our usage.
           *
           * @shopify/flash-list note:
           * - `estimatedItemSize` is deprecated/removed, so we do NOT pass it.
           */
          <FlashList
            data={flatEntries}
            keyExtractor={keyExtractor}
            renderItem={renderEntry}
            ListHeaderComponent={renderSortHeader}
            ListEmptyComponent={renderListEmpty}
            style={listSurfaceStyle}
            contentContainerStyle={listContentStyle as any}
            drawDistance={500}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            {...scrollListProps}
            extraData={journalListExtraData}
          />
        ) : (
          <FlatList
            data={flatEntries}
            keyExtractor={keyExtractor}
            renderItem={renderEntry}
            ListHeaderComponent={renderSortHeader}
            ListEmptyComponent={renderListEmpty}
            style={listSurfaceStyle}
            contentContainerStyle={listContentStyle as any}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            initialNumToRender={12}
            windowSize={7}
            maxToRenderPerBatch={12}
            updateCellsBatchingPeriod={50}
            {...scrollListProps}
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
