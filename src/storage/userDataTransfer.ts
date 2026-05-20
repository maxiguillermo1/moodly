/**
 * @fileoverview Settings export/import file helpers (share sheet + document picker).
 * @module storage/userDataTransfer
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { formatDateToISO } from '../lib/utils/date';

export async function shareJsonExport(json: string, filenamePrefix = 'moodly-export'): Promise<void> {
  const filename = `${filenamePrefix}-${formatDateToISO(new Date())}.json`;
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) throw new Error('No writable cache directory');
  const uri = `${baseDir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Moodly data',
    UTI: 'public.json',
  });
}

export async function pickJsonImport(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }
  return FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}
