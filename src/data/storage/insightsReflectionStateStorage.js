/**
 * @fileoverview Persisted **insight presentation timing** (cooldown bookkeeping only).
 * @module data/storage/insightsReflectionStateStorage
 *
 * Does not store computed insights — only “last time topic X was surfaced” timestamps.
 */
import { timingStateAfterRecording } from '../../lib/insights/reflectionTiming';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { notifyInsightsTimingChanged } from '../sync/syncBridge';
import { storage } from './asyncStorage';
const STORAGE_KEY = 'kairo.insights.reflectionTiming';
const emptyState = () => ({ schemaVersion: 1, topicLastSurfacedAtMs: {} });
let cache = null;
let loadPromise = null;
function safeParse(raw) {
    if (!raw)
        return emptyState();
    try {
        const v = JSON.parse(raw);
        if (!v || typeof v !== 'object')
            return emptyState();
        const o = v;
        if (o.schemaVersion !== 1)
            return emptyState();
        const map = o.topicLastSurfacedAtMs;
        const topicLastSurfacedAtMs = {};
        if (map && typeof map === 'object') {
            for (const [k, val] of Object.entries(map)) {
                if (typeof k !== 'string' || k.length === 0)
                    continue;
                const n = typeof val === 'number' ? val : Number(val);
                if (Number.isFinite(n) && n > 0)
                    topicLastSurfacedAtMs[k] = n;
            }
        }
        return { schemaVersion: 1, topicLastSurfacedAtMs };
    }
    catch {
        return emptyState();
    }
}
async function load() {
    await ensureLocalPersistenceReady();
    if (cache)
        return cache;
    if (loadPromise)
        return loadPromise;
    loadPromise = (async () => {
        const raw = await storage.getItem(STORAGE_KEY);
        const parsed = safeParse(raw);
        cache = parsed;
        return parsed;
    })();
    try {
        return await loadPromise;
    }
    finally {
        loadPromise = null;
    }
}
async function persist(next) {
    assertLocalPersistenceWritable();
    cache = next;
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));
    notifyInsightsTimingChanged(next);
}
export async function replaceInsightsReflectionTimingForSync(payload) {
    await ensureLocalPersistenceReady();
    const parsed = safeParse(JSON.stringify(payload));
    await persist(parsed);
}
export const insightsReflectionStateStorage = {
    async getTimingState() {
        return load();
    },
    async recordTopicsSurfaced(topicIds, nowMs) {
        if (topicIds.length === 0)
            return;
        await ensureLocalPersistenceReady();
        const prev = await load();
        const t = typeof nowMs === 'number' && Number.isFinite(nowMs) ? nowMs : Date.now();
        const next = timingStateAfterRecording(prev, topicIds, t);
        await persist(next);
    },
    resetSessionCacheForTests() {
        cache = null;
        loadPromise = null;
    },
    async clearAll() {
        await ensureLocalPersistenceReady();
        assertLocalPersistenceWritable();
        cache = emptyState();
        loadPromise = null;
        await storage.removeItem(STORAGE_KEY);
        notifyInsightsTimingChanged(emptyState());
    },
};
