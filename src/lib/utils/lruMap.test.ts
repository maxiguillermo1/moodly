import { setWithLruEvict, touchLruMapKey } from './lruMap';

describe('lruMap', () => {
  it('setWithLruEvict evicts oldest when at capacity', () => {
    const m = new Map<string, number>();
    setWithLruEvict(m, 'a', 1, 2);
    setWithLruEvict(m, 'b', 2, 2);
    setWithLruEvict(m, 'c', 3, 2);
    expect(m.has('a')).toBe(false);
    expect(m.get('c')).toBe(3);
  });

  it('touchLruMapKey moves an entry to the MRU side so it survives the next eviction', () => {
    const m = new Map<string, number>();
    setWithLruEvict(m, 'a', 1, 3);
    setWithLruEvict(m, 'b', 2, 3);
    setWithLruEvict(m, 'c', 3, 3);
    expect(touchLruMapKey(m, 'a')).toBe(true);
    setWithLruEvict(m, 'd', 4, 3);
    expect(m.has('a')).toBe(true);
    expect(m.has('b')).toBe(false);
  });

  it('touchLruMapKey returns false for missing keys', () => {
    const m = new Map<string, number>();
    expect(touchLruMapKey(m, 'x')).toBe(false);
  });
});
