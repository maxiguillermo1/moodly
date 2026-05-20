/**
 * @fileoverview Push local outbox operations to Supabase Postgres.
 * @module cloud/sync/cloudPush
 */

import type { User } from '@supabase/supabase-js';
import { logger } from '../../lib/security/logger';
import { getSupabaseClient } from '../supabase/client';
import { peekOutbox, replaceOutbox } from './syncOutbox';
import type { SyncOperation } from './types';

async function pushOperation(userId: string, op: SyncOperation): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client unavailable');

  switch (op.kind) {
    case 'mood_upsert': {
      const { error } = await client.from('mood_entries').upsert(
        {
          user_id: userId,
          date: op.entry.date,
          mood: op.entry.mood,
          note: op.entry.note,
          created_at_ms: op.entry.createdAt,
          updated_at_ms: op.entry.updatedAt,
          deleted_at: null,
        },
        { onConflict: 'user_id,date' }
      );
      if (error) throw error;
      return;
    }
    case 'mood_delete': {
      const { error } = await client.from('mood_entries').upsert(
        {
          user_id: userId,
          date: op.date,
          mood: 'F',
          note: '',
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
          deleted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      );
      if (error) throw error;
      return;
    }
    case 'habits_snapshot': {
      await client.from('habit_selections').delete().eq('user_id', userId);
      const rows: { user_id: string; date: string; habit_id: string; updated_at_ms: number }[] = [];
      const now = Date.now();
      for (const [date, ids] of Object.entries(op.selections)) {
        for (const habitId of ids) {
          rows.push({ user_id: userId, date, habit_id: habitId, updated_at_ms: now });
        }
      }
      if (rows.length > 0) {
        const { error } = await client.from('habit_selections').insert(rows);
        if (error) throw error;
      }
      return;
    }
    case 'tracked_habits_snapshot': {
      const { error } = await client.from('tracked_habits').upsert(
        { user_id: userId, habit_ids: op.habitIds, updated_at_ms: Date.now() },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      return;
    }
    case 'goals_snapshot': {
      const goals = Object.values(op.record.goalsById ?? {});
      await client.from('goal_progress').delete().eq('user_id', userId);
      await client.from('goals').delete().eq('user_id', userId);
      if (goals.length === 0) return;
      const goalRows = goals.map((g) => ({
        user_id: userId,
        id: g.id,
        payload_json: { ...g, history: undefined },
        updated_at_ms: g.updatedAt,
        deleted_at: null,
      }));
      const { error: gErr } = await client.from('goals').insert(goalRows);
      if (gErr) throw gErr;
      const progressRows = goals.flatMap((g) =>
        (g.history ?? []).map((h) => ({
          user_id: userId,
          goal_id: g.id,
          date: h.date,
          value: h.value,
          note: h.note ?? '',
          created_at_ms: h.createdAt,
          updated_at_ms: h.createdAt,
        }))
      );
      if (progressRows.length > 0) {
        const { error: pErr } = await client.from('goal_progress').insert(progressRows);
        if (pErr) throw pErr;
      }
      return;
    }
    case 'settings_snapshot': {
      const { error } = await client.from('app_settings').upsert(
        { user_id: userId, settings_json: op.settings, updated_at_ms: Date.now() },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      return;
    }
    case 'tasks_snapshot': {
      const { error } = await client.from('tasks_records').upsert(
        { user_id: userId, payload_json: op.record, updated_at_ms: Date.now() },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      return;
    }
    case 'task_day_snapshot': {
      const { error } = await client.from('task_day_items').upsert(
        {
          user_id: userId,
          date: op.date,
          items_json: op.items,
          updated_at_ms: Date.now(),
        },
        { onConflict: 'user_id,date' }
      );
      if (error) throw error;
      return;
    }
    case 'insights_timing_snapshot': {
      const { error } = await client.from('insights_reflection_timing').upsert(
        {
          user_id: userId,
          payload_json: op.payload,
          updated_at_ms: Date.now(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      return;
    }
    default:
      return;
  }
}

export async function pushOutboxToCloud(user: User): Promise<{ pushed: number; remaining: number }> {
  const ops = await peekOutbox();
  if (ops.length === 0) return { pushed: 0, remaining: 0 };

  const failed: SyncOperation[] = [];
  let pushed = 0;
  for (const op of ops) {
    try {
      await pushOperation(user.id, op);
      pushed += 1;
    } catch (e) {
      logger.warn('cloud.sync.push.op_failed', { kind: op.kind, error: e });
      failed.push(op);
    }
  }
  await replaceOutbox(failed);
  return { pushed, remaining: failed.length };
}
