/**
 * Bloom gradient (**135°**) per design spec: each grade {@link mood} at **top-left (~0%)**,
 * **`moodGradientMid`** at **70%**, shared **`moodBloomAccent`** at **bottom-right (100%)**.
 *
 * Mirrors CSS `linear-gradient(135deg, …)` using `LinearGradient` **TL → BR** (`start 0,0` → `end 1,1`).
 */
import type { MoodGrade } from '../types';
import { mood, moodBloomAccent, moodGradientMid } from './colors';

export function getMoodBloomGradientOpaque(grade: MoodGrade, _isDark: boolean) {
  return {
    colors: [mood[grade], moodGradientMid[grade], moodBloomAccent] as const,
    locations: [0, 0.7, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  };
}

/** Same ramps as opaque; picker chips sit on grouped fills so we keep specs identical unless tone is revisited later. */
export function getMoodBloomGradientSurface(grade: MoodGrade, isDark: boolean) {
  return getMoodBloomGradientOpaque(grade, isDark);
}
