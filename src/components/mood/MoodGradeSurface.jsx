import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Renders solid **`mood`** fill or **135° Bloom gradient** (`mood` → `moodGradientMid` @ 70% → **`moodBloomAccent`**) — **`moodGradeColorStyle`**.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getMoodColor } from '../../utils';
import { getMoodBloomGradientOpaque, getMoodBloomGradientSurface, } from '../../theme/moodGradeBloom';
export const MoodGradeSurface = React.memo(function MoodGradeSurface({ grade, moodGradeColorStyle, isDark, variant = 'opaque', style, children, }) {
    const solid = useMemo(() => ({ backgroundColor: getMoodColor(grade) }), [grade]);
    const grad = useMemo(() => {
        return variant === 'surface'
            ? getMoodBloomGradientSurface(grade, isDark)
            : getMoodBloomGradientOpaque(grade, isDark);
    }, [grade, isDark, variant]);
    const gradientPointerEvents = children ? 'box-none' : 'none';
    if (moodGradeColorStyle === 'solid') {
        return (_jsx(View, { style: [styles.clip, style, solid], pointerEvents: "box-none", children: children }));
    }
    return (_jsx(LinearGradient, { colors: [...grad.colors], locations: [...grad.locations], start: grad.start, end: grad.end, style: [styles.clip, style], pointerEvents: gradientPointerEvents, children: children }));
});
const styles = StyleSheet.create({
    clip: { overflow: 'hidden' },
});
