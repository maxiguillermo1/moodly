/**
 * @fileoverview Persisted **insight presentation timing** (cooldown bookkeeping only).
 * @module data/storage/insightsReflectionStateStorage
 *
 * Does not store computed insights — only “last time topic X was surfaced” timestamps.
 */

import type { InsightsTimingStateV1 } from '../../lib/insights/reflectionTiming';
import { timingStateAfterRecording } from '../../lib/insights/reflectionTiming';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { storage } from './asyncStorage';

const STORAGE_KEY = 'moodly.insights.reflectionTiming';

const emptyState = (): InsightsTimingStateV1 => ({ schemaVersion: 1, topicLastSurfacedAtMs: {} });

let cache: InsightsTimingStateV1 | null = null;
let loadPromise: Promise<InsightsTimingStateV1> | null = null;

function safeParse(raw: string | null): InsightsTimingStateV1 {
  if (!raw) return emptyState();
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return emptyState();
    const o = v as Record<string, unknown>;
    if (o.schemaVersion !== 1) return emptyState();
    const map = o.topicLastSurfacedAtMs;
    const topicLastSurfacedAtMs: Record<string, number> = {};
    if (map && typeof map === 'object') {
      for (const [k, val] of Object.entries(map)) {
        if (typeof k !== 'string' || k.length === 0) continue;
        const n = typeof val === 'number' ? val : Number(val);
        if (Number.isFinite(n) && n > 0) topicLastSurfacedAtMs[k] = n;
      }
    }
    return { schemaVersion: 1, topicLastSurfacedAtMs };
  } catch {
    return emptyState();
  }
}

async function load(): Promise<InsightsTimingStateV1> {
  await ensureLocalPersistenceReady();
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const raw = await storage.getItem(STORAGE_KEY);
    const parsed = safeParse(raw);
    cache = parsed;
    return parsed;
  })();
  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

async function persist(next: InsightsTimingStateV1): Promise<void> {
  assertLocalPersistenceWritable();
  cache = next;
  await storage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function replaceInsightsReflectionTimingForSync(payload: Record<string, unknown>): Promise<void> {
  await ensureLocalPersistenceReady();
  const parsed = safeParse(JSON.stringify(payload));
  await persist(parsed);
}

export const insightsReflectionStateStorage = {
  async getTimingState(): Promise<InsightsTimingStateV1> {
    return load();
  },

  async recordTopicsSurfaced(topicIds: readonly string[], nowMs?: number): Promise<void> {
    if (topicIds.length === 0) return;
    await ensureLocalPersistenceReady();
    const prev = await load();
    const t = typeof nowMs === 'number' && Number.isFinite(nowMs) ? nowMs : Date.now();
    const next = timingStateAfterRecording(prev, topicIds, t);
    await persist(next);
  },

  resetSessionCacheForTests(): void {
    cache = null;
    loadPromise = null;
  },
} as const;
