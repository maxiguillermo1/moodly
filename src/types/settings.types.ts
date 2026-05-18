/**
 * @fileoverview App settings types
 * @module types/settings
 */

export type CalendarMoodStyle = 'dot' | 'fill';

export type AppearancePreference = 'system' | 'light' | 'dark';

/** Mood visuals: flat filled color vs gradient with shared magenta bloom (same grade hues). */
export type MoodGradeColorStyle = 'solid' | 'gradient';

/** Vertical stack slots on Today (habits strip, Goals, To-do). Order = top → bottom; enabling bumps that slot to the bottom among visible sections. */
export type TodayExtensionStackId = 'habits' | 'goals' | 'todo';

/** Default top-to-bottom order for Today extension slots (overridden when users re-enable toggles). */
export const DEFAULT_TODAY_EXTENSIONS_STACK_ORDER: readonly TodayExtensionStackId[] = [
  'habits',
  'goals',
  'todo',
];

export interface AppSettings {
  /** Light / dark / follow system (Settings → Appearance) */
  appearance: AppearancePreference;

  /** Calendar day mood rendering: dot under day number vs full colored square */
  calendarMoodStyle: CalendarMoodStyle;

  /** Solid vs gradient blooms for mood color chips (Settings → Appearance) */
  moodGradeColorStyle: MoodGradeColorStyle;

  /** When true, Today shows habit chips below the note */
  habitsEnabled: boolean;

  /** When true, Today shows the Goals starter section (objectives — full feature upcoming). */
  todayGoalsEnabled: boolean;

  /** When true, Today shows the To-do starter section (tasks — full feature upcoming). */
  todayTodoEnabled: boolean;

  /**
   * Render order for extension slots (top → bottom). Always a permutation of all three ids; visibility still
   * depends on {@link AppSettings.habitsEnabled} / goals / todo toggles and habit strip rules.
   */
  todayExtensionsOrder: TodayExtensionStackId[];
}
