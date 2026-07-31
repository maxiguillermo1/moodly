/**
 * @fileoverview Repository façade for `kairo.settings` + derived toggles.
 * @module data/repositories/settingsRepository
 */
import * as settingsImpl from '../storage/settingsStorage';
export * from '../storage/settingsStorage';
export const settingsRepository = {
    getSettings: settingsImpl.getSettings,
    setSettings: settingsImpl.setSettings,
    setCalendarMoodStyle: settingsImpl.setCalendarMoodStyle,
    setAppearancePreference: settingsImpl.setAppearancePreference,
    setMoodGradeColorStyle: settingsImpl.setMoodGradeColorStyle,
    setHabitsEnabled: settingsImpl.setHabitsEnabled,
    setTodayGoalsEnabled: settingsImpl.setTodayGoalsEnabled,
    setTodayTodoEnabled: settingsImpl.setTodayTodoEnabled,
    bumpTodayExtensionStackOrder: settingsImpl.bumpTodayExtensionStackOrder,
};
