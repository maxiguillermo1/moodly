/**
 * @fileoverview Goals — calm long-term progress hub.
 * @module features/goals/screens/GoalsScreen
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LiquidGlass, ScreenHeader, screenHeaderPrimaryTabPaddingX } from '@/components';
import type { RootStackParamList } from '@/navigation/types';
import type { Goal, GoalCategory, GoalType } from '@/types';
import { addGoalProgress, archiveGoal, deleteGoal, getGoals, upsertGoal } from '@/storage';
import {
  computeGoalProgress,
  formatDateForDisplay,
  getToday,
  goalLoggedDayCount,
  isValidLocalCalendarDayKey,
  sortGoalsForDisplay,
} from '@/utils';
import { borderRadius, spacing, typography, useAppTheme } from '@/theme';
import { Touchable } from '@/ui/Touchable';
import { perfProbe, usePerfScreen } from '@/perf';
import { haptics } from '@/system/haptics';
import { logger } from '@/security';

const CONTENT_GUTTER = screenHeaderPrimaryTabPaddingX;
const HERO_WELL = 28;
const GOAL_TYPES: readonly GoalType[] = ['habit', 'target', 'average', 'project'];
const CATEGORIES: readonly GoalCategory[] = ['health', 'fitness', 'learning', 'work', 'wellness', 'personal'];

function labelForType(type: GoalType): string {
  if (type === 'habit') return 'Habit';
  if (type === 'target') return 'Daily target';
  if (type === 'average') return 'Average';
  return 'Project';
}

function labelForCategory(category: GoalCategory): string {
  return category[0]!.toUpperCase() + category.slice(1);
}

function lengthLabel(goal: Goal): string | null {
  if (goal.durationDays === undefined) return null;
  const logged = goalLoggedDayCount(goal.history);
  if (goal.durationDays === null) return `${logged} ${logged === 1 ? 'day' : 'days'} logged · Never ending`;
  return `${logged} of ${goal.durationDays} days`;
}

export default function GoalsScreen(): React.ReactElement {
  usePerfScreen('Goals');
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Goals'>>();
  const { system: s, isDark } = useAppTheme();
  const routeDate = route.params?.date;
  const dateHint =
    typeof routeDate === 'string' && isValidLocalCalendarDayKey(routeDate)
      ? formatDateForDisplay(routeDate)
      : null;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<GoalType>('habit');
  const [draftCategory, setDraftCategory] = useState<GoalCategory>('personal');
  const [draftTarget, setDraftTarget] = useState('1');
  const [loggingGoal, setLoggingGoal] = useState<Goal | null>(null);
  const [logValue, setLogValue] = useState('1');
  const [logNote, setLogNote] = useState('');
  const [lengthGoal, setLengthGoal] = useState<Goal | null>(null);
  const [lengthDraft, setLengthDraft] = useState('');
  const didFlushPerfReportRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      setGoals(sortGoalsForDisplay(await getGoals()));
    } catch (error) {
      logger.warn('goals.screen.load.failed', { error });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (perfProbe.enabled) didFlushPerfReportRef.current = false;
      const task = InteractionManager.runAfterInteractions(() => {
        void reload();
      });
      return () => {
        task.cancel();
        if (perfProbe.enabled && !didFlushPerfReportRef.current) {
          didFlushPerfReportRef.current = true;
          perfProbe.flushReport('GoalsScreen.blur');
        }
      };
    }, [reload])
  );

  const active = useMemo(() => goals.filter((goal) => goal.status === 'active'), [goals]);
  const completed = useMemo(() => goals.filter((goal) => goal.status === 'completed'), [goals]);
  const archived = useMemo(() => goals.filter((goal) => goal.status === 'archived'), [goals]);
  const goalProgressById = useMemo(() => {
    const out = new Map<string, ReturnType<typeof computeGoalProgress>>();
    for (const goal of goals) out.set(goal.id, computeGoalProgress(goal));
    return out;
  }, [goals]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: s.background },
        scroll: {
          flexGrow: 1,
          paddingTop: spacing[6],
          paddingBottom: 120,
          paddingHorizontal: CONTENT_GUTTER,
        },
        heroCard: {
          backgroundColor: s.secondaryBackground,
          borderRadius: borderRadius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          padding: spacing[4],
          marginBottom: spacing[4],
        },
        heroTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing[2],
        },
        well: {
          width: HERO_WELL,
          height: HERO_WELL,
          borderRadius: HERO_WELL / 2,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing[2],
        },
        heroTitle: {
          ...typography.subhead,
          fontWeight: '600',
          color: s.label,
          flex: 1,
        },
        heroBody: {
          ...typography.callout,
          color: s.secondaryLabel,
          lineHeight: 20,
        },
        dateHint: {
          ...typography.footnote,
          color: s.tertiaryLabel,
          marginTop: spacing[2],
        },
        addButton: {
          marginTop: spacing[4],
          borderRadius: borderRadius.lg,
          paddingVertical: spacing[3],
          alignItems: 'center',
          backgroundColor: s.fill,
        },
        addText: {
          ...typography.subhead,
          color: s.blue,
          fontWeight: '600',
        },
        sectionTitle: {
          ...typography.caption1,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: s.secondaryLabel,
          fontWeight: '600',
          marginTop: spacing[5],
          marginBottom: spacing[2],
        },
        goalCard: {
          backgroundColor: s.secondaryBackground,
          borderRadius: borderRadius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          padding: spacing[4],
          marginBottom: spacing[2],
        },
        goalTop: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        goalText: {
          flex: 1,
          minWidth: 0,
        },
        goalTitle: {
          ...typography.headline,
          color: s.label,
          fontWeight: '600',
        },
        goalMeta: {
          ...typography.footnote,
          color: s.secondaryLabel,
          marginTop: 2,
        },
        progressTrack: {
          height: 5,
          borderRadius: 3,
          backgroundColor: s.fill,
          overflow: 'hidden',
          marginTop: spacing[3],
        },
        progressFill: {
          height: 5,
          borderRadius: 3,
        },
        insight: {
          ...typography.footnote,
          color: s.tertiaryLabel,
          marginTop: spacing[2],
          lineHeight: 17,
        },
        emptyCard: {
          backgroundColor: s.secondaryBackground,
          borderRadius: borderRadius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          paddingVertical: spacing[8],
          paddingHorizontal: spacing[4],
          alignItems: 'center',
        },
        emptyTitle: {
          ...typography.title3,
          color: s.label,
          fontWeight: '600',
          marginBottom: spacing[2],
          textAlign: 'center',
        },
        emptyBody: {
          ...typography.body,
          color: s.secondaryLabel,
          textAlign: 'center',
          lineHeight: 22,
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.25)',
          justifyContent: 'flex-end',
        },
        modalAvoider: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        sheetScroll: {
          maxHeight: '88%',
        },
        sheetScrollContent: {
          flexGrow: 1,
          justifyContent: 'flex-end',
        },
        sheet: {
          padding: spacing[4],
        },
        sheetGlass: {
          borderTopLeftRadius: borderRadius.xl,
          borderTopRightRadius: borderRadius.xl,
        },
        input: {
          ...typography.body,
          color: s.label,
          minHeight: 48,
          borderRadius: borderRadius.lg,
          backgroundColor: s.tertiaryFill,
          paddingHorizontal: spacing[4],
          marginTop: spacing[3],
        },
        inputDisabled: {
          color: s.secondaryLabel,
          opacity: 0.82,
        },
        textArea: {
          minHeight: 92,
          paddingTop: spacing[3],
          paddingBottom: spacing[3],
          textAlignVertical: 'top',
        },
        sheetCaption: {
          ...typography.callout,
          color: s.secondaryLabel,
          lineHeight: 20,
          marginTop: spacing[2],
        },
        fieldLabel: {
          ...typography.caption1,
          textTransform: 'uppercase',
          letterSpacing: 0.45,
          fontWeight: '600',
          color: s.secondaryLabel,
          marginTop: spacing[4],
        },
        pillRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing[2],
          marginTop: spacing[3],
        },
        pill: {
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          borderRadius: 999,
          backgroundColor: s.fill,
        },
        pillSelected: {
          backgroundColor: isDark ? 'rgba(255, 149, 0, 0.24)' : 'rgba(255, 149, 0, 0.16)',
        },
        pillText: {
          ...typography.footnote,
          color: s.secondaryLabel,
          fontWeight: '600',
        },
        saveRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: spacing[5],
        },
        sheetButton: {
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
        },
        sheetButtonText: {
          ...typography.body,
          color: s.blue,
          fontWeight: '600',
        },
      }),
    [isDark, s]
  );

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    setDraftTitle('');
    setDraftType('habit');
    setDraftCategory('personal');
    setDraftTarget('1');
  }, []);

  const closeLogger = useCallback(() => {
    setLoggingGoal(null);
    setLogValue('1');
    setLogNote('');
  }, []);

  const closeLengthEditor = useCallback(() => {
    setLengthGoal(null);
    setLengthDraft('');
  }, []);

  const saveGoal = useCallback(async () => {
    const title = draftTitle.trim();
    if (!title) return;
    const target = Math.max(1, Number(draftTarget) || 1);
    try {
      await upsertGoal({
        title,
        type: draftType,
        category: draftCategory,
        accentColor: '#FF9500',
        progress: {
          currentValue: 0,
          targetValue: target,
          unit: draftType === 'target' ? 'per day' : draftType === 'habit' ? 'times' : '',
          frequency: draftType === 'habit' || draftType === 'target' ? 'daily' : 'none',
        },
      });
      haptics.success();
      closeComposer();
      await reload();
    } catch {
      haptics.error();
      Alert.alert('Error', 'Could not save this goal. Please try again.');
    }
  }, [closeComposer, draftCategory, draftTarget, draftTitle, draftType, reload]);

  const openGoalLogger = useCallback((goal: Goal) => {
    haptics.select();
    const date = routeDate && isValidLocalCalendarDayKey(routeDate) ? routeDate : getToday();
    const existing = goal.history.find((item) => item.date === date) ?? null;
    setLoggingGoal(goal);
    setLogValue(existing ? String(existing.value) : goal.type === 'target' || goal.type === 'average' ? '' : '1');
    setLogNote(existing?.note ?? '');
  }, [routeDate]);

  const saveGoalLog = useCallback(async () => {
    if (!loggingGoal) return;
    const date = routeDate && isValidLocalCalendarDayKey(routeDate) ? routeDate : getToday();
    const existing = loggingGoal.history.find((item) => item.date === date) ?? null;
    const value = loggingGoal.type === 'habit' ? 1 : Math.max(0, Number(logValue) || 0);
    if (!existing && value <= 0) {
      Alert.alert('Add an amount', 'Enter what you completed for this day.');
      return;
    }
    try {
      await addGoalProgress(loggingGoal.id, date, value, logNote);
      haptics.success();
      closeLogger();
      await reload();
    } catch {
      haptics.error();
      Alert.alert('Error', 'Could not log this goal. Please try again.');
    }
  }, [closeLogger, logNote, logValue, loggingGoal, reload, routeDate]);

  const updateGoalDuration = useCallback(
    async (goal: Goal, durationDays: number | null) => {
      try {
        await upsertGoal({
          id: goal.id,
          title: goal.title,
          type: goal.type,
          status: durationDays === null && goal.status === 'completed' ? 'active' : goal.status,
          category: goal.category,
          customCategory: goal.customCategory,
          accentColor: goal.accentColor,
          progress: goal.progress,
          reminder: goal.reminder,
          milestones: goal.milestones,
          history: goal.history,
          notes: goal.notes,
          durationDays,
          completedAt: durationDays === null ? null : goal.completedAt,
          archivedAt: goal.archivedAt,
        });
        haptics.success();
        await reload();
      } catch {
        haptics.error();
        Alert.alert('Error', 'Could not update this goal length. Please try again.');
      }
    },
    [reload]
  );

  const saveLength = useCallback(async () => {
    if (!lengthGoal) return;
    const days = Math.floor(Number(lengthDraft));
    if (!Number.isFinite(days) || days <= 0) {
      Alert.alert('Goal length', 'Enter a positive number of days, or choose Never ending.');
      return;
    }
    await updateGoalDuration(lengthGoal, days);
    closeLengthEditor();
  }, [closeLengthEditor, lengthDraft, lengthGoal, updateGoalDuration]);

  const openLengthEditor = useCallback((goal: Goal) => {
    setLengthGoal(goal);
    setLengthDraft(typeof goal.durationDays === 'number' ? String(goal.durationDays) : '');
  }, []);

  const onArchive = useCallback(
    async (goal: Goal) => {
      await archiveGoal(goal.id);
      haptics.select();
      await reload();
    },
    [reload]
  );

  const onResume = useCallback(
    async (goal: Goal) => {
      try {
        await upsertGoal({
          id: goal.id,
          title: goal.title,
          type: goal.type,
          status: 'active',
          category: goal.category,
          customCategory: goal.customCategory,
          accentColor: goal.accentColor,
          progress: goal.progress,
          reminder: goal.reminder,
          milestones: goal.milestones,
          history: goal.history,
          notes: goal.notes,
          durationDays: goal.durationDays,
          completedAt: null,
          archivedAt: null,
        });
        haptics.success();
        await reload();
      } catch {
        haptics.error();
        Alert.alert('Error', 'Could not resume this goal. Please try again.');
      }
    },
    [reload]
  );

  const onDelete = useCallback(
    (goal: Goal) => {
      Alert.alert('Delete goal', `Delete “${goal.title}”? This removes its logs and can’t be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteGoal(goal.id)
              .then(async () => {
                haptics.success();
                await reload();
              })
              .catch(() => {
                haptics.error();
                Alert.alert('Error', 'Could not delete this goal. Please try again.');
              });
          },
        },
      ]);
    },
    [reload]
  );

  const openGoalOptions = useCallback(
    (goal: Goal) => {
      haptics.select();
      const options =
        goal.status === 'archived'
          ? [
              { text: 'Resume', onPress: () => void onResume(goal) },
              { text: 'Change length', onPress: () => openLengthEditor(goal) },
              { text: 'Never ending', onPress: () => void updateGoalDuration(goal, null) },
              { text: 'Delete', style: 'destructive' as const, onPress: () => onDelete(goal) },
              { text: 'Cancel', style: 'cancel' as const },
            ]
          : [
              { text: 'Change length', onPress: () => openLengthEditor(goal) },
              { text: 'Never ending', onPress: () => void updateGoalDuration(goal, null) },
              { text: 'Archive / pause', onPress: () => void onArchive(goal) },
              { text: 'Delete', style: 'destructive' as const, onPress: () => onDelete(goal) },
              { text: 'Cancel', style: 'cancel' as const },
            ];
      Alert.alert('Goal options', goal.status === 'archived' ? `${goal.title} is paused.` : goal.title, options);
    },
    [onArchive, onDelete, onResume, openLengthEditor, updateGoalDuration]
  );

  const back = (
    <Touchable
      onPress={() => {
        haptics.select();
        navigation.goBack();
      }}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={{ top: 12, bottom: 12, right: 12, left: 12 }}
      style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
    >
      <Ionicons name="chevron-back" size={24} color={s.blue} accessibilityElementsHidden importantForAccessibility="no" />
    </Touchable>
  );

  const wellBg = isDark ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255, 149, 0, 0.15)';
  const loggingDate = routeDate && isValidLocalCalendarDayKey(routeDate) ? routeDate : getToday();
  const existingLog = loggingGoal?.history.find((item) => item.date === loggingDate) ?? null;

  const renderGoal = (goal: Goal) => {
    const computed = goalProgressById.get(goal.id)!;
    const pct = Math.round(computed.percent);
    const durationLabel = lengthLabel(goal);
    return (
      <Touchable
        key={goal.id}
        onPress={() => (goal.status === 'archived' ? openGoalOptions(goal) : openGoalLogger(goal))}
        onLongPress={() => openGoalOptions(goal)}
        accessibilityRole="button"
        accessibilityLabel={`${goal.title}, ${pct}% complete`}
        accessibilityHint={goal.status === 'archived' ? 'Opens paused goal options.' : 'Opens a daily goal log. Long press for length, pause, and delete options.'}
      >
        <View style={styles.goalCard}>
          <View style={styles.goalTop}>
            <View style={styles.goalText}>
              <Text style={styles.goalTitle} maxFontSizeMultiplier={1.28}>{goal.title}</Text>
              <Text style={styles.goalMeta} maxFontSizeMultiplier={1.3}>
                {labelForType(goal.type)} · {labelForCategory(goal.category)} · {pct}%
                {durationLabel ? ` · ${durationLabel}` : ''}
                {goal.status === 'archived' ? ' · Paused' : ''}
              </Text>
            </View>
            <Text style={styles.goalMeta} maxFontSizeMultiplier={1.2}>
              {computed.streak > 0 ? `${computed.streak}d` : ''}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: goal.accentColor }]} />
          </View>
          <Text style={styles.insight} maxFontSizeMultiplier={1.3}>{computed.insight.message}</Text>
        </View>
      </Touchable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Goals"
        showSettings={false}
        leftAccessory={back}
        titleVisualSize="compact"
        contentPaddingHorizontal={CONTENT_GUTTER}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: s.background }}
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTitleRow}>
            <View style={[styles.well, { backgroundColor: wellBg }]}>
              <Ionicons name="flag-outline" size={16} color={s.orange} accessibilityElementsHidden importantForAccessibility="no" />
            </View>
            <Text style={styles.heroTitle} maxFontSizeMultiplier={1.28} accessibilityRole="header">Goals</Text>
          </View>
          <Text style={styles.heroBody} maxFontSizeMultiplier={1.32}>
            Gentle long-term progress, kept lightweight. Tap a goal to log what happened for the day.
          </Text>
          {dateHint ? <Text style={styles.dateHint} maxFontSizeMultiplier={1.3}>Opened for {dateHint}</Text> : null}
          <Touchable style={styles.addButton} onPress={() => setComposerOpen(true)} accessibilityRole="button" accessibilityLabel="Add goal">
            <Text style={styles.addText} maxFontSizeMultiplier={1.25}>Add a small goal</Text>
          </Touchable>
        </View>

        {active.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.3}>Start with one small goal.</Text>
            <Text style={styles.emptyBody} maxFontSizeMultiplier={1.32}>Progress grows gently over time.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Active</Text>
            {active.map(renderGoal)}
          </>
        )}
        {completed.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completed.map(renderGoal)}
          </>
        ) : null}
        {archived.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Paused</Text>
            {archived.map(renderGoal)}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={isComposerOpen} transparent animationType="slide" onRequestClose={closeComposer}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalAvoider}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              <LiquidGlass style={styles.sheetGlass} radius={borderRadius.xl} intensity={72} prominent>
                <View style={styles.sheet} accessibilityViewIsModal>
                  <Text style={styles.goalTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>New goal</Text>
                <TextInput
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  placeholder="What feels worth nurturing?"
                  placeholderTextColor={s.tertiaryLabel}
                  style={styles.input}
                  maxFontSizeMultiplier={1.3}
                  returnKeyType="next"
                  accessibilityLabel="Goal title"
                />
                <View style={styles.pillRow}>
                  {GOAL_TYPES.map((type) => (
                    <Touchable
                      key={type}
                      style={[styles.pill, draftType === type ? styles.pillSelected : null]}
                      onPress={() => setDraftType(type)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: draftType === type }}
                      accessibilityLabel={`Goal type ${labelForType(type)}`}
                    >
                      <Text style={styles.pillText}>{labelForType(type)}</Text>
                    </Touchable>
                  ))}
                </View>
                <View style={styles.pillRow}>
                  {CATEGORIES.map((category) => (
                    <Touchable
                      key={category}
                      style={[styles.pill, draftCategory === category ? styles.pillSelected : null]}
                      onPress={() => setDraftCategory(category)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: draftCategory === category }}
                      accessibilityLabel={`Goal category ${labelForCategory(category)}`}
                    >
                      <Text style={styles.pillText}>{labelForCategory(category)}</Text>
                    </Touchable>
                  ))}
                </View>
                <TextInput
                  value={draftTarget}
                  onChangeText={setDraftTarget}
                  placeholder={draftType === 'target' ? 'Daily target' : 'Target'}
                  placeholderTextColor={s.tertiaryLabel}
                  keyboardType="number-pad"
                  style={styles.input}
                  maxFontSizeMultiplier={1.3}
                  returnKeyType="done"
                  onSubmitEditing={() => void saveGoal()}
                  accessibilityLabel="Daily target"
                />
                <View style={styles.saveRow}>
                  <Touchable style={styles.sheetButton} onPress={closeComposer} accessibilityRole="button" accessibilityLabel="Cancel new goal">
                    <Text style={styles.sheetButtonText}>Cancel</Text>
                  </Touchable>
                  <Touchable style={styles.sheetButton} onPress={() => void saveGoal()} accessibilityRole="button" accessibilityLabel="Save new goal">
                    <Text style={styles.sheetButtonText}>Save</Text>
                  </Touchable>
                  </View>
                </View>
              </LiquidGlass>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={loggingGoal != null} transparent animationType="slide" onRequestClose={closeLogger}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalAvoider}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              <LiquidGlass style={styles.sheetGlass} radius={borderRadius.xl} intensity={72} prominent>
                <View style={styles.sheet} accessibilityViewIsModal>
                  <Text style={styles.goalTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
                  Log for {formatDateForDisplay(loggingDate)}
                </Text>
                <Text style={styles.sheetCaption} maxFontSizeMultiplier={1.3}>
                  {existingLog
                    ? 'This day is already logged. You can edit the note without changing progress.'
                    : loggingGoal?.type === 'target' || loggingGoal?.type === 'average'
                    ? `Enter the amount for ${loggingGoal.title} on this day.`
                    : `Mark ${loggingGoal?.title ?? 'this goal'} complete for this day.`}
                </Text>

                {loggingGoal?.type === 'target' || loggingGoal?.type === 'average' ? (
                  <>
                    <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.2}>Amount for this day</Text>
                    <TextInput
                      value={logValue}
                      onChangeText={setLogValue}
                      placeholder="0"
                      placeholderTextColor={s.tertiaryLabel}
                      keyboardType="decimal-pad"
                      style={[styles.input, existingLog ? styles.inputDisabled : null]}
                      editable={!existingLog}
                      maxFontSizeMultiplier={1.3}
                      accessibilityLabel="Goal amount for this day"
                    />
                  </>
                ) : null}

                <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.2}>Note</Text>
                <TextInput
                  value={logNote}
                  onChangeText={setLogNote}
                  placeholder="Add a short note…"
                  placeholderTextColor={s.tertiaryLabel}
                  style={[styles.input, styles.textArea]}
                  maxFontSizeMultiplier={1.3}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Goal log note"
                />

                <View style={styles.saveRow}>
                  <Touchable style={styles.sheetButton} onPress={closeLogger} accessibilityRole="button" accessibilityLabel="Cancel goal log">
                    <Text style={styles.sheetButtonText}>Cancel</Text>
                  </Touchable>
                  <Touchable style={styles.sheetButton} onPress={() => void saveGoalLog()} accessibilityRole="button" accessibilityLabel="Save goal log">
                    <Text style={styles.sheetButtonText}>Log</Text>
                  </Touchable>
                  </View>
                </View>
              </LiquidGlass>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={lengthGoal != null} transparent animationType="slide" onRequestClose={closeLengthEditor}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalAvoider}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              <LiquidGlass style={styles.sheetGlass} radius={borderRadius.xl} intensity={72} prominent>
                <View style={styles.sheet} accessibilityViewIsModal>
                  <Text style={styles.goalTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
                    Goal length
                  </Text>
                  <Text style={styles.sheetCaption} maxFontSizeMultiplier={1.3}>
                    Set how many logged days complete this goal, or choose never ending to use it as a day counter.
                  </Text>
                  <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.2}>Days</Text>
                  <TextInput
                    value={lengthDraft}
                    onChangeText={setLengthDraft}
                    placeholder="30"
                    placeholderTextColor={s.tertiaryLabel}
                    keyboardType="number-pad"
                    style={styles.input}
                    maxFontSizeMultiplier={1.3}
                    accessibilityLabel="Goal length in days"
                  />
                  <Touchable
                    style={styles.addButton}
                    onPress={() => {
                      if (lengthGoal) void updateGoalDuration(lengthGoal, null).then(closeLengthEditor);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Make goal never ending"
                  >
                    <Text style={styles.addText} maxFontSizeMultiplier={1.25}>Never ending</Text>
                  </Touchable>
                  <View style={styles.saveRow}>
                    <Touchable style={styles.sheetButton} onPress={closeLengthEditor} accessibilityRole="button" accessibilityLabel="Cancel goal length">
                      <Text style={styles.sheetButtonText}>Cancel</Text>
                    </Touchable>
                    <Touchable style={styles.sheetButton} onPress={() => void saveLength()} accessibilityRole="button" accessibilityLabel="Save goal length">
                      <Text style={styles.sheetButtonText}>Save</Text>
                    </Touchable>
                  </View>
                </View>
              </LiquidGlass>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
