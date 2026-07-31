/**
 * @fileoverview Tests for Supabase journal wipe.
 * @module cloud/sync/wipeCloudUserJournalData.test
 */
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn(() => ({ delete: mockDelete }));
mockDelete.mockReturnValue({ eq: mockEq });
mockEq.mockResolvedValue({ error: null });
jest.mock('../supabase/client', () => ({
    getSupabaseClient: () => ({ from: mockFrom }),
}));
import { wipeCloudUserJournalData } from './wipeCloudUserJournalData';
describe('wipeCloudUserJournalData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEq.mockResolvedValue({ error: null });
    });
    it('deletes journal rows for each cloud table', async () => {
        await wipeCloudUserJournalData({ id: 'user-abc' });
        expect(mockFrom).toHaveBeenCalledWith('mood_entries');
        expect(mockFrom).toHaveBeenCalledWith('habit_selections');
        expect(mockFrom).toHaveBeenCalledWith('insights_reflection_timing');
        expect(mockEq).toHaveBeenCalledWith('user_id', 'user-abc');
        expect(mockEq.mock.calls.length).toBeGreaterThanOrEqual(8);
    });
    it('throws when a table delete fails', async () => {
        mockEq.mockResolvedValueOnce({ error: { message: 'RLS blocked' } });
        await expect(wipeCloudUserJournalData({ id: 'user-abc' })).rejects.toEqual({
            message: 'RLS blocked',
        });
    });
});
