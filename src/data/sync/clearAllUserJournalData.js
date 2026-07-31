/**
 * @fileoverview Clear local + cloud journal data while keeping the signed-in account.
 * @module data/sync/clearAllUserJournalData
 */
import { wipeCloudUserJournalData } from '../../cloud/sync/wipeCloudUserJournalData';
import { resetLocalUserDataCompletely } from './localUserDataReset';
/**
 * Wipes mood/habit/goal/reminder data locally and (optionally) in the cloud.
 * Does not sign out or delete the auth account.
 */
export async function clearAllUserJournalData(options) {
    await resetLocalUserDataCompletely();
    if (options?.cloudUser) {
        await wipeCloudUserJournalData(options.cloudUser);
    }
}
