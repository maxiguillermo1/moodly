/**
 * @fileoverview Delete all journal domains for a user in Supabase (keeps auth account).
 * @module cloud/sync/wipeCloudUserJournalData
 */

import type { User } from '@supabase/supabase-js';
import { logger } from '../../lib/security/logger';
import { getSupabaseClient } from '../supabase/client';

const JOURNAL_TABLES = [
  'mood_entries',
  'habit_selections',
  'tracked_habits',
  'goal_progress',
  'goals',
  'task_day_items',
  'tasks_records',
  'insights_reflection_timing',
] as const;

async function deleteUserRows(table: (typeof JOURNAL_TABLES)[number], userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client unavailable');
  const { error } = await client.from(table).delete().eq('user_id', userId);
  if (error) throw error;
}

/** Hard-deletes journal rows for `user` in Postgres. Does not touch auth or `app_settings`. */
export async function wipeCloudUserJournalData(user: User): Promise<void> {
  const userId = user.id;
  for (const table of JOURNAL_TABLES) {
    try {
      await deleteUserRows(table, userId);
    } catch (error) {
      logger.error('cloud.wipe.table_failed', { table, error });
      throw error;
    }
  }
}
