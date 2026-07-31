/**
 * @fileoverview Drop stale mood outbox ops after cloud pull merge.
 * @module cloud/sync/outboxReconcile
 *
 * Pull merges cloud moods by updatedAt; pushing the pre-pull outbox can regress
 * cloud data when ops carry older timestamps than the merged local state.
 */
import { peekOutbox, replaceOutbox } from './syncOutbox';

/**
 * Remove mood outbox operations superseded by the post-pull local mood record.
 * @param {import('../../data/sync/cloudPullApplier').CloudPullApplier} applier
 */
export async function reconcileOutboxAfterPull(applier) {
    const localMoods = await applier.getLocalMoodEntries();
    const outbox = await peekOutbox();
    if (outbox.length === 0)
        return;
    const filtered = outbox.filter((op) => {
        if (op.kind === 'mood_upsert') {
            const local = localMoods[op.entry.date];
            if (local && local.updatedAt >= op.entry.updatedAt) {
                return false;
            }
            return true;
        }
        if (op.kind === 'mood_delete') {
            const local = localMoods[op.date];
            if (local) {
                return false;
            }
            return true;
        }
        return true;
    });
    if (filtered.length !== outbox.length) {
        await replaceOutbox(filtered);
    }
}
