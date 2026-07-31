/**
 * @fileoverview Fresh sign-in cloud restore integration tests.
 * @module cloud/auth/freshSignInFlow.test
 */
import { runFreshSignInFlow } from './freshSignInFlow';
import { runInitialCloudRestore } from '../sync/syncEngine';
import { pushOutboxToCloud } from '../sync/cloudPush';
import { registerKairoCloudPullApplier } from '../../data/sync/cloudPullApplier';
import { enqueueFullLocalSnapshotForCloud } from '../../data/sync/cloudSnapshotEnqueue';
import { deviceHasLocalJournalData } from '../../data/sync/localJournalDataProbe';
jest.mock('../sync/syncEngine', () => ({
    runInitialCloudRestore: jest.fn(async () => undefined),
}));
jest.mock('../sync/cloudPush', () => ({
    pushOutboxToCloud: jest.fn(async () => ({ remaining: 0 })),
}));
jest.mock('../../data/sync/cloudPullApplier', () => ({
    registerKairoCloudPullApplier: jest.fn(async () => undefined),
}));
jest.mock('../../data/sync/cloudSnapshotEnqueue', () => ({
    enqueueFullLocalSnapshotForCloud: jest.fn(async () => undefined),
}));
jest.mock('../../data/sync/localJournalDataProbe', () => ({
    deviceHasLocalJournalData: jest.fn(),
}));
const session = { user: { id: 'user-reinstall' } };
describe('runFreshSignInFlow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('pulls cloud before checking local data (reinstall path)', async () => {
        const order = [];
        registerKairoCloudPullApplier.mockImplementation(async () => {
            order.push('registerApplier');
        });
        runInitialCloudRestore.mockImplementation(async () => {
            order.push('pullRestore');
        });
        deviceHasLocalJournalData.mockImplementation(async () => {
            order.push('probeLocal');
            return false;
        });
        await runFreshSignInFlow(session);
        expect(order).toEqual(['registerApplier', 'pullRestore', 'probeLocal']);
        expect(enqueueFullLocalSnapshotForCloud).not.toHaveBeenCalled();
        expect(pushOutboxToCloud).not.toHaveBeenCalled();
    });
    it('does not enqueue destructive snapshots when local journal is empty', async () => {
        deviceHasLocalJournalData.mockResolvedValue(false);
        await runFreshSignInFlow(session);
        expect(runInitialCloudRestore).toHaveBeenCalledWith(session.user);
        expect(enqueueFullLocalSnapshotForCloud).not.toHaveBeenCalled();
        expect(pushOutboxToCloud).not.toHaveBeenCalled();
    });
    it('uploads local snapshot only after pull when device has journal data', async () => {
        const order = [];
        runInitialCloudRestore.mockImplementation(async () => {
            order.push('pullRestore');
        });
        deviceHasLocalJournalData.mockImplementation(async () => {
            order.push('probeLocal');
            return true;
        });
        enqueueFullLocalSnapshotForCloud.mockImplementation(async () => {
            order.push('enqueueSnapshot');
        });
        pushOutboxToCloud.mockImplementation(async () => {
            order.push('pushOutbox');
            return { remaining: 0 };
        });
        await runFreshSignInFlow(session);
        expect(order).toEqual(['pullRestore', 'probeLocal', 'enqueueSnapshot', 'pushOutbox']);
        expect(enqueueFullLocalSnapshotForCloud).toHaveBeenCalledTimes(1);
        expect(pushOutboxToCloud).toHaveBeenCalledWith(session.user);
    });
});
