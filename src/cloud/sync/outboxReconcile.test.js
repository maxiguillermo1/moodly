/**
 * @fileoverview Outbox reconciliation after cloud pull tests.
 */
import { reconcileOutboxAfterPull } from './outboxReconcile';
import { enqueueSyncOperation, peekOutbox, resetSyncOutboxForTests, clearOutbox } from './syncOutbox';

function getAsyncStorage() {
    const mod = require('@react-native-async-storage/async-storage');
    return mod?.default ?? mod;
}

describe('outboxReconcile', () => {
    beforeEach(async () => {
        resetSyncOutboxForTests();
        await getAsyncStorage().clear();
        await clearOutbox();
    });

    it('drops mood upserts older than merged local state', async () => {
        await enqueueSyncOperation({
            kind: 'mood_upsert',
            entry: { date: '2026-05-01', mood: 'C', note: 'stale', createdAt: 1, updatedAt: 100 },
        });
        const applier = {
            getLocalMoodEntries: async () => ({
                '2026-05-01': { date: '2026-05-01', mood: 'A', note: 'cloud', createdAt: 1, updatedAt: 500 },
            }),
        };
        await reconcileOutboxAfterPull(applier);
        const ops = await peekOutbox();
        expect(ops).toHaveLength(0);
    });

    it('keeps mood upserts newer than merged local state', async () => {
        await enqueueSyncOperation({
            kind: 'mood_upsert',
            entry: { date: '2026-05-01', mood: 'A', note: 'local', createdAt: 1, updatedAt: 600 },
        });
        const applier = {
            getLocalMoodEntries: async () => ({
                '2026-05-01': { date: '2026-05-01', mood: 'B', note: 'cloud', createdAt: 1, updatedAt: 500 },
            }),
        };
        await reconcileOutboxAfterPull(applier);
        const ops = await peekOutbox();
        expect(ops).toHaveLength(1);
    });

    it('drops mood delete when local entry still exists after merge', async () => {
        await enqueueSyncOperation({ kind: 'mood_delete', date: '2026-05-01' });
        const applier = {
            getLocalMoodEntries: async () => ({
                '2026-05-01': { date: '2026-05-01', mood: 'A', note: '', createdAt: 1, updatedAt: 500 },
            }),
        };
        await reconcileOutboxAfterPull(applier);
        const ops = await peekOutbox();
        expect(ops).toHaveLength(0);
    });
});
