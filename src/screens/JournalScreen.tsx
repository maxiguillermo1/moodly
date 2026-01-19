/**
 * @fileoverview Journal screen - Scrollable timeline of all entries
 * @module screens/JournalScreen
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MoodEntry, MoodGrade } from '../types';
import { ScreenHeader, MoodPicker, MoodBadge } from '../components';
import {
  getEntriesSortedDesc,
  upsertEntry,
  deleteEntry,
} from '../data';
import { getRelativeDayLabel, formatDateForDisplay } from '../lib/utils/date';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function JournalScreen() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const [editMood, setEditMood] = useState<MoodGrade | null>(null);
  const [editNote, setEditNote] = useState('');

  const loadEntries = useCallback(async () => {
    const sorted = await getEntriesSortedDesc();
    setEntries((prev) => (prev === sorted ? prev : sorted));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleTapEntry = useCallback((entry: MoodEntry) => {
    setEditingEntry(entry);
    setEditMood(entry.mood);
    setEditNote(entry.note);
  }, []);

  const handleLongPressEntry = useCallback((entry: MoodEntry) => {
    Alert.alert(
      'Delete Entry',
      `Delete your entry for ${formatDateForDisplay(entry.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEntry(entry.date);
            loadEntries();
          },
        },
      ]
    );
  }, [loadEntries]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingEntry || !editMood) return;

    await upsertEntry({
      ...editingEntry,
      mood: editMood,
      note: editNote.trim(),
      updatedAt: Date.now(),
    });

    setEditingEntry(null);
    loadEntries();
  }, [editMood, editNote, editingEntry, loadEntries]);

  const keyExtractor = useCallback((item: MoodEntry) => item.date, []);

  const renderEntry = useCallback(({ item }: { item: MoodEntry }) => {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleTapEntry(item)}
        onLongPress={() => handleLongPressEntry(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.rowTitle}>{getRelativeDayLabel(item.date)}</Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {item.note || 'No note'}
          </Text>
        </View>

        <MoodBadge grade={item.mood} size="sm" />
      </TouchableOpacity>
    );
  }, [handleLongPressEntry, handleTapEntry]);

  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📔</Text>
        <Text style={styles.emptyTitle}>Your Journal is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Start tracking your mood on the Today tab to see your entries here
        </Text>
      </View>
    );
  }, []);

  const listContentStyle = useMemo(
    () => [styles.listContent, entries.length === 0 && styles.emptyContainer],
    [entries.length]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Journal" />

      <FlatList
        data={entries}
        keyExtractor={keyExtractor}
        renderItem={renderEntry}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={listContentStyle as any}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={12}
        windowSize={7}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={50}
      />

      {/* Edit Modal */}
      <Modal
        visible={editingEntry !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingEntry(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditingEntry(null)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingEntry ? formatDateForDisplay(editingEntry.date) : ''}
            </Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <MoodPicker selectedMood={editMood} onSelect={setEditMood} />

            <View style={styles.modalNoteSection}>
              <Text style={styles.modalNoteLabel}>NOTE</Text>
              <TextInput
                style={styles.modalNoteInput}
                placeholder="What made this day special?"
                placeholderTextColor={colors.system.tertiaryLabel}
                value={editNote}
                onChangeText={setEditNote}
                maxLength={200}
                multiline
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.system.background,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  rowLeft: {
    flex: 1,
    marginRight: spacing[3],
  },
  rowTitle: {
    ...typography.headline,
    color: colors.system.label,
  },
  rowSubtitle: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    marginTop: 2,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing[10],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...typography.title2,
    color: colors.system.label,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.system.secondaryLabel,
    textAlign: 'center',
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.system.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.system.separator,
    backgroundColor: colors.system.secondaryBackground,
  },
  modalCancel: {
    ...typography.body,
    color: colors.system.secondaryLabel,
  },
  modalTitle: {
    ...typography.headline,
    color: colors.system.label,
  },
  modalSave: {
    ...typography.body,
    color: colors.system.blue,
    fontWeight: '600',
  },
  modalContent: {
    padding: spacing[4],
  },
  modalNoteSection: {
    marginTop: spacing[6],
  },
  modalNoteLabel: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  modalNoteInput: {
    ...typography.body,
    color: colors.system.label,
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
