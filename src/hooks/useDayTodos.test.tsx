/**
 * @fileoverview Hook tests: serialized Reminders mutations + focus reload.
 * @module hooks/useDayTodos.test
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetDayTodosStorageSessionStateForTests } from '../storage';
import { useDayTodos } from './useDayTodos';

const mockUseIsFocused = jest.fn(() => true);

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockUseIsFocused(),
}));

describe('useDayTodos', () => {
  const day = '2026-05-20';

  beforeEach(async () => {
    mockUseIsFocused.mockReturnValue(true);
    await AsyncStorage.clear();
    resetDayTodosStorageSessionStateForTests();
  });

  it('loads an empty list when focused', async () => {
    const { result } = renderHook(() => useDayTodos(day));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items).toEqual([]);
  });

  it('serializes parallel adds so both tasks persist', async () => {
    const { result } = renderHook(() => useDayTodos(day));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await Promise.all([result.current.add('Alpha'), result.current.add('Bravo')]);
    });

    await waitFor(() => expect(result.current.items.length).toBe(2));
    const titles = [...result.current.items].map((i) => i.title).sort();
    expect(titles).toEqual(['Alpha', 'Bravo']);
  });

  it('does not fetch until the screen is focused', async () => {
    mockUseIsFocused.mockReturnValue(false);
    const { result, rerender } = renderHook((d: string) => useDayTodos(d), { initialProps: day });
    expect(result.current.loaded).toBe(false);

    mockUseIsFocused.mockReturnValue(true);
    rerender(day);

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items).toEqual([]);
  });

  it('hydrates from session cache without waiting for InteractionManager', async () => {
    const { addTaskForDate, peekDayTodosFromSessionCache } = require('../data/storage/tasksStorage') as typeof import('../data/storage/tasksStorage');
    await addTaskForDate(day, 'Cached task');
    expect(peekDayTodosFromSessionCache(day)?.map((t) => t.title)).toEqual(['Cached task']);

    const { result } = renderHook(() => useDayTodos(day));
    expect(result.current.loaded).toBe(true);
    expect(result.current.items.map((t) => t.title)).toEqual(['Cached task']);
  });});
