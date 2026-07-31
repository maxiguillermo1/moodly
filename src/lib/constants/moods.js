/**
 * @fileoverview Mood configuration and helpers
 * @module lib/constants/moods
 */
import { mood as moodColors } from '../../theme';
/** Complete mood configuration with metadata */
export const MOOD_CONFIG = {
    'A+': { grade: 'A+', label: 'Best day', color: moodColors['A+'], emoji: '🌟' },
    'A': { grade: 'A', label: 'Very good', color: moodColors['A'], emoji: '😊' },
    'B': { grade: 'B', label: 'Good', color: moodColors['B'], emoji: '🙂' },
    'C': { grade: 'C', label: 'Neutral', color: moodColors['C'], emoji: '😐' },
    'D': { grade: 'D', label: 'Bad', color: moodColors['D'], emoji: '😕' },
    'F': { grade: 'F', label: 'Very bad', color: moodColors['F'], emoji: '😢' },
};
/** Ordered list of grades (best to worst) */
export const MOOD_GRADES = ['A+', 'A', 'B', 'C', 'D', 'F'];
/** Get config for a specific grade */
export const getMoodConfig = (grade) => MOOD_CONFIG[grade];
/** Get all mood configs in order */
export const getAllMoodConfigs = () => MOOD_GRADES.map(getMoodConfig);
/** Get just the color for a grade */
export const getMoodColor = (grade) => MOOD_CONFIG[grade].color;
/** Get just the label for a grade */
export const getMoodLabel = (grade) => MOOD_CONFIG[grade].label;
