/**
 * @fileoverview Today habit strip: no marked-day count reads (Habits screen owns that contract).
 * @module hooks/useTodayHabitStripModel.test
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as habitSelections from '../data/storage/habitSelectionsStorage';
import * as settingsStorage from '../data/storage/settingsStorage';
import * as storage from '../storage';
import { AppThemeProvider } from '../theme';
import { resetPersistenceBootstrapForTests } from '../data/persistence/bootstrap';
import { useTodayHabitStripModel } from './useTodayHabitStripModel';

const mockUseIsFocused = jest.fn(() => true);

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockUseIsFocused(),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function TestWrapper({ children }: { children: React.ReactNode }): React.ReactElement {
  return <AppThemeProvider>{children}</AppThemeProvider>;
}

describe('useTodayHabitStripModel', () => {
  const day = '2026-05-20';

  beforeEach(async () => {
    mockUseIsFocused.mockReturnValue(true);
    await AsyncStorage.clear();
    resetPersistenceBootstrapForTests();
    storage.resetHabitSelectionsStorageSessionStateForTests();
    storage.resetHabitTrackingStorageSessionStateForTests();
    await settingsStorage.setHabitsEnabled(true);
  });

  it('never calls getHabitMarkedDayCounts on focus load', async () => {
    const spy = jest.spyOn(habitSelections, 'getHabitMarkedDayCounts');
    const { result } = renderHook(() => useTodayHabitStripModel(day), { wrapper: TestWrapper });
    await act(async () => {
      await waitFor(() => expect(result.current.trackedReady).toBe(true));
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('never calls getHabitMarkedDayCounts after a successful toggle', async () => {
    const spy = jest.spyOn(habitSelections, 'getHabitMarkedDayCounts');
    const { result } = renderHook(() => useTodayHabitStripModel(day), { wrapper: TestWrapper });
    await act(async () => {
      await waitFor(() => expect(result.current.trackedReady).toBe(true));
    });
    spy.mockClear();

    await act(async () => {
      await result.current.onToggle('workout');
    });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
