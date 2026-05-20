/**
 * @fileoverview Native build metadata for About / diagnostics (no secrets).
 * @module config/releaseMetadata
 */

import Constants from 'expo-constants';
import { APP_RELEASE_VERSION } from '../constants/app';

export type ReleaseMetadata = {
  appVersion: string;
  nativeAppVersion: string | null;
  nativeBuildVersion: string | null;
  appVariant: string | null;
  bundleIdentifier: string | null;
  androidPackage: string | null;
};

export function getReleaseMetadata(): ReleaseMetadata {
  const extra = Constants.expoConfig?.extra as { appVariant?: string } | undefined;
  return {
    appVersion: APP_RELEASE_VERSION,
    nativeAppVersion: Constants.nativeAppVersion ?? null,
    nativeBuildVersion: Constants.nativeBuildVersion ?? null,
    appVariant: extra?.appVariant ?? null,
    bundleIdentifier: Constants.expoConfig?.ios?.bundleIdentifier ?? null,
    androidPackage: Constants.expoConfig?.android?.package ?? null,
  };
}

/** User-facing About string, e.g. `0.6.0 (Build 1)`. */
export function formatReleaseVersionLine(meta: ReleaseMetadata = getReleaseMetadata()): string {
  const build = meta.nativeBuildVersion;
  if (build && build !== meta.appVersion) {
    return `${meta.appVersion} (${build})`;
  }
  return meta.appVersion;
}
