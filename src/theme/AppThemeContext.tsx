/**
 * @fileoverview Runtime app theme: color scheme, Dynamic Type scale, accessibility flags.
 * @module theme/AppThemeContext
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Appearance,
  ColorSchemeName,
  Platform,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { installAccessibilityObservers, getReduceMotionEnabled } from '../system/accessibility';
import { glassDark, glassLight, systemDark, systemLight, type SystemPalette } from './systemPalettes';
import { createSemantic, type SemanticPalette } from './createSemantic';
import type { AppearancePreference, MoodGradeColorStyle } from '../types';
import {
  getSettings,
  setAppearancePreference as persistAppearancePreference,
  setMoodGradeColorStyle as persistMoodGradeColorStyle,
} from '../data/storage/settingsStorage';

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

  useEffect(() => {
    let cancelled = false;
    void getSettings().then((st) => {
      if (cancelled) return;
      setAppearancePreferenceState(st.appearance);
      setMoodGradeColorStyleState(st.moodGradeColorStyle);
    });
    return () => {
      cancelled = true;
    };
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
    const [rm, rt, inv, darkSys, bold, htc] = await Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled() : Promise.resolve(false),
      Platform.OS === 'ios' ? AccessibilityInfo.isInvertColorsEnabled() : Promise.resolve(false),
      Platform.OS === 'ios' ? AccessibilityInfo.isDarkerSystemColorsEnabled() : Promise.resolve(false),
      Platform.OS === 'ios' ? AccessibilityInfo.isBoldTextEnabled() : Promise.resolve(false),
      Platform.OS === 'android' ? AccessibilityInfo.isHighTextContrastEnabled() : Promise.resolve(false),
    ]);

    setA11y((prev) =>
      patchA11y(prev, {
        reduceMotion: !!rm,
        reduceTransparency: !!rt,
        invertColors: !!inv,
        darkerSystemColors: !!darkSys,
        boldText: !!bold,
        preferStrongSeparators: !!htc,
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
    setAppearancePreferenceState(mode);
    try {
      await persistAppearancePreference(mode);
    } catch {
      const fresh = await getSettings().catch(() => null);
      if (fresh) setAppearancePreferenceState(fresh.appearance);
      throw new Error('Failed to save appearance preference');
    }
  }, []);

  const setMoodGradeColorStyle = useCallback(async (mode: MoodGradeColorStyle) => {
    setMoodGradeColorStyleState(mode);
    try {
      await persistMoodGradeColorStyle(mode);
    } catch {
      const fresh = await getSettings().catch(() => null);
      if (fresh) setMoodGradeColorStyleState(fresh.moodGradeColorStyle);
      throw new Error('Failed to save mood grade color style');
    }
  }, []);

  const value = useMemo<AppTheme>(() => {
    const baseSystem = isDark ? systemDark : systemLight;
    const system = enhanceSystemForA11y(baseSystem, isDark, a11y);
    const glass = isDark ? glassDark : glassLight;
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
    };
  }, [
    a11y,
    appearancePreference,
    colorScheme,
    fontScale,
    isDark,
    moodGradeColorStyle,
    setAppearancePreference,
    setMoodGradeColorStyle,
    windowHeight,
    windowWidth,
  ]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
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
    };
  }
  return fallbackTheme;
}

export function useAppTheme(): AppTheme {
  const v = useContext(ThemeCtx);
  return v ?? getFallbackTheme();
}
