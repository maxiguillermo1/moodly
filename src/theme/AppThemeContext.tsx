/**
 * @fileoverview Runtime app theme: color scheme, Dynamic Type scale, accessibility flags.
 * @module theme/AppThemeContext
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Appearance,
  ColorSchemeName,
  Platform,
  useColorScheme,
  useWindowDimensions,
  type ColorValue,
} from 'react-native';
import { installAccessibilityObservers, getReduceMotionEnabled } from '../system/accessibility';
import { glassDark, glassLight, systemDark, systemLight, type SystemPalette } from './systemPalettes';
import { createSemantic, type SemanticPalette } from './createSemantic';
import type { AppearancePreference, MoodGradeColorStyle, TodayExtensionStackId } from '../types';
import {
  getSettings,
  setAppearancePreference as persistAppearancePreference,
  setMoodGradeColorStyle as persistMoodGradeColorStyle,
  setHabitsEnabled as persistHabitsEnabled,
  setTodayGoalsEnabled as persistTodayGoalsEnabled,
  setTodayTodoEnabled as persistTodayTodoEnabled,
  bumpTodayExtensionStackOrder as persistBumpTodayExtensionStackOrder,
} from '../storage';
import { ExtensionsPolicyProvider, type ExtensionsPolicy } from './ExtensionsPolicyContext';

export type AppA11y = {
  reduceMotion: boolean;
  reduceTransparency: boolean;
  invertColors: boolean;
  darkerSystemColors: boolean;
  boldText: boolean;
  /** Android high-text-contrast (iOS uses darkerSystemColors + separator boost). */
  preferStrongSeparators: boolean;
};

export type AppTheme = {
  colorScheme: ColorSchemeName;
  isDark: boolean;
  fontScale: number;
  windowWidth: number;
  windowHeight: number;
  system: SystemPalette;
  glass: typeof glassLight;
  semantic: SemanticPalette;
  a11y: AppA11y;
  /** User-chosen light/dark, or follow system */
  appearancePreference: AppearancePreference;
  setAppearancePreference: (mode: AppearancePreference) => Promise<void>;
  /** Solid fills vs bloom gradients for mood hue surfaces */
  moodGradeColorStyle: MoodGradeColorStyle;
  setMoodGradeColorStyle: (mode: MoodGradeColorStyle) => Promise<void>;
  /** Show habit chips on Today when enabled */
  habitsEnabled: boolean;
  setHabitsEnabled: (enabled: boolean) => Promise<void>;
  /** Show Goals starter on Today */
  todayGoalsEnabled: boolean;
  setTodayGoalsEnabled: (enabled: boolean) => Promise<void>;
  /** Show To-do starter on Today */
  todayTodoEnabled: boolean;
  setTodayTodoEnabled: (enabled: boolean) => Promise<void>;
  /** Top-to-bottom slots on Today; turning a toggle on moves that slot to the bottom of the stack. */
  todayExtensionsOrder: TodayExtensionStackId[];
  bumpTodayExtensionStackOrder: (id: TodayExtensionStackId) => Promise<void>;
  /**
   * Canvas behind grouped lists + stack modals — same as {@link SystemPalette.background} for
   * the **app-resolved** light/dark (Auto / Light / Dark). Avoids `PlatformColor(systemGroupedBackground)`,
   * which tracks the **device** trait and can look black when the user forces Light while the OS is Dark.
   */
  groupedCanvas: ColorValue;
};

const defaultA11y: AppA11y = {
  reduceMotion: false,
  reduceTransparency: false,
  invertColors: false,
  darkerSystemColors: false,
  boldText: false,
  preferStrongSeparators: false,
};

function enhanceSystemForA11y(base: SystemPalette, isDark: boolean, a11y: AppA11y): SystemPalette {
  if (!a11y.preferStrongSeparators && !a11y.darkerSystemColors) return base;
  return {
    ...base,
    separator: isDark ? 'rgba(99, 99, 102, 0.92)' : 'rgba(60, 60, 67, 0.45)',
    opaqueSeparator: isDark ? '#545456' : '#AEAEB2',
  };
}

function patchA11y(prev: AppA11y, next: Partial<AppA11y>): AppA11y {
  return { ...prev, ...next };
}

const ThemeCtx = createContext<AppTheme | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const systemColorScheme = useColorScheme();
  const { width: windowWidth, height: windowHeight, fontScale } = useWindowDimensions();

  const [appearancePreference, setAppearancePreferenceState] = useState<AppearancePreference>('system');
  const [moodGradeColorStyle, setMoodGradeColorStyleState] = useState<MoodGradeColorStyle>('solid');
  const [habitsEnabled, setHabitsEnabledState] = useState(false);
  const [todayGoalsEnabled, setTodayGoalsEnabledState] = useState(false);
  const [todayTodoEnabled, setTodayTodoEnabledState] = useState(false);
  const [todayExtensionsOrder, setTodayExtensionsOrderState] = useState<TodayExtensionStackId[]>([
    'habits',
    'goals',
    'todo',
  ]);
  const settingsMutationEpochRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const epochAtStart = settingsMutationEpochRef.current;
    void getSettings().then((st) => {
      if (cancelled || settingsMutationEpochRef.current !== epochAtStart) return;
      setAppearancePreferenceState(st.appearance);
      setMoodGradeColorStyleState(st.moodGradeColorStyle);
      setHabitsEnabledState(st.habitsEnabled);
      setTodayGoalsEnabledState(st.todayGoalsEnabled);
      setTodayTodoEnabledState(st.todayTodoEnabled);
      setTodayExtensionsOrderState(st.todayExtensionsOrder);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bumpSettingsMutationEpoch = useCallback(() => {
    settingsMutationEpochRef.current += 1;
    return settingsMutationEpochRef.current;
  }, []);

  const colorScheme = useMemo<ColorSchemeName>(() => {
    if (appearancePreference === 'light') return 'light';
    if (appearancePreference === 'dark') return 'dark';
    return systemColorScheme ?? 'light';
  }, [appearancePreference, systemColorScheme]);

  const isDark = colorScheme === 'dark';

  const [a11y, setA11y] = useState<AppA11y>(() => ({
    ...defaultA11y,
    reduceMotion: getReduceMotionEnabled(),
  }));

  useEffect(() => {
    installAccessibilityObservers();
  }, []);

  const refreshA11y = useCallback(async () => {
    const results = await Promise.allSettled([
      AccessibilityInfo.isReduceMotionEnabled(),
      Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled() : Promise.resolve(false),
      Platform.OS === 'ios' ? AccessibilityInfo.isInvertColorsEnabled() : Promise.resolve(false),
      Platform.OS === 'ios' ? AccessibilityInfo.isDarkerSystemColorsEnabled() : Promise.resolve(false),
      Platform.OS === 'ios' ? AccessibilityInfo.isBoldTextEnabled() : Promise.resolve(false),
      Platform.OS === 'android' ? AccessibilityInfo.isHighTextContrastEnabled() : Promise.resolve(false),
    ]);
    const valueAt = (idx: number) => (results[idx]?.status === 'fulfilled' ? !!results[idx].value : false);

    setA11y((prev) =>
      patchA11y(prev, {
        reduceMotion: valueAt(0),
        reduceTransparency: valueAt(1),
        invertColors: valueAt(2),
        darkerSystemColors: valueAt(3),
        boldText: valueAt(4),
        preferStrongSeparators: valueAt(5),
      })
    );
  }, []);

  useEffect(() => {
    void refreshA11y();
    const subs: { remove: () => void }[] = [];
    const listen = (event: string, fn: () => void) => {
      try {
        const sub = AccessibilityInfo.addEventListener(event as any, fn);
        subs.push(sub);
      } catch {
        /* older RN */
      }
    };

    listen('reduceMotionChanged', refreshA11y);
    if (Platform.OS === 'ios') {
      listen('reduceTransparencyChanged', refreshA11y);
      listen('invertColorsChanged', refreshA11y);
      listen('darkerSystemColorsChanged', refreshA11y);
      listen('boldTextChanged', refreshA11y);
    }
    if (Platform.OS === 'android') {
      listen('highTextContrastChanged', refreshA11y);
    }

    const appearanceSub = Appearance.addChangeListener?.(() => {
      void refreshA11y();
    });
    return () => {
      subs.forEach((s) => s.remove());
      appearanceSub?.remove?.();
    };
  }, [refreshA11y]);

  const setAppearancePreference = useCallback(async (mode: AppearancePreference) => {
    const epoch = bumpSettingsMutationEpoch();
    setAppearancePreferenceState(mode);
    try {
      await persistAppearancePreference(mode);
    } catch {
      const fresh = await getSettings().catch(() => null);
      if (fresh && settingsMutationEpochRef.current === epoch) setAppearancePreferenceState(fresh.appearance);
      throw new Error('Failed to save appearance preference');
    }
  }, [bumpSettingsMutationEpoch]);

  const setMoodGradeColorStyle = useCallback(async (mode: MoodGradeColorStyle) => {
    const epoch = bumpSettingsMutationEpoch();
    setMoodGradeColorStyleState(mode);
    try {
      await persistMoodGradeColorStyle(mode);
    } catch {
      const fresh = await getSettings().catch(() => null);
      if (fresh && settingsMutationEpochRef.current === epoch) setMoodGradeColorStyleState(fresh.moodGradeColorStyle);
      throw new Error('Failed to save mood grade color style');
    }
  }, [bumpSettingsMutationEpoch]);

  const setHabitsEnabled = useCallback(async (enabled: boolean) => {
    const epoch = bumpSettingsMutationEpoch();
    setHabitsEnabledState(enabled);
    try {
      await persistHabitsEnabled(enabled);
      const fresh = await getSettings();
      if (settingsMutationEpochRef.current === epoch) setTodayExtensionsOrderState(fresh.todayExtensionsOrder);
    } catch {
      const fresh = await getSettings().catch(() => null);
      if (fresh && settingsMutationEpochRef.current === epoch) {
        setHabitsEnabledState(fresh.habitsEnabled);
        setTodayExtensionsOrderState(fresh.todayExtensionsOrder);
      }
      throw new Error('Failed to save habits preference');
    }
  }, [bumpSettingsMutationEpoch]);

  const setTodayGoalsEnabled = useCallback(async (enabled: boolean) => {
    const epoch = bumpSettingsMutationEpoch();
    setTodayGoalsEnabledState(enabled);
    try {
      await persistTodayGoalsEnabled(enabled);
      const fresh = await getSettings();
      if (settingsMutationEpochRef.current === epoch) setTodayExtensionsOrderState(fresh.todayExtensionsOrder);
    } catch {
      const fresh = await getSettings().catch(() => null);
      if (fresh && settingsMutationEpochRef.current === epoch) {
        setTodayGoalsEnabledState(fresh.todayGoalsEnabled);
        setTodayExtensionsOrderState(fresh.todayExtensionsOrder);
      }
      throw new Error('Failed to save Goals on Today preference');
    }
  }, [bumpSettingsMutationEpoch]);

  const setTodayTodoEnabled = useCallback(async (enabled: boolean) => {
    const epoch = bumpSettingsMutationEpoch();
    setTodayTodoEnabledState(enabled);
    try {
      await persistTodayTodoEnabled(enabled);
      const fresh = await getSettings();
      if (settingsMutationEpochRef.current === epoch) setTodayExtensionsOrderState(fresh.todayExtensionsOrder);
    } catch {
      const fresh = await getSettings().catch(() => null);
      if (fresh && settingsMutationEpochRef.current === epoch) {
        setTodayTodoEnabledState(fresh.todayTodoEnabled);
        setTodayExtensionsOrderState(fresh.todayExtensionsOrder);
      }
      throw new Error('Failed to save To-do on Today preference');
    }
  }, [bumpSettingsMutationEpoch]);

  const bumpTodayExtensionStackOrder = useCallback(async (id: TodayExtensionStackId) => {
    const epoch = bumpSettingsMutationEpoch();
    try {
      await persistBumpTodayExtensionStackOrder(id);
      const fresh = await getSettings();
      if (settingsMutationEpochRef.current === epoch) setTodayExtensionsOrderState(fresh.todayExtensionsOrder);
    } catch {
      const fresh = await getSettings().catch(() => null);
      if (fresh && settingsMutationEpochRef.current === epoch) setTodayExtensionsOrderState(fresh.todayExtensionsOrder);
    }
  }, [bumpSettingsMutationEpoch]);

  const value = useMemo<AppTheme>(() => {
    const baseSystem = isDark ? systemDark : systemLight;
    const system = enhanceSystemForA11y(baseSystem, isDark, a11y);
    const glass = isDark ? glassDark : glassLight;
    const groupedCanvas: ColorValue = system.background;
    return {
      colorScheme,
      isDark,
      fontScale,
      windowWidth,
      windowHeight,
      system,
      glass,
      semantic: createSemantic(system),
      a11y,
      appearancePreference,
      setAppearancePreference,
      moodGradeColorStyle,
      setMoodGradeColorStyle,
      habitsEnabled,
      setHabitsEnabled,
      todayGoalsEnabled,
      setTodayGoalsEnabled,
      todayTodoEnabled,
      setTodayTodoEnabled,
      todayExtensionsOrder,
      bumpTodayExtensionStackOrder,
      groupedCanvas,
    };
  }, [
    a11y,
    appearancePreference,
    colorScheme,
    fontScale,
    bumpTodayExtensionStackOrder,
    habitsEnabled,
    isDark,
    moodGradeColorStyle,
    setAppearancePreference,
    setHabitsEnabled,
    setMoodGradeColorStyle,
    setTodayGoalsEnabled,
    setTodayTodoEnabled,
    todayExtensionsOrder,
    todayGoalsEnabled,
    todayTodoEnabled,
    windowHeight,
    windowWidth,
  ]);

  const extensionsPolicy = useMemo<ExtensionsPolicy>(
    () => ({
      habitsEnabled,
      todayGoalsEnabled,
      todayTodoEnabled,
      todayExtensionsOrder,
      bumpTodayExtensionStackOrder,
    }),
    [
      habitsEnabled,
      todayGoalsEnabled,
      todayTodoEnabled,
      todayExtensionsOrder,
      bumpTodayExtensionStackOrder,
    ]
  );

  return (
    <ThemeCtx.Provider value={value}>
      <ExtensionsPolicyProvider policy={extensionsPolicy}>{children}</ExtensionsPolicyProvider>
    </ThemeCtx.Provider>
  );
}

let fallbackTheme: AppTheme | null = null;

function getFallbackTheme(): AppTheme {
  if (!fallbackTheme) {
    fallbackTheme = {
      colorScheme: 'light',
      isDark: false,
      fontScale: 1,
      windowWidth: 390,
      windowHeight: 844,
      system: systemLight,
      glass: glassLight,
      semantic: createSemantic(systemLight),
      a11y: defaultA11y,
      appearancePreference: 'system',
      setAppearancePreference: async () => {},
      moodGradeColorStyle: 'solid',
      setMoodGradeColorStyle: async () => {},
      habitsEnabled: false,
      setHabitsEnabled: async () => {},
      todayGoalsEnabled: false,
      setTodayGoalsEnabled: async () => {},
      todayTodoEnabled: false,
      setTodayTodoEnabled: async () => {},
      todayExtensionsOrder: ['habits', 'goals', 'todo'],
      bumpTodayExtensionStackOrder: async () => {},
      groupedCanvas: systemLight.background,
    };
  }
  return fallbackTheme;
}

export function useAppTheme(): AppTheme {
  const v = useContext(ThemeCtx);
  return v ?? getFallbackTheme();
}
