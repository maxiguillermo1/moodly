const STORAGE_KEY = 'kairo.entries';
describe('moodStorage reliability edge cases', () => {
    beforeEach(async () => {
        globalThis.__KAIRO_CHAOS__ = undefined;
        jest.resetModules();
        const faultMod = require('./storageFaultInjection');
        faultMod.__resetAsyncStorageFaultInjectionForTests();
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
    });
    it('corrupt entries JSON is quarantined/reset (no crash) (#12, #20)', async () => {
        const { getAllEntries } = require('./moodStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.setItem(STORAGE_KEY, '{not json');
        const res = await getAllEntries();
        expect(res).toEqual({});
        const after = await AsyncStorage.getItem(STORAGE_KEY);
        expect(after).toBe(JSON.stringify({}));
    });
    it('setItem failure does not commit RAM caches (persist-first) (#10)', async () => {
        const { upsertEntry, getEntry, getAllEntries } = require('./moodStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
        globalThis.__KAIRO_CHAOS__ = {
            enabled: true,
            seed: 1,
            failNextByKey: { setItem: { [STORAGE_KEY]: 1 } },
        };
        await expect(upsertEntry({ date: '2026-02-09', mood: 'A', note: '', createdAt: 1, updatedAt: 1 })).rejects.toBeTruthy();
        // Disable fault injection and confirm the entry does not appear.
        globalThis.__KAIRO_CHAOS__ = undefined;
        const e = await getEntry('2026-02-09');
        expect(e).toBeNull();
        const all = await getAllEntries();
        expect(all).toEqual({});
    });
    it('peekEntryFromSessionCache returns undefined before warm, then entry after prime', async () => {
        const { peekEntryFromSessionCache, primeEntriesSessionCache, upsertEntry } = require('./moodStorage');
        expect(peekEntryFromSessionCache('2026-02-09')).toBeUndefined();
        await upsertEntry({ date: '2026-02-09', mood: 'B', note: 'x', createdAt: 1, updatedAt: 1 });
        await primeEntriesSessionCache();
        const row = peekEntryFromSessionCache('2026-02-09');
        expect(row?.mood).toBe('B');
        expect(row?.note).toBe('x');
        expect(peekEntryFromSessionCache('2026-02-10')).toBeNull();
    });
    it('getItem failure returns safe defaults; no crash (#9)', async () => {
        const { getAllEntries } = require('./moodStorage');
        globalThis.__KAIRO_CHAOS__ = {
            enabled: true,
            seed: 1,
            failNextByKey: { getItem: { [STORAGE_KEY]: 1 } },
        };
        const res = await getAllEntries();
        expect(res).toEqual({});
    });
    it('removeItem failure during clear does not corrupt RAM caches (#11)', async () => {
        const { upsertEntry, getAllEntries, clearAllEntries } = require('./moodStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
        await upsertEntry({ date: '2026-02-09', mood: 'A', note: '', createdAt: 1, updatedAt: 1 });
        const before = await getAllEntries();
        expect(Object.keys(before)).toHaveLength(1);
        globalThis.__KAIRO_CHAOS__ = { enabled: true, seed: 1, failNext: { removeItem: 1 } };
        await expect(clearAllEntries()).rejects.toBeTruthy();
        globalThis.__KAIRO_CHAOS__ = undefined;
        const after = await getAllEntries();
        expect(Object.keys(after)).toHaveLength(1);
        expect(after['2026-02-09']?.mood).toBe('A');
    });
    it('concurrent writes are serialized; no lost updates (#19)', async () => {
        const { upsertEntry, getAllEntries } = require('./moodStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
        globalThis.__KAIRO_CHAOS__ = {
            enabled: true,
            seed: 7,
            // Deterministic, small delay to maximize interleaving pressure.
            minDelayMs: 10,
            maxDelayMs: 10,
            pFail: 0,
            failOps: ['setItem'],
        };
        await Promise.all([
            upsertEntry({ date: '2026-02-09', mood: 'A', note: '', createdAt: 1, updatedAt: 1 }),
            upsertEntry({ date: '2026-02-10', mood: 'B', note: '', createdAt: 1, updatedAt: 1 }),
        ]);
        globalThis.__KAIRO_CHAOS__ = undefined;
        const all = await getAllEntries();
        expect(all['2026-02-09']?.mood).toBe('A');
        expect(all['2026-02-10']?.mood).toBe('B');
    });
    it('large entries map round-trips after session cache reset (simulated relaunch)', async () => {
        const faultMod = require('./storageFaultInjection');
        globalThis.__KAIRO_CHAOS__ = undefined;
        faultMod.__resetAsyncStorageFaultInjectionForTests();
        const { setAllEntries, getAllEntries, getEntry, getEntriesSortedDesc, resetEntriesStorageSessionStateForTests } = require('./moodStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
        const N = 600;
        const bulk = {};
        const t0 = 1700000000000;
        let y = 2019;
        let mo = 1;
        let d = 1;
        for (let i = 0; i < N; i++) {
            const key = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            bulk[key] = { date: key, mood: 'B', note: '', createdAt: t0 + i, updatedAt: t0 + i };
            d += 1;
            if (d > 28) {
                d = 1;
                mo += 1;
                if (mo > 12) {
                    mo = 1;
                    y += 1;
                }
            }
        }
        await setAllEntries(bulk);
        resetEntriesStorageSessionStateForTests();
        const all = await getAllEntries();
        expect(Object.keys(all)).toHaveLength(N);
        const probe = await getEntry('2019-01-01');
        expect(probe?.mood).toBe('B');
        const sorted = await getEntriesSortedDesc();
        expect(sorted.length).toBe(N);
        const expectedFirst = Object.keys(bulk).sort((a, b) => b.localeCompare(a))[0];
        expect(sorted[0]?.date).toBe(expectedFirst);
    });
    it('upsert same date twice keeps one row with last write winning (no duplicates)', async () => {
        const { upsertEntry, getEntry, getAllEntries } = require('./moodStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
        await upsertEntry({ date: '2026-05-20', mood: 'A', note: 'first', createdAt: 1, updatedAt: 1 });
        await upsertEntry({ date: '2026-05-20', mood: 'C', note: 'second', createdAt: 1, updatedAt: 2 });
        const e = await getEntry('2026-05-20');
        expect(e?.mood).toBe('C');
        expect(e?.note).toBe('second');
        const all = await getAllEntries();
        expect(Object.keys(all)).toEqual(['2026-05-20']);
    });
    it('returns defensive copies so callers cannot mutate entry caches', async () => {
        const { upsertEntry, getEntry, getAllEntries, getAllEntriesWithMonthIndex, getEntriesSortedDesc, getMoodStats } = require('./moodStorage');
        await upsertEntry({ date: '2026-05-22', mood: 'A', note: 'stable', createdAt: 1, updatedAt: 1 });
        const all = await getAllEntries();
        all['2026-05-22'].note = 'mutated';
        delete all['2026-05-22'];
        const entry = await getEntry('2026-05-22');
        expect(entry?.note).toBe('stable');
        entry.note = 'changed again';
        const sorted = await getEntriesSortedDesc();
        sorted[0].note = 'changed in list';
        const indexed = await getAllEntriesWithMonthIndex();
        indexed.byMonthKey['2026-05']['2026-05-22'].note = 'changed in month index';
        delete indexed.byMonthKey['2026-05']['2026-05-22'];
        const stats = await getMoodStats();
        stats.moodCounts.A = 999;
        expect((await getEntry('2026-05-22'))?.note).toBe('stable');
        expect((await getMoodStats()).moodCounts.A).toBe(1);
    });
    it('keeps warmed derived caches correct across upsert and delete', async () => {
        const { upsertEntry, deleteEntry, getAllEntriesWithMonthIndex, getEntriesSortedDesc, getMoodStats, warmEntriesSessionCaches, } = require('./moodStorage');
        await upsertEntry({ date: '2026-05-01', mood: 'A', note: '', createdAt: 1, updatedAt: 1 });
        await upsertEntry({ date: '2026-06-01', mood: 'B', note: '', createdAt: 1, updatedAt: 1 });
        await warmEntriesSessionCaches();
        await upsertEntry({ date: '2026-05-02', mood: 'F', note: 'new', createdAt: 1, updatedAt: 2 });
        await deleteEntry('2026-06-01');
        const indexed = await getAllEntriesWithMonthIndex();
        expect(Object.keys(indexed.byMonthKey['2026-05'] ?? {}).sort()).toEqual(['2026-05-01', '2026-05-02']);
        expect(indexed.byMonthKey['2026-06']).toBeUndefined();
        expect((await getEntriesSortedDesc()).map((e) => e.date)).toEqual(['2026-05-02', '2026-05-01']);
        const stats = await getMoodStats();
        expect(stats.totalEntries).toBe(2);
        expect(stats.moodCounts.A).toBe(1);
        expect(stats.moodCounts.F).toBe(1);
        expect(stats.moodCounts.B).toBe(0);
    });
    it('peekJournalEntriesSortedDescFromSessionCache returns undefined before warm', async () => {
        const { peekJournalEntriesSortedDescFromSessionCache, primeEntriesSessionCache } = require('./moodStorage');
        expect(peekJournalEntriesSortedDescFromSessionCache()).toBeUndefined();
        await primeEntriesSessionCache();
        expect(peekJournalEntriesSortedDescFromSessionCache()).toEqual([]);
    });
    it('keeps journal sorted snapshot references stable until entries change', async () => {
        const { upsertEntry, getJournalEntriesSortedDescSnapshot } = require('./moodStorage');
        await upsertEntry({ date: '2026-05-01', mood: 'A', note: '', createdAt: 1, updatedAt: 1 });
        await upsertEntry({ date: '2026-05-02', mood: 'B', note: '', createdAt: 1, updatedAt: 1 });
        const first = await getJournalEntriesSortedDescSnapshot();
        const second = await getJournalEntriesSortedDescSnapshot();
        expect(second).toBe(first);
        expect(second.map((e) => e.date)).toEqual(['2026-05-02', '2026-05-01']);
        await upsertEntry({ date: '2026-05-03', mood: 'C', note: '', createdAt: 1, updatedAt: 2 });
        const third = await getJournalEntriesSortedDescSnapshot();
        expect(third).not.toBe(first);
        expect(third[0]?.date).toBe('2026-05-03');
    });
    it('keeps calendar snapshot month references stable until affected months change', async () => {
        const { upsertEntry, getCalendarEntriesByMonthIndexSnapshot } = require('./moodStorage');
        await upsertEntry({ date: '2026-05-01', mood: 'A', note: '', createdAt: 1, updatedAt: 1 });
        await upsertEntry({ date: '2026-06-01', mood: 'B', note: '', createdAt: 1, updatedAt: 1 });
        const first = await getCalendarEntriesByMonthIndexSnapshot();
        const second = await getCalendarEntriesByMonthIndexSnapshot();
        expect(second).toBe(first);
        expect(second['2026-05']).toBe(first['2026-05']);
        await upsertEntry({ date: '2026-05-02', mood: 'F', note: '', createdAt: 1, updatedAt: 2 });
        const third = await getCalendarEntriesByMonthIndexSnapshot();
        expect(third).not.toBe(first);
        expect(third['2026-05']).not.toBe(first['2026-05']);
        expect(third['2026-06']).toBe(first['2026-06']);
    });
    it('rapid sequential upserts same date serialize; final mood wins', async () => {
        const { upsertEntry, getEntry } = require('./moodStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
        await upsertEntry({ date: '2026-05-21', mood: 'A', note: '', createdAt: 1, updatedAt: 1 });
        await upsertEntry({ date: '2026-05-21', mood: 'F', note: '', createdAt: 1, updatedAt: 2 });
        const e = await getEntry('2026-05-21');
        expect(e?.mood).toBe('F');
        const raw = await AsyncStorage.getItem('kairo.entries');
        expect(Object.keys(JSON.parse(raw))).toHaveLength(1);
    });
    it('upsertEntry throws on impossible calendar day (no partial write)', async () => {
        const { upsertEntry, getAllEntries } = require('./moodStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
        await expect(upsertEntry({ date: '2026-02-30', mood: 'A', note: '', createdAt: 1, updatedAt: 1 })).rejects.toThrow(/Invalid ISO date key/);
        const all = await getAllEntries();
        expect(Object.keys(all)).toHaveLength(0);
    });
    it('upsertEntry throws on invalid mood (no partial write)', async () => {
        const { upsertEntry, getAllEntries } = require('./moodStorage');
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
        await expect(upsertEntry({ date: '2026-02-09', mood: 'Z', note: '', createdAt: 1, updatedAt: 1 })).rejects.toThrow(/Invalid mood grade/);
        const all = await getAllEntries();
        expect(Object.keys(all)).toHaveLength(0);
    });
});
