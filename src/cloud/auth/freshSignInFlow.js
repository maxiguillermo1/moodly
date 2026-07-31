/**
 * @fileoverview Fresh sign-in cloud restore orchestration (pull before snapshot upload).
 * @module cloud/auth/freshSignInFlow
 */
import { runInitialCloudRestore } from '../sync/syncEngine';
import { pushOutboxToCloud } from '../sync/cloudPush';
import { registerKairoCloudPullApplier } from '../../data/sync/cloudPullApplier';
import { enqueueFullLocalSnapshotForCloud } from '../../data/sync/cloudSnapshotEnqueue';
import { deviceHasLocalJournalData } from '../../data/sync/localJournalDataProbe';
/**
 * After SIGNED_IN: pull cloud into local cache first, then upload local journal only when
 * the device actually has data (reinstall with empty local must not push destructive snapshots).
 */
export async function runFreshSignInFlow(session) {
    await registerKairoCloudPullApplier();
    await runInitialCloudRestore(session.user);
    if (await deviceHasLocalJournalData()) {
        await enqueueFullLocalSnapshotForCloud();
        await pushOutboxToCloud(session.user);
    }
}
