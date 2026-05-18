/**
 * @fileoverview MoodPicker accessibility surface (roles, labels, selection).
 * @module components/mood/MoodPicker.test
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { MoodPicker } from './MoodPicker';

function wrap(ui: React.ReactElement) {
  return render(<AppThemeProvider>{ui}</AppThemeProvider>);
}

describe('MoodPicker', () => {
  it('renders six mood controls with button role and descriptive labels', async () => {
    const onSelect = jest.fn();
    const { getAllByRole, getByRole } = wrap(<MoodPicker selectedMood={null} onSelect={onSelect} title="How was your day?" />);

    await waitFor(() => expect(getAllByRole('button').length).toBeGreaterThanOrEqual(6));
    expect(getByRole('header')).toBeTruthy();
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(getByRole('button', { name: /Mood A, Very good/ })).toBeTruthy();
  });

  it('marks selected mood for VoiceOver', async () => {
    const onSelect = jest.fn();
    const { getByRole } = wrap(<MoodPicker selectedMood="B" onSelect={onSelect} compact />);
    await waitFor(() => expect(getByRole('button', { name: /B, Good, selected/ })).toBeTruthy());
  });
});
