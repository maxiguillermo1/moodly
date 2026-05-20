/**
 * @fileoverview Narrow settings façade (avoids pulling full `storage` barrel at theme startup).
 * @module storage/settings
 */

export {
  getSettings,
  setAppearancePreference,
  setMoodGradeColorStyle,
  setHabitsEnabled,
  setTodayGoalsEnabled,
  setTodayTodoEnabled,
  bumpTodayExtensionStackOrder,
} from '../data/storage/settingsStorage';
