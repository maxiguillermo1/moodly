import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview iOS-style mood picker
 * @module components/mood/MoodPicker
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAllMoodConfigs } from '../../utils';
import { colors, spacing, borderRadius, useAppTheme } from '../../theme';
import { MoodGradeSurface } from './MoodGradeSurface';
import { Touchable } from '../../ui/Touchable';
import { haptics } from '../../system/haptics';
import { announceForAccessibility, formatMoodA11yLabel } from '../../system/accessibility';
function MoodPickerInner({ selectedMood, onSelect, title = 'How was your day?', compact = false, }) {
    const { system, moodGradeColorStyle, isDark } = useAppTheme();
    const moods = useMemo(() => getAllMoodConfigs(), []);
    const styles = useMemo(() => StyleSheet.create({
        container: {
            marginTop: spacing[0],
            marginBottom: spacing[1],
        },
        title: {
            fontSize: 13,
            lineHeight: 17,
            fontWeight: '600',
            letterSpacing: -0.15,
            color: system.label,
            textAlign: 'center',
            marginBottom: spacing[2],
        },
        grid: {
            alignSelf: 'stretch',
            width: '100%',
        },
        gridRow: {
            flexDirection: 'row',
            alignSelf: 'stretch',
            gap: spacing[1],
        },
        gridRowSpaced: {
            marginTop: spacing[1],
        },
        /** Flex shim so Reanimated Pressable always receives a real column width (avoids clip on small screens). */
        cell: {
            flex: 1,
            minWidth: 0,
        },
        moodButton: {
            width: '100%',
            minHeight: 36,
            paddingVertical: 5,
            paddingHorizontal: spacing[0],
            borderRadius: borderRadius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: system.gray6,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: system.separator,
        },
        grade: {
            fontSize: 13,
            lineHeight: 16,
            fontWeight: '600',
            letterSpacing: -0.2,
            textAlign: 'center',
        },
        segmentedContainer: {
            flexDirection: 'row',
            backgroundColor: system.secondaryFill,
            borderRadius: borderRadius.md,
            padding: 2,
            gap: 2,
        },
        segment: {
            flex: 1,
            height: 30,
            borderRadius: borderRadius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
        },
        segmentSelected: {},
        segmentText: {
            fontSize: 12,
            lineHeight: 15,
            fontWeight: '600',
            letterSpacing: -0.08,
        },
        moodButtonSelected: {
            borderWidth: 1.5,
        },
    }), [system]);
    if (compact) {
        return (_jsx(View, { style: styles.segmentedContainer, children: moods.map((mood) => {
                const isSelected = selectedMood === mood.grade;
                return (_jsxs(Touchable, { trackScrollInteraction: false, style: [
                        styles.segment,
                        isSelected ? styles.segmentSelected : null,
                        isSelected && moodGradeColorStyle === 'solid'
                            ? { backgroundColor: colors.moodBackground[mood.grade] }
                            : null,
                        isSelected && moodGradeColorStyle === 'gradient' ? { backgroundColor: 'transparent' } : null,
                    ], hitSlop: { top: 8, bottom: 8, left: 4, right: 4 }, onPress: () => {
                        haptics.select();
                        onSelect(mood.grade);
                        announceForAccessibility(`Mood ${formatMoodA11yLabel(mood.grade)} selected`);
                    }, accessibilityRole: "button", accessibilityLabel: `Mood ${formatMoodA11yLabel(mood.grade)}${isSelected ? ', selected' : ''}`, accessibilityHint: isSelected ? 'Currently selected' : 'Selects this mood', accessibilityState: { selected: isSelected, checked: isSelected }, children: [isSelected && moodGradeColorStyle === 'gradient' ? (_jsx(MoodGradeSurface, { grade: mood.grade, moodGradeColorStyle: moodGradeColorStyle, isDark: isDark, variant: "surface", style: StyleSheet.absoluteFillObject })) : null, _jsx(Text, { style: [styles.segmentText, { color: isSelected ? mood.color : system.secondaryLabel, zIndex: 1 }], allowFontScaling: true, maxFontSizeMultiplier: 1.28, children: mood.grade })] }, mood.grade));
            }) }));
    }
    const renderGradeCell = (mood) => {
        const isSelected = selectedMood === mood.grade;
        return (_jsx(View, { style: styles.cell, children: _jsxs(Touchable, { trackScrollInteraction: false, style: [
                    styles.moodButton,
                    isSelected ? styles.moodButtonSelected : null,
                    isSelected && moodGradeColorStyle === 'solid'
                        ? { borderColor: mood.color, backgroundColor: colors.moodBackground[mood.grade] }
                        : null,
                    isSelected && moodGradeColorStyle === 'gradient'
                        ? { borderColor: mood.color, backgroundColor: 'transparent' }
                        : null,
                ], hitSlop: { top: 8, bottom: 8, left: 2, right: 2 }, onPress: () => {
                    haptics.select();
                    onSelect(mood.grade);
                    announceForAccessibility(`Mood ${formatMoodA11yLabel(mood.grade)} selected`);
                }, accessibilityRole: "button", accessibilityLabel: `Mood ${formatMoodA11yLabel(mood.grade)}${isSelected ? ', selected' : ''}`, accessibilityHint: isSelected ? 'Currently selected' : 'Selects this mood', accessibilityState: { selected: isSelected, checked: isSelected }, children: [isSelected && moodGradeColorStyle === 'gradient' ? (_jsx(MoodGradeSurface, { grade: mood.grade, moodGradeColorStyle: moodGradeColorStyle, isDark: isDark, variant: "surface", style: StyleSheet.absoluteFillObject })) : null, _jsx(Text, { style: [styles.grade, { color: mood.color, zIndex: 1 }], numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.75, allowFontScaling: true, maxFontSizeMultiplier: 1.25, children: mood.grade })] }) }, mood.grade));
    };
    return (_jsxs(View, { style: styles.container, children: [title ? (_jsx(Text, { style: styles.title, allowFontScaling: true, maxFontSizeMultiplier: 1.3, accessibilityRole: "header", children: title })) : null, _jsxs(View, { style: styles.grid, children: [_jsx(View, { style: styles.gridRow, children: moods.slice(0, 3).map(renderGradeCell) }), _jsx(View, { style: [styles.gridRow, styles.gridRowSpaced], children: moods.slice(3, 6).map(renderGradeCell) })] })] }));
}
/** Memoized: mood taps should not rebuild the full picker when only `selectedMood` changes. */
export const MoodPicker = React.memo(MoodPickerInner);
