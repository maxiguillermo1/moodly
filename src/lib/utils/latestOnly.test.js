import { nextRequestId, isLatestRequest } from './latestOnly';
describe('latestOnly async guards', () => {
    it('nextRequestId monotonic; isLatestRequest is false for superseded id', () => {
        const ref = { current: 0 };
        const a = nextRequestId(ref);
        const b = nextRequestId(ref);
        expect(a).toBe(1);
        expect(b).toBe(2);
        expect(isLatestRequest(ref, b)).toBe(true);
        expect(isLatestRequest(ref, a)).toBe(false);
    });
});
