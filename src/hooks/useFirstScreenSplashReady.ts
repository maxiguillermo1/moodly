/**
 * @fileoverview Signals splash hide when a primary screen has laid out its shell.
 * @module hooks/useFirstScreenSplashReady
 */

import { useCallback } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import { markFirstScreenReady } from '../bootstrap/splashScreen';

/** Attach to the root screen container onLayout — fires once per mount. */
export function useFirstScreenSplashReady(source: string): (e: LayoutChangeEvent) => void {
  return useCallback(
    (e: LayoutChangeEvent) => {
      if (e.nativeEvent.layout.height > 0) {
        markFirstScreenReady(source);
      }
    },
    [source]
  );
}
