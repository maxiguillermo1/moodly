/**
 * @fileoverview localJournalDataProbe unit tests.
 */
import { deviceHasLocalJournalData } from './localJournalDataProbe';
jest.mock('../storage/moodStorage', () => ({
    getAllEntries: jest.fn(async () => ({})),
}));
jest.mock('../storage/goalsStorage', () => ({
    getGoals: jest.fn(async () => []),
}));
jest.mock('../storage/habitSelectionsStorage', () => ({
    getHabitSelectionsRecordSnapshot: jest.fn(async () => ({})),
}));
jest.mock('../storage/tasksStorage', () => ({
    getTaskDayIndexSnapshot: jest.fn(async () => []),
}));
const moodStorage = jest.requireMock('../storage/moodStorage');
const goalsStorage = jest.requireMock('../storage/goalsStorage');
const habitStorage = jest.requireMock('../storage/habitSelectionsStorage');
const tasksStorage = jest.requireMock('../storage/tasksStorage');
describe('deviceHasLocalJournalData', () => {
    beforeEach(() => {
        moodStorage.getAllEntries.mockResolvedValue({});
        goalsStorage.getGoals.mockResolvedValue([]);
        habitStorage.getHabitSelectionsRecordSnapshot.mockResolvedValue({});
        tasksStorage.getTaskDayIndexSnapshot.mockResolvedValue([]);
    });
    it('returns false when all domains are empty', async () => {
        await expect(deviceHasLocalJournalData()).resolves.toBe(false);
    });
    it('returns true when mood entries exist', async () => {
        moodStorage.getAllEntries.mockResolvedValue({
            '2026-05-01': { date: '2026-05-01', mood: 'A', note: '', createdAt: 1, updatedAt: 1 },
        });
        await expect(deviceHasLocalJournalData()).resolves.toBe(true);
    });
    it('returns true when goals exist', async () => {
        goalsStorage.getGoals.mockResolvedValue([{ id: 'g1' }]);
        await expect(deviceHasLocalJournalData()).resolves.toBe(true);
    });
});
