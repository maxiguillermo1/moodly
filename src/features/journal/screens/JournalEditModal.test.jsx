import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Journal edit sheet: save guard when mood missing (a11y + rapid tap).
 * @module features/journal/screens/JournalEditModal.test
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppThemeProvider } from '../../../theme';
import { JournalEditModal } from './JournalEditModal';
describe('JournalEditModal', () => {
    const baseEntry = {
        date: '2026-06-01',
        mood: 'A',
        note: 'hi',
        createdAt: 1,
        updatedAt: 1,
    };
    it('disables save when no mood is selected and exposes disabled state to a11y', async () => {
        const onSave = jest.fn();
        const { getByLabelText } = render(_jsx(AppThemeProvider, { children: _jsx(JournalEditModal, { editingEntry: baseEntry, editMood: null, editNote: "x", setEditMood: jest.fn(), setEditNote: jest.fn(), onCancel: jest.fn(), onSave: onSave }) }));
        await waitFor(() => expect(getByLabelText('Save, disabled')).toBeTruthy());
        const save = getByLabelText('Save, disabled');
        fireEvent.press(save);
        expect(onSave).not.toHaveBeenCalled();
    });
});
