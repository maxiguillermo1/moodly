/**
 * @fileoverview Persisted app settings (AsyncStorage) (data layer source of truth)
 * @module data/storage/settingsStorage
 */
import { logger } from '../../lib/security/logger';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { notifySettingsChanged } from '../sync/syncBridge';
import { storage } from './asyncStorage';
const SETTINGS_KEY = 'kairo.settings';
const CORRUPT_PREFIX = `${SETTINGS_KEY}.corrupt.`;
const DEFAULT_SETTINGS = {
    appearance: 'system',
    calendarMoodStyle: 'fill',
    moodGradeColorStyle: 'solid',
    habitsEnabled: false,
    todayGoalsEnabled: false,
    todayTodoEnabled: false,
    todayExtensionsOrder: ['habits', 'goals', 'todo'],
    cloudBackupPromptDismissed: false,
    localOnlyMode: false,
};
const STACK_IDS = ['habits', 'goals', 'todo'];
const STACK_ID_SET = new Set(STACK_IDS);
function normalizeTodayExtensionsOrder(raw) {
    const out = [];
    const seen = new Set();
    if (Array.isArray(raw)) {
        for (const x of raw) {
            if (STACK_ID_SET.has(x) && !seen.has(x)) {
                seen.add(x);
                out.push(x);
            }
        }
    }
    for (const id of STACK_IDS) {
        if (!seen.has(id))
            out.push(id);
    }
    return out;
}
function bumpStackIdToEnd(order, id) {
    const next = order.filter((k) => k !== id);
    next.push(id);
    return next;
}
function stackOrdersEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}
let settingsCache = null;
let settingsLoadPromise = null;
let settingsSessionEpoch = 0;
/** Bumps when persisted settings are written to the in-memory cache. */
export function getSettingsSessionEpoch() {
    return settingsSessionEpoch;
}
/** Sync read of the in-memory settings cache (null until first `getSettings` completes). */
export function peekSettingsCache() {
    return settingsCache ? cloneSettings(settingsCache) : null;
}
/**
 * Write serialization (reliability).
 *
 * Settings are mutated from UI switches which can be spammed.
 * Without a lock, overlapping writes can race and end in stale values.
 */
let settingsWriteTail = Promise.resolve();
async function withSettingsWriteLock(op) {
    const prev = settingsWriteTail;
    let release;
    settingsWriteTail = new Promise((r) => {
        release = r;
    });
    await prev;
    try {
        return await op();
    }
    finally {
        release();
    }
}
function safeParseSettings(json) {
    if (!json)
        return DEFAULT_SETTINGS;
    try {
        const raw = JSON.parse(json);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
            return DEFAULT_SETTINGS;
        const appearance = raw.appearance === 'light' || raw.appearance === 'dark' || raw.appearance === 'system'
            ? raw.appearance
            : DEFAULT_SETTINGS.appearance;
        const calendarMoodStyle = 'fill';
        const moodGradeColorStyle = raw.moodGradeColorStyle === 'gradient' || raw.moodGradeColorStyle === 'solid'
            ? raw.moodGradeColorStyle
            : DEFAULT_SETTINGS.moodGradeColorStyle;
        const habitsEnabled = typeof raw.habitsEnabled === 'boolean' ? raw.habitsEnabled : DEFAULT_SETTINGS.habitsEnabled;
        const todayGoalsEnabled = typeof raw.todayGoalsEnabled === 'boolean' ? raw.todayGoalsEnabled : DEFAULT_SETTINGS.todayGoalsEnabled;
        const todayTodoEnabled = typeof raw.todayTodoEnabled === 'boolean' ? raw.todayTodoEnabled : DEFAULT_SETTINGS.todayTodoEnabled;
        const todayExtensionsOrder = normalizeTodayExtensionsOrder(raw.todayExtensionsOrder);
        const cloudBackupPromptDismissed = typeof raw.cloudBackupPromptDismissed === 'boolean'
            ? raw.cloudBackupPromptDismissed
            : DEFAULT_SETTINGS.cloudBackupPromptDismissed;
        const localOnlyMode = typeof raw.localOnlyMode === 'boolean' ? raw.localOnlyMode : DEFAULT_SETTINGS.localOnlyMode;
        return {
            ...DEFAULT_SETTINGS,
            appearance,
            calendarMoodStyle,
            moodGradeColorStyle,
            habitsEnabled,
            todayGoalsEnabled,
            todayTodoEnabled,
            todayExtensionsOrder,
            cloudBackupPromptDismissed,
            localOnlyMode,
        };
    }
    catch {
        return DEFAULT_SETTINGS;
    }
}
function cloneSettings(settings) {
    return {
        ...settings,
        todayExtensionsOrder: [...settings.todayExtensionsOrder],
    };
}
async function quarantineCorruptValue(rawJson) {
    const ts = Date.now();
    const backupKey = `${CORRUPT_PREFIX}${ts}`;
    try {
        await storage.setItem(backupKey, rawJson);
    }
    catch (e) {
        logger.warn('storage.settings.corruptBackup.persistFailed', { key: SETTINGS_KEY, error: e });
    }
    try {
        await storage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }
    catch (e) {
        logger.error('storage.settings.corruptReset.failed', { key: SETTINGS_KEY, error: e });
    }
}
export async function getSettings() {
    try {
        if (settingsCache)
            return cloneSettings(settingsCache);
        await ensureLocalPersistenceReady();
        if (settingsLoadPromise)
            return settingsLoadPromise;
        settingsLoadPromise = (async () => {
            const json = await logger.perfMeasure('storage.getSettings.getItem', { phase: 'cold', source: 'storage' }, async () => {
                return storage.getItem(SETTINGS_KEY);
            });
            const next = safeParseSettings(json);
            // If JSON exists but parsing yields defaults, quarantine to avoid repeated weird states.
            if (typeof json === 'string' && json.length > 0) {
                try {
                    const parsed = JSON.parse(json);
                    const isObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed);
                    const keyCount = isObject ? Object.keys(parsed).length : 0;
                    const hasValidStyle = isObject &&
                        (parsed.calendarMoodStyle === undefined ||
                            parsed.calendarMoodStyle === 'dot' ||
                            parsed.calendarMoodStyle === 'fill');
                    const moodGradeOk = parsed.moodGradeColorStyle === undefined ||
                        parsed.moodGradeColorStyle === 'solid' ||
                        parsed.moodGradeColorStyle === 'gradient';
                    const habitsOk = parsed.habitsEnabled === undefined || typeof parsed.habitsEnabled === 'boolean';
                    const goalsOk = parsed.todayGoalsEnabled === undefined || typeof parsed.todayGoalsEnabled === 'boolean';
                    const todoOk = parsed.todayTodoEnabled === undefined || typeof parsed.todayTodoEnabled === 'boolean';
                    const orderOk = parsed.todayExtensionsOrder === undefined || Array.isArray(parsed.todayExtensionsOrder);
                    // Treat an empty object `{}` as a benign "defaults" case; don't quarantine to avoid pointless writes.
                    const appearanceOk = isObject &&
                        (parsed.appearance === undefined ||
                            parsed.appearance === 'system' ||
                            parsed.appearance === 'light' ||
                            parsed.appearance === 'dark');
                    if (keyCount > 0 &&
                        (!hasValidStyle || !appearanceOk || !moodGradeOk || !habitsOk || !goalsOk || !todoOk || !orderOk)) {
                        logger.warn('storage.settings.corrupt.detected', { key: SETTINGS_KEY, action: 'quarantineAndReset' });
                        await quarantineCorruptValue(json);
                    }
                }
                catch {
                    logger.warn('storage.settings.corrupt.detected', { key: SETTINGS_KEY, action: 'quarantineAndReset' });
                    await quarantineCorruptValue(json);
                }
            }
            settingsCache = cloneSettings(next);
            return cloneSettings(next);
        })();
        const res = await settingsLoadPromise;
        settingsLoadPromise = null;
        return res;
    }
    catch {
        settingsLoadPromise = null;
        return DEFAULT_SETTINGS;
    }
}
export async function setSettings(next) {
    return withSettingsWriteLock(async () => {
        await persistSettingsUnlocked(next);
    });
}
function assertValidSettingsForDev(next) {
    if (typeof __DEV__ === 'undefined' || !__DEV__)
        return;
    const { calendarMoodStyle: style, appearance, moodGradeColorStyle: mg } = next;
    if (style !== 'dot' && style !== 'fill') {
        throw new Error(`[settingsStorage.setSettings] Invalid calendarMoodStyle: ${String(style)}`);
    }
    if (appearance !== 'system' && appearance !== 'light' && appearance !== 'dark') {
        throw new Error(`[settingsStorage.setSettings] Invalid appearance: ${String(appearance)}`);
    }
    if (mg !== 'solid' && mg !== 'gradient') {
        throw new Error(`[settingsStorage.setSettings] Invalid moodGradeColorStyle: ${String(mg)}`);
    }
    const { habitsEnabled: habits, todayGoalsEnabled: tg, todayTodoEnabled: tt } = next;
    if (typeof habits !== 'boolean') {
        throw new Error(`[settingsStorage.setSettings] Invalid habitsEnabled: ${String(habits)}`);
    }
    if (typeof tg !== 'boolean') {
        throw new Error(`[settingsStorage.setSettings] Invalid todayGoalsEnabled: ${String(tg)}`);
    }
    if (typeof tt !== 'boolean') {
        throw new Error(`[settingsStorage.setSettings] Invalid todayTodoEnabled: ${String(tt)}`);
    }
    const ord = next.todayExtensionsOrder;
    if (!Array.isArray(ord) ||
        ord.length !== 3 ||
        new Set(ord).size !== 3 ||
        !ord.every((x) => x === 'habits' || x === 'goals' || x === 'todo')) {
        throw new Error(`[settingsStorage.setSettings] Invalid todayExtensionsOrder: ${String(ord)}`);
    }
}
async function persistSettingsUnlocked(next) {
    const normalized = { ...next, calendarMoodStyle: 'fill' };
    assertValidSettingsForDev(normalized);
    try {
        // Persist first. Only update RAM cache after the write succeeds.
        await ensureLocalPersistenceReady();
        assertLocalPersistenceWritable();
        const safeNext = cloneSettings(normalized);
        await storage.setItem(SETTINGS_KEY, JSON.stringify(safeNext));
        settingsCache = safeNext;
        settingsSessionEpoch += 1;
        notifySettingsChanged(safeNext);
    }
    catch (error) {
        logger.error('storage.settings.set.failed', { key: SETTINGS_KEY, error });
        throw error;
    }
}
async function updateSettings(mutator) {
    return withSettingsWriteLock(async () => {
        const current = settingsCache ?? (await getSettings());
        await persistSettingsUnlocked(mutator(current));
    });
}
export async function setCalendarMoodStyle(_style) {
    await updateSettings((current) => ({ ...current, calendarMoodStyle: 'fill' }));
}
export async function setAppearancePreference(mode) {
    await updateSettings((current) => ({ ...current, appearance: mode }));
}
export async function setMoodGradeColorStyle(style) {
    await updateSettings((current) => ({ ...current, moodGradeColorStyle: style }));
}
export async function setHabitsEnabled(enabled) {
    await updateSettings((current) => {
        const todayExtensionsOrder = enabled
            ? bumpStackIdToEnd(current.todayExtensionsOrder, 'habits')
            : current.todayExtensionsOrder;
        return { ...current, habitsEnabled: enabled, todayExtensionsOrder };
    });
}
export async function setTodayGoalsEnabled(enabled) {
    await updateSettings((current) => {
        const todayExtensionsOrder = enabled
            ? bumpStackIdToEnd(current.todayExtensionsOrder, 'goals')
            : current.todayExtensionsOrder;
        return { ...current, todayGoalsEnabled: enabled, todayExtensionsOrder };
    });
}
export async function setTodayTodoEnabled(enabled) {
    await updateSettings((current) => {
        const todayExtensionsOrder = enabled
            ? bumpStackIdToEnd(current.todayExtensionsOrder, 'todo')
            : current.todayExtensionsOrder;
        return { ...current, todayTodoEnabled: enabled, todayExtensionsOrder };
    });
}
/** When the habits strip becomes visible (e.g. first tracked habit), move it to the bottom of the stack. */
export async function bumpTodayExtensionStackOrder(id) {
    await updateSettings((current) => {
        const todayExtensionsOrder = bumpStackIdToEnd(current.todayExtensionsOrder, id);
        if (stackOrdersEqual(todayExtensionsOrder, current.todayExtensionsOrder))
            return current;
        return { ...current, todayExtensionsOrder };
    });
}
export async function setCloudBackupPromptDismissed(dismissed) {
    await updateSettings((current) => ({ ...current, cloudBackupPromptDismissed: dismissed }));
}
export async function setLocalOnlyMode(enabled) {
    await updateSettings((current) => ({ ...current, localOnlyMode: enabled }));
}
/**
 * @internal Jest-only: simulate a cold read path without `jest.resetModules()`.
 *
 * Remounting modules clears the in-memory AsyncStorage mock and drops persisted fixtures;
 * use this helper when tests need “session lost, disk intact” semantics.
 */
export function resetSettingsStorageSessionStateForTests() {
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test')
        return;
    invalidateSettingsSessionCache();
}
export function invalidateSettingsSessionCache() {
    settingsCache = null;
    settingsLoadPromise = null;
    settingsWriteTail = Promise.resolve();
    settingsSessionEpoch = 0;
}
