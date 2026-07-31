/**
 * @fileoverview Repository smoke tests for narrative bundle.
 * @module data/repositories/narrativeRepository.test
 */
describe('narrativeRepository', () => {
    beforeEach(async () => {
        globalThis.__KAIRO_CHAOS__ = undefined;
        jest.resetModules();
        const mod = require('@react-native-async-storage/async-storage');
        await (mod?.default ?? mod).clear();
        const boot = require('../persistence/bootstrap');
        boot.resetPersistenceBootstrapForTests();
        const mood = require('../storage/moodStorage');
        mood.resetEntriesStorageSessionStateForTests();
    });
    it('returns empty narrative for invalid anchor', async () => {
        const { narrativeRepository } = require('./narrativeRepository');
        const b = await narrativeRepository.getNarrativeBundle('invalid');
        expect(b.chapters).toHaveLength(0);
        expect(b.artifacts).toHaveLength(0);
        expect(b.digest).toBe('nar1.0');
    });
});
