/**
 * @fileoverview Open HTTPS/mailto links reliably (iOS may reject `canOpenURL` before `openURL`).
 * @module lib/utils/openExternalUrl
 */

import { Alert, Linking } from 'react-native';
import { logger } from '../security/logger';

/** Tries `openURL` first, then `canOpenURL` + retry. Never logs the URL. */
export async function openExternalUrl(url: string, label: string): Promise<void> {
  try {
    await Linking.openURL(url);
    return;
  } catch {
    try {
      if (!(await Linking.canOpenURL(url))) {
        Alert.alert(label, 'This link is not available on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      logger.warn('link.open.failed', { label });
      Alert.alert(label, 'Could not open the link. Try again later.');
    }
  }
}
