const STORAGE_KEY = 'kairo.trackedHabits';
describe('habitTrackingStorage resilience', () => {
    beforeEach(async () => {
        globalThis.__KAIRO_CHAOS__ = undefined;
        jest.resetModules();
        const mod = require('@react-native-async-storage/async-storage');
        await (mod?.default ?? mod).clear();
    });
    it('corrupt JSON falls back to catalog defaults (non-empty ordered list)', async () => {
        const { getTrackedHabitIds } = require('./habitTrackingStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.setItem(STORAGE_KEY, 'not-json');
        const ids = await getTrackedHabitIds();
        expect(Array.isArray(ids)).toBe(true);
        expect(ids.length).toBeGreaterThan(0);
        const keys = await AsyncStorage.getAllKeys();
        expect(keys.some((k) => k.startsWith(`${STORAGE_KEY}.corrupt.`))).toBe(true);
    });
    it('setTrackedHabitIds dedupes and filters unknown ids', async () => {
        const habitTracking = require('./habitTrackingStorage');
        await habitTracking.setTrackedHabitIds(['workout', 'workout', 'not_a_real_habit']);
        const ids = await habitTracking.getTrackedHabitIds();
        expect(ids.includes('workout')).toBe(true);
        expect(ids.some((x) => String(x).includes('not_a_real'))).toBe(false);
    });
    it('does not let a stale cold load overwrite a newer write cache', async () => {
        const habitTracking = require('./habitTrackingStorage');
        globalThis.__KAIRO_CHAOS__ = {
            enabled: true,
            seed: 11,
            minDelayMs: 25,
            maxDelayMs: 25,
            failOps: ['getItem'],
        };
        const coldLoad = habitTracking.getTrackedHabitIds();
        await habitTracking.setTrackedHabitIds([]);
        await coldLoad;
        expect(await habitTracking.getTrackedHabitIds()).toEqual([]);
    });
});
