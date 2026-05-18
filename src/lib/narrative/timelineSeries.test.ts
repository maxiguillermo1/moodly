/**
 * @fileoverview Phase ratio classification tests.
 * @module lib/narrative/timelineSeries.test
 */

import { classifyPhase } from './timelineSeries';

describe('classifyPhase', () => {
  it('labels sparse ultra-low activity', () => {
    expect(
      classifyPhase({
        spanDays: 14,
        activeDays: 1,
        moodDays: 1,
        journalDays: 0,
        sumMoodRank: 0,
        moodSamples: 0,
        weekendActive: 0,
        weekendTotal: 4,
        weekdayActive: 1,
        weekdayTotal: 10,
      })
    ).toBe('sparse');
  });

  it('labels reflective when journal density is high', () => {
    expect(
      classifyPhase({
        spanDays: 14,
        activeDays: 8,
        moodDays: 8,
        journalDays: 6,
        sumMoodRank: 10,
        moodSamples: 8,
        weekendActive: 2,
        weekendTotal: 4,
        weekdayActive: 6,
        weekdayTotal: 10,
      })
    ).toBe('reflective');
  });

  it('labels high_activity when most days carry activity', () => {
    expect(
      classifyPhase({
        spanDays: 14,
        activeDays: 10,
        moodDays: 10,
        journalDays: 1,
        sumMoodRank: 20,
        moodSamples: 10,
        weekendActive: 3,
        weekendTotal: 4,
        weekdayActive: 7,
        weekdayTotal: 10,
      })
    ).toBe('high_activity');
  });
});
