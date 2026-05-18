import { AccessibilityInfo } from 'react-native';
import { formatDayCellA11yLabel, formatMoodA11yLabel, ordinal, announceForAccessibility } from './accessibility';

describe('accessibility helpers', () => {
  it('formats mood grades with human-readable meaning', () => {
    expect(formatMoodA11yLabel('A+')).toBe('A plus, Best day');
    expect(formatMoodA11yLabel('C')).toBe('C, Neutral');
  });

  it('formats day cells with date, state, mood, and note presence', () => {
    expect(
      formatDayCellA11yLabel({
        weekdayIndex0: 1,
        monthName: 'May',
        day: 11,
        year: 2026,
        mood: 'A',
        hasNote: true,
        isToday: true,
        isSelected: true,
      })
    ).toBe('Monday, May 11th, 2026. Today. Selected. Mood A, Very good. Has note.');
  });

  it('keeps ordinal suffixes readable', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(23)).toBe('23rd');
  });

  it('announceForAccessibility skips empty strings', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    announceForAccessibility('   ');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
