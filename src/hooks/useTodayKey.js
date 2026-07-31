/**
 * @fileoverview Local-day "today key" observer (dev/prod).
 *
 * Goals:
 * - Fix "app open across midnight" staleness without polling.
 * - One timer scheduled to next local midnight.
 * - Resync on AppState active (foreground) to handle background > midnight.
 * - No state updates after unmount.
 *
 * Constraints:
 * - Local-day keys only (YYYY-MM-DD from local calendar components).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { toLocalDayKey, msUntilNextLocalMidnight } from '../utils';
export function useTodayKey() {
    const mountedRef = useRef(true);
    const timerRef = useRef(null);
    const [todayKey, setTodayKey] = useState(() => toLocalDayKey(new Date()));
    const todayKeyRef = useRef(todayKey);
    todayKeyRef.current = todayKey;
    const schedule = useCallback((now) => {
        if (timerRef.current)
            clearTimeout(timerRef.current);
        const ms = msUntilNextLocalMidnight(now);
        timerRef.current = setTimeout(() => {
            if (!mountedRef.current)
                return;
            setTodayKey(toLocalDayKey(new Date()));
            // Reschedule for next midnight.
            schedule(new Date());
        }, ms);
    }, []);
    useEffect(() => {
        mountedRef.current = true;
        schedule(new Date());
        const sub = AppState.addEventListener('change', (next) => {
            if (next !== 'active')
                return;
            if (!mountedRef.current)
                return;
            const key = toLocalDayKey(new Date());
            // Only update when it actually changed (prevents pointless rerenders).
            setTodayKey((prev) => (prev === key ? prev : key));
            schedule(new Date());
        });
        return () => {
            mountedRef.current = false;
            if (timerRef.current)
                clearTimeout(timerRef.current);
            timerRef.current = null;
            sub.remove();
        };
    }, [schedule]);
    return { todayKey, todayKeyRef };
}
