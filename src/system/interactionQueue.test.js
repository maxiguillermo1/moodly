import { interactionQueue } from './interactionQueue';
describe('interactionQueue', () => {
    beforeEach(() => {
        interactionQueue.reset();
    });
    it('resets scrolling and momentum state together', () => {
        const snapshots = [];
        const unsubscribe = interactionQueue.subscribe((state) => snapshots.push({ ...state }));
        interactionQueue.setUserScrolling(true);
        interactionQueue.setMomentum(true);
        interactionQueue.reset();
        expect(interactionQueue.getState()).toEqual({ isUserScrolling: false, isMomentum: false });
        expect(snapshots[snapshots.length - 1]).toEqual({ isUserScrolling: false, isMomentum: false });
        unsubscribe();
    });
});
