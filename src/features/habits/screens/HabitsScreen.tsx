/**
 * @fileoverview Today’s habits — minimal card layout with checklist (catalog + per-day persistence).
 * @module features/habits/screens/HabitsScreen
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, InteractionManager, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ScreenHeader, HabitListRow, HabitListRowSeparator } from '@/components';
import { getToday, HABIT_CATALOG, HABIT_IDS } from '@/utils';
import type { HabitId } from '@/types';
import {
  getHabitSelectionsForDate,
  getHabitMarkedDayCounts,
  toggleHabitForDate,
  getTrackedHabitIds,
  setTrackedHabitIds,
} from '@/storage';
import { borderRadius, spacing, typography, useAppTheme } from '@/theme';
import { Touchable } from '@/ui/Touchable';
import { usePerfScreen } from '@/perf';
import { haptics } from '@/system/haptics';
import { logger } from '@/security';

const HERO_BLOOM_WELL = 28;
/** Matches `ScreenHeader` / primary tabs (Journal, Settings) horizontal inset. */
const HABITS_CONTENT_GUTTER = spacing[4];

export default function HabitsScreen() {
  usePerfScreen('Habits');
  const navigation = useNavigation();
  const { groupedCanvas, system: s, isDark } = useAppTheme();
  const day = getToday();

  const [selected, setSelected] = useState<ReadonlySet<HabitId>>(() => new Set());
  const [markedDayCounts, setMarkedDayCounts] = useState<ReadonlyMap<HabitId, number>>(() => new Map());
  const [tracked, setTracked] = useState<ReadonlySet<HabitId>>(() => new Set(HABIT_IDS));
  const selectedRef = useRef<ReadonlySet<HabitId>>(selected);
  const trackedRef = useRef(tracked);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const selectionsReqIdRef = useRef(0);
  const trackedReqIdRef = useRef(0);
  const writingRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    trackedRef.current = tracked;
  }, [tracked]);

  const reloadSelections = useCallback(async () => {
    const reqId = ++selectionsReqIdRef.current;
    try {
      const [ids, counts] = await Promise.all([getHabitSelectionsForDate(day), getHabitMarkedDayCounts()]);
      if (writingRef.current) return;
      if (!mountedRef.current || !focusedRef.current || reqId !== selectionsReqIdRef.current) return;
      const ns = new Set(ids);
      setSelected(ns);
      selectedRef.current = ns;
      const cm = new Map<HabitId, number>();
      for (const [hid, n] of Object.entries(counts)) {
        if (typeof n === 'number' && n > 0) cm.set(hid as HabitId, n);
      }
      setMarkedDayCounts(cm);
    } catch (e) {
      logger.warn('habits.screen.load.failed', { day, error: e });
    }
  }, [day]);

  const reloadTracked = useCallback(async () => {
    const reqId = ++trackedReqIdRef.current;
    try {
      const ids = await getTrackedHabitIds();
      if (!mountedRef.current || !focusedRef.current || reqId !== trackedReqIdRef.current) return;
      const ns = new Set(ids);
      setTracked(ns);
      trackedRef.current = ns;
    } catch (e) {
      logger.warn('habits.screen.tracked.load.failed', { error: e });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      const task = InteractionManager.runAfterInteractions(() => {
        void reloadSelections();
        void reloadTracked();
      });
      return () => {
        task.cancel();
        focusedRef.current = false;
        selectionsReqIdRef.current += 1;
        trackedReqIdRef.current += 1;
      };
    }, [reloadSelections, reloadTracked])
  );

  const onToggleHabit = useCallback(
    async (id: HabitId) => {
      if (writingRef.current) return;
      const previous = new Set(selectedRef.current);
      haptics.toggle();
      writingRef.current = true;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        selectedRef.current = next;
        return next;
      });
      try {
        const { habitIdsForDate, markedDayCounts } = await toggleHabitForDate(day, id);
        if (!mountedRef.current || !focusedRef.current) return;
        const next = new Set(habitIdsForDate);
        setSelected(next);
        selectedRef.current = next;
        const cm = new Map<HabitId, number>();
        for (const [hid, n] of Object.entries(markedDayCounts)) {
          if (typeof n === 'number' && n > 0) cm.set(hid as HabitId, n);
        }
        setMarkedDayCounts(cm);
      } catch (e) {
        if (!mountedRef.current || !focusedRef.current) return;
        logger.warn('habits.screen.toggle.failed', { id, error: e });
        setSelected(previous);
        selectedRef.current = previous;
        Alert.alert('Error', 'Could not update habit. Please try again.');
      } finally {
        writingRef.current = false;
      }
    },
    [day]
  );

  const onTrackedSwitch = useCallback(
    async (id: HabitId, on: boolean) => {
      const previous = new Set(trackedRef.current);
      const next = new Set(previous);
      if (on) next.add(id);
      else next.delete(id);
      haptics.toggle();
      setTracked(next);
      trackedRef.current = next;
      try {
        await setTrackedHabitIds(Array.from(next));
      } catch (e) {
        if (!mountedRef.current || !focusedRef.current) return;
        logger.warn('habits.screen.tracked.set.failed', { id, on, error: e });
        setTracked(previous);
        trackedRef.current = previous;
        Alert.alert('Error', 'Could not update Today habits.');
      }
    },
    []
  );

  const bloomWellBg = isDark ? 'rgba(191, 90, 242, 0.18)' : 'rgba(175, 82, 222, 0.1)';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: groupedCanvas },
        scroll: {
          flexGrow: 1,
          paddingTop: spacing[8],
          paddingBottom: 120,
          paddingHorizontal: HABITS_CONTENT_GUTTER,
        },
        heroCard: {
          backgroundColor: s.secondaryBackground,
          borderRadius: borderRadius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          padding: spacing[3],
          marginBottom: spacing[3],
        },
        heroTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing[2],
        },
        bloomWell: {
          width: HERO_BLOOM_WELL,
          height: HERO_BLOOM_WELL,
          borderRadius: HERO_BLOOM_WELL / 2,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing[2],
        },
        heroTitle: {
          ...typography.subhead,
          fontWeight: '600',
          color: s.label,
          flex: 1,
          letterSpacing: -0.2,
        },
        heroBody: {
          ...typography.caption1,
          color: s.secondaryLabel,
          lineHeight: 16,
        },
        listCard: {
          backgroundColor: s.secondaryBackground,
          borderRadius: borderRadius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          overflow: 'hidden',
        },
      }),
    [groupedCanvas, s]
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

  const addAffordance = (
    <Touchable
      onPress={() => {
        haptics.select();
        Alert.alert('Custom habits', 'Personal habit lists are coming in a future update.');
      }}
      accessibilityRole="button"
      accessibilityLabel="Add habit"
      accessibilityHint="Custom habits are coming in a future update"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, marginLeft: spacing[2] })}
    >
      <Ionicons name="add" size={26} color={s.blue} accessibilityElementsHidden importantForAccessibility="no" />
    </Touchable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title=""
        showSettings={false}
        leftAccessory={back}
        rightAccessory={addAffordance}
        contentPaddingHorizontal={HABITS_CONTENT_GUTTER}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: groupedCanvas }}
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTitleRow}>
            <View style={[styles.bloomWell, { backgroundColor: bloomWellBg }]}>
              <Ionicons
                name="flower-outline"
                size={15}
                color={s.purple}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
            <Text style={styles.heroTitle} maxFontSizeMultiplier={1.28} accessibilityRole="header">
              Build Better Habits
            </Text>
          </View>
          <Text style={styles.heroBody} maxFontSizeMultiplier={1.32}>
            Small actions, repeated daily, add up. Tap a habit to mark it done; use the switch so it appears on Today — same as logging from the Today screen.
          </Text>
        </View>

        <View style={styles.listCard}>
          {HABIT_CATALOG.map((habit, index) => (
            <View key={habit.id}>
              <HabitListRow
                habit={habit}
                completed={selected.has(habit.id)}
                toggleOnTotal={markedDayCounts.get(habit.id) ?? 0}
                onToggle={() => void onToggleHabit(habit.id)}
                showOnToday={{
                  value: tracked.has(habit.id),
                  onValueChange: (next) => void onTrackedSwitch(habit.id, next),
                }}
              />
              {index < HABIT_CATALOG.length - 1 ? <HabitListRowSeparator /> : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
