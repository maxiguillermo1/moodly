/**
 * @fileoverview Clear local + cloud journal data while keeping the signed-in account.
 * @module data/sync/clearAllUserJournalData
 */

import type { User } from '@supabase/supabase-js';
import { wipeCloudUserJournalData } from '../../cloud/sync/wipeCloudUserJournalData';
import { resetLocalUserDataCompletely } from './localUserDataReset';

type ClearAllUserJournalDataOptions = {
  /** When set, also hard-deletes this user's journal rows in Supabase. */
  cloudUser?: User | null;
};

/**
 * Wipes mood/habit/goal/reminder data locally and (optionally) in the cloud.
 * Does not sign out or delete the auth account.
 */
export async function clearAllUserJournalData(options?: ClearAllUserJournalDataOptions): Promise<void> {
  await resetLocalUserDataCompletely();
  if (options?.cloudUser) {
    await wipeCloudUserJournalData(options.cloudUser);
  }
}
