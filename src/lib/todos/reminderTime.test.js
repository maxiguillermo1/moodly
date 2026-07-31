/**
 * @fileoverview Unit tests for {@link module:lib/todos/reminderTime}.
 */
import { formatReminderMinutes, isReminderOverdueOnDay, nextOpenReminderMinutes } from './reminderTime';
import { toLocalDayKey } from '../utils/date';
function row(partial) {
    return {
        createdAt: 1,
        sortIndex: 0,
        reminderMinutes: null,
        ...partial,
    };
}
describe('formatReminderMinutes', () => {
    it('returns a non-empty localized label', () => {
        const label = formatReminderMinutes(12 * 60);
        expect(label.length).toBeGreaterThan(0);
    });
});
describe('isReminderOverdueOnDay', () => {
    it('is false for other days', () => {
        const now = new Date(2026, 4, 11, 15, 0, 0);
        expect(isReminderOverdueOnDay('2026-05-10', 9 * 60, now)).toBe(false);
    });
    it('is true when later same day', () => {
        const now = new Date(2026, 4, 11, 15, 0, 0);
        expect(isReminderOverdueOnDay('2026-05-11', 9 * 60, now)).toBe(true);
    });
});
describe('nextOpenReminderMinutes', () => {
    it('picks next upcoming time when list day is today', () => {
        const now = new Date();
        const listDayKey = toLocalDayKey(now);
        const at10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0);
        const items = [
            row({ id: 'a', title: 'x', done: false, sortIndex: 0, reminderMinutes: 14 * 60 }),
            row({ id: 'b', title: 'y', done: false, sortIndex: 1, reminderMinutes: 9 * 60 }),
        ];
        expect(nextOpenReminderMinutes(items, listDayKey, at10)).toBe(14 * 60);
    });
    it('for other calendar days uses earliest time', () => {
        const items = [
            row({ id: 'a', title: 'x', done: false, sortIndex: 0, reminderMinutes: 14 * 60 }),
            row({ id: 'b', title: 'y', done: false, sortIndex: 1, reminderMinutes: 9 * 60 }),
        ];
        expect(nextOpenReminderMinutes(items, '2099-06-01', new Date())).toBe(9 * 60);
    });
});
