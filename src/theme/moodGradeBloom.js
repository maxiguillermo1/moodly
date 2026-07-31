import { mood, moodBloomAccent, moodGradientMid } from './colors';
export function getMoodBloomGradientOpaque(grade, _isDark) {
    return {
        colors: [mood[grade], moodGradientMid[grade], moodBloomAccent],
        locations: [0, 0.7, 1],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
    };
}
/** Same ramps as opaque; picker chips sit on grouped fills so we keep specs identical unless tone is revisited later. */
export function getMoodBloomGradientSurface(grade, isDark) {
    return getMoodBloomGradientOpaque(grade, isDark);
}
