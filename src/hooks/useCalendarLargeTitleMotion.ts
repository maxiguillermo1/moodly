/**
 * @fileoverview Reanimated scroll-driven collapse for the large month title (UI thread).
 * @module hooks/useCalendarLargeTitleMotion
 */

import {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const COLLAPSE_RANGE = 90;
const TITLE_TRANSLATE_Y = -16;
const TITLE_SCALE_MIN = 0.82;

export function useCalendarLargeTitleMotion(reduceMotion: boolean) {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const largeTitleStyle = useAnimatedStyle(() => {
    const t = Math.min(Math.max(scrollY.value / COLLAPSE_RANGE, 0), 1);
    const opacity = 1 - t;
    if (reduceMotion) return { opacity: 1 };
    return {
      opacity,
      transform: [
        { translateY: interpolate(t, [0, 1], [0, TITLE_TRANSLATE_Y], Extrapolate.CLAMP) },
        { scale: interpolate(t, [0, 1], [1, TITLE_SCALE_MIN], Extrapolate.CLAMP) },
      ],
    };
  }, [reduceMotion]);

  return { scrollY, scrollHandler, largeTitleStyle };
}
