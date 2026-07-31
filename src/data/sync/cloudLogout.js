/**
 * @fileoverview Clear local journal data on sign-out (cloud remains in Supabase).
 * @module data/sync/cloudLogout
 */
import { resetLocalUserDataCompletely } from './localUserDataReset';
/** Removes local mood/habit/goal/reminder data after sign-out. Cloud copy is preserved. */
export async function clearLocalUserDataOnLogout() {
    await resetLocalUserDataCompletely();
}
