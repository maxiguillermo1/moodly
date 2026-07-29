/**
 * @fileoverview Shows optional cloud backup prompt once the user has mood entries.
 * @module features/account/components/AccountBackupPromptHost
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CloudBackupPromptModal } from './CloudBackupPromptModal';
import { useAuth } from '@/hooks/useAuth';
import type { RootStackParamList } from '@/navigation/types';
import { getMoodStats, getSettings, setCloudBackupPromptDismissed } from '@/storage';

const MIN_ENTRIES_FOR_PROMPT = 1;

export function AccountBackupPromptHost(): React.ReactElement | null {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cloudEnabled, initialized, user } = useAuth();
  const [visible, setVisible] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!cloudEnabled || !initialized || user || checkedRef.current) return;

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          const [settings, stats] = await Promise.all([getSettings(), getMoodStats()]);
          if (cancelled || checkedRef.current) return;
          checkedRef.current = true;

          if (settings.cloudBackupPromptDismissed) return;
          if (settings.localOnlyMode) return;
          if (stats.totalEntries < MIN_ENTRIES_FOR_PROMPT) return;

          setVisible(true);
        } catch {
          checkedRef.current = true;
        }
      })();
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [cloudEnabled, initialized, user]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    await setCloudBackupPromptDismissed(true);
  }, []);

  const handleBackUp = useCallback(() => {
    setVisible(false);
    void setCloudBackupPromptDismissed(true);
    navigation.navigate('Account');
  }, [navigation]);

  if (!cloudEnabled) return null;

  return (
    <CloudBackupPromptModal
      visible={visible}
      onBackUp={handleBackUp}
      onNotNow={() => {
        void dismiss();
      }}
    />
  );
}
