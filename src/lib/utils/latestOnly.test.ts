import { isLatestRequest, nextRequestId } from './latestOnly';

describe('latestOnly guard', () => {
  it('only the latest request id is considered current', async () => {
    const ref = { current: 0 };
    const a = nextRequestId(ref as any);
    const b = nextRequestId(ref as any);
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(isLatestRequest(ref as any, a)).toBe(false);
    expect(isLatestRequest(ref as any, b)).toBe(true);
  });
});

