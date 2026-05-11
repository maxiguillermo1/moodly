/**
 * @fileoverview App settings types
 * @module types/settings
 */

export type CalendarMoodStyle = 'dot' | 'fill';

export type AppearancePreference = 'system' | 'light' | 'dark';

/** Mood visuals: flat filled color vs gradient with shared magenta bloom (same grade hues). */
export type MoodGradeColorStyle = 'solid' | 'gradient';

export interface AppSettings {
  /** Light / dark / follow system (Settings → Appearance) */
  appearance: AppearancePreference;

  /** Calendar day mood rendering: dot under day number vs full colored square */
  calendarMoodStyle: CalendarMoodStyle;

  /** Solid vs gradient blooms for mood color chips (Settings → Appearance) */
  moodGradeColorStyle: MoodGradeColorStyle;
}
