/**
 * @fileoverview App settings types
 * @module types/settings
 */

export type CalendarMoodStyle = 'dot' | 'fill';

export interface AppSettings {
  /** Calendar day mood rendering: dot under day number vs full colored square */
  calendarMoodStyle: CalendarMoodStyle;

  /**
   * Calendar month container background:
   * - false: use "card" background (default, current behavior)
   * - true: match the screen background color
   */
  monthCardMatchesScreenBackground: boolean;
}

