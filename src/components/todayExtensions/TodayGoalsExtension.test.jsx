import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Today Goals extension: summary-only contract (no full goal mutations).
 * @module components/todayExtensions/TodayGoalsExtension.test
 *
 * Contract tests intentionally import `goalsStorage` + persistence bootstrap (not the
 * `src/storage` façade) so we can `jest.spyOn` the exact implementations `TodayGoalsExtension`
 * resolves to via the repository barrel.
 */
/* eslint-disable no-restricted-imports */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as goalsImpl from '../../data/storage/goalsStorage';
import { resetPersistenceBootstrapForTests } from '../../data/persistence/bootstrap';
import { TodayGoalsExtension } from './TodayGoalsExtension';
const mockNavigate = jest.fn();
const mockOnBefore = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../theme/ExtensionsPolicyContext', () => ({
    useExtensionsPolicy: () => ({ todayGoalsEnabled: true }),
}));
jest.mock('../../extensions/DayExtensionsHostContext', () => ({
    useDayExtensionsHost: () => ({ onBeforeDetailNavigate: mockOnBefore }),
}));
jest.mock('../../theme', () => ({
    useAppTheme: () => ({
        system: {
            secondaryBackground: '#fff',
            separator: '#ccc',
            label: '#000',
            secondaryLabel: '#666',
            tertiaryLabel: '#999',
            orange: '#f90',
        },
    }),
    borderRadius: { lg: 12 },
    spacing: { 1: 4, 2: 8, 3: 12, 4: 16 },
    typography: {
        subhead: { fontSize: 15 },
        headline: { fontSize: 17, fontWeight: '600' },
        footnote: { fontSize: 13 },
        caption1: { fontSize: 12 },
    },
    sizing: { iconSm: 20 },
}));
jest.mock('../../ui/Touchable', () => {
    const React = require('react');
    const { Pressable } = require('react-native');
    return {
        Touchable: ({ children, onPress, ...rest }) => React.createElement(Pressable, { onPress, accessibilityRole: 'button', ...rest }, children),
    };
});
jest.mock('../../system/haptics', () => ({
    haptics: { select: jest.fn() },
}));
describe('TodayGoalsExtension', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        resetPersistenceBootstrapForTests();
        goalsImpl.resetGoalsStorageSessionStateForTests();
        jest.clearAllMocks();
        jest.spyOn(goalsImpl, 'getTodayGoalSummaries').mockResolvedValue([
            {
                id: 'a',
                title: 'Walk',
                type: 'habit',
                status: 'active',
                category: 'health',
                accentColor: '#f90',
                percent: 40,
                streak: 1,
                completedToday: false,
                loggedDays: 2,
                updatedAt: 1,
            },
        ]);
        jest.spyOn(goalsImpl, 'getGoals');
        jest.spyOn(goalsImpl, 'addGoalProgress');
        jest.spyOn(goalsImpl, 'upsertGoal');
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('loads summaries via getTodayGoalSummaries only', async () => {
        render(_jsx(TodayGoalsExtension, { date: "2026-05-12" }));
        await waitFor(() => expect(goalsImpl.getTodayGoalSummaries).toHaveBeenCalled());
        expect(goalsImpl.getGoals).not.toHaveBeenCalled();
        expect(goalsImpl.addGoalProgress).not.toHaveBeenCalled();
        expect(goalsImpl.upsertGoal).not.toHaveBeenCalled();
    });
    it('navigates to Goals with the host day key', async () => {
        const { getByRole } = render(_jsx(TodayGoalsExtension, { date: "2026-05-20" }));
        await waitFor(() => expect(goalsImpl.getTodayGoalSummaries).toHaveBeenCalled());
        fireEvent.press(getByRole('button'));
        expect(mockNavigate).toHaveBeenCalledWith('Goals', { date: '2026-05-20' });
    });
});
