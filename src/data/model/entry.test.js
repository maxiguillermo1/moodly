import { isValidISODateKey, normalizeNote, validateEntriesRecord, MAX_NOTE_LEN, } from './entry';
const baseEntry = (over) => ({
    date: '2026-03-01',
    mood: 'B',
    note: 'ok',
    createdAt: 100,
    updatedAt: 100,
    ...over,
});
describe('isValidISODateKey', () => {
    it('accepts leap day when year is a leap year', () => {
        expect(isValidISODateKey('2024-02-29')).toBe(true);
    });
    it('rejects Feb 29 in non-leap years', () => {
        expect(isValidISODateKey('2025-02-29')).toBe(false);
    });
    it('rejects impossible month/day', () => {
        expect(isValidISODateKey('2026-02-30')).toBe(false);
        expect(isValidISODateKey('2026-13-01')).toBe(false);
    });
});
describe('normalizeNote', () => {
    it('clamps to MAX_NOTE_LEN', () => {
        const long = 'x'.repeat(MAX_NOTE_LEN + 80);
        expect(normalizeNote(long).length).toBe(MAX_NOTE_LEN);
    });
    it('collapses whitespace', () => {
        expect(normalizeNote('  a  \n b  ')).toBe('a b');
    });
});
describe('validateEntriesRecord', () => {
    it('drops entries whose value.date does not match the record key', () => {
        const raw = {
            '2026-03-01': baseEntry({ date: '2026-03-02' }),
        };
        expect(validateEntriesRecord(raw)).toEqual({});
    });
    it('drops invalid mood or bad timestamps', () => {
        const raw = {
            '2026-03-01': baseEntry({ mood: 'Z' }),
            '2026-03-02': baseEntry({ date: '2026-03-02', updatedAt: 50, createdAt: 100 }),
        };
        expect(validateEntriesRecord(raw)).toEqual({});
    });
    it('keeps well-formed rows', () => {
        const e = baseEntry({ date: '2026-03-01' });
        const raw = { '2026-03-01': e };
        expect(validateEntriesRecord(raw)).toEqual({ '2026-03-01': e });
    });
});
