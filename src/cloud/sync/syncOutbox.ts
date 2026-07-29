/**
 * @fileoverview Durable outbox for pending cloud sync operations.
 * @module cloud/sync/syncOutbox
 */

import { storage } from '../../data/storage/asyncStorage';
import type { SyncOperation, SyncOperationInput } from './types';

const OUTBOX_KEY = 'kairo.sync.outbox';

let memoryOutbox: SyncOperation[] | null = null;
let loadPromise: Promise<SyncOperation[]> | null = null;

function newOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadOutbox(): Promise<SyncOperation[]> {
  if (memoryOutbox) return memoryOutbox;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await storage.getItem(OUTBOX_KEY);
      if (!raw) {
        memoryOutbox = [];
        return memoryOutbox;
      }
      const parsed = JSON.parse(raw) as unknown;
      memoryOutbox = Array.isArray(parsed) ? (parsed as SyncOperation[]) : [];
      return memoryOutbox;
    } catch {
      memoryOutbox = [];
      return memoryOutbox;
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

async function persistOutbox(ops: SyncOperation[]): Promise<void> {
  memoryOutbox = ops;
  await storage.setItem(OUTBOX_KEY, JSON.stringify(ops));
}

/** Coalesce mood ops for the same date — keep latest upsert/delete. */
function coalesceOps(ops: SyncOperation[]): SyncOperation[] {
  const moodByDate = new Map<string, SyncOperation>();
  const snapshotKinds = new Set([
    'habits_snapshot',
    'tracked_habits_snapshot',
    'goals_snapshot',
    'settings_snapshot',
    'tasks_snapshot',
    'insights_timing_snapshot',
  ]);
  const latestSnapshot = new Map<string, SyncOperation>();
  const daySnapshots = new Map<string, SyncOperation>();
  const ordered: SyncOperation[] = [];

  for (const op of ops) {
    if (op.kind === 'mood_upsert' || op.kind === 'mood_delete') {
      moodByDate.set(op.kind === 'mood_delete' ? op.date : op.entry.date, op);
      continue;
    }
    if (op.kind === 'task_day_snapshot') {
      daySnapshots.set(op.date, op);
      continue;
    }
    if (snapshotKinds.has(op.kind)) {
      latestSnapshot.set(op.kind, op);
      continue;
    }
    ordered.push(op);
  }

  return [
    ...ordered,
    ...moodByDate.values(),
    ...latestSnapshot.values(),
    ...daySnapshots.values(),
  ];
}

function toSyncOperation(op: SyncOperationInput): SyncOperation {
  return {
    ...op,
    id: op.id ?? newOpId(),
    enqueuedAtMs: op.enqueuedAtMs ?? Date.now(),
  };
}

export async function enqueueSyncOperation(op: SyncOperationInput): Promise<void> {
  await enqueueSyncOperationsBatch([op]);
}

/** One outbox load + persist for many ops (avoids O(n) disk writes on first sign-in snapshot). */
export async function enqueueSyncOperationsBatch(batch: SyncOperationInput[]): Promise<void> {
  if (batch.length === 0) return;
  const full = batch.map(toSyncOperation);
  const current = await loadOutbox();
  const next = coalesceOps([...current, ...full]);
  await persistOutbox(next);
}

export async function peekOutbox(): Promise<SyncOperation[]> {
  return loadOutbox();
}

export async function replaceOutbox(ops: SyncOperation[]): Promise<void> {
  await persistOutbox(coalesceOps(ops));
}

export async function clearOutbox(): Promise<void> {
  memoryOutbox = [];
  await storage.removeItem(OUTBOX_KEY);
}

/** @internal Jest */
export function resetSyncOutboxForTests(): void {
  memoryOutbox = null;
  loadPromise = null;
}
