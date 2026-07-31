/**
 * @fileoverview **Narrative timeline** façade — read-only over Daily Activity (bounded window).
 * @module data/repositories/narrativeRepository
 */
import { addLocalDays } from '../../lib/insights/periodBounds';
import { runNarrativeEngine, stampNarrativeBundle } from '../../lib/narrative/narrativeEngine';
import { isValidLocalCalendarDayKey } from '../../lib/utils/date';
import { ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { getDayActivityRange, MAX_DAILY_ACTIVITY_RANGE_DAYS } from './dailyActivityRepository';
const DEFAULT_RANGE_DAYS = 126;
export const narrativeRepository = {
    /**
     * Builds a **NarrativeBundle** for `[anchor - (rangeDays-1), anchor]` using `getDayActivityRange`.
     */
    async getNarrativeBundle(anchorDay, options) {
        await ensureLocalPersistenceReady();
        if (!isValidLocalCalendarDayKey(anchorDay)) {
            const window = { start: anchorDay, end: anchorDay };
            return stampNarrativeBundle({
                window,
                composedAt: 0,
                chapters: [],
                artifacts: [],
                digest: 'nar1.0',
            }, Date.now());
        }
        const rawRange = options?.rangeDays ?? DEFAULT_RANGE_DAYS;
        const rangeDays = Math.min(Math.max(Math.floor(rawRange), 14), MAX_DAILY_ACTIVITY_RANGE_DAYS);
        const start = addLocalDays(anchorDay, -(rangeDays - 1));
        const window = { start, end: anchorDay };
        const activities = await getDayActivityRange(start, anchorDay);
        const bundle = runNarrativeEngine({ window, activities });
        return stampNarrativeBundle(bundle, Date.now());
    },
};
