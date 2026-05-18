/**
 * @fileoverview Catches unexpected React render errors so the app can recover without a blank screen.
 * @module app/AppErrorBoundary
 */

import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { logger } from '../security';
import { systemLight } from '../theme/systemPalettes';
import { brand } from '../theme/colors';

type Props = { children: ReactNode };

type State = { hasError: boolean; retryKey: number };

export class AppErrorBoundary extends React.Component<Props, State> {
  override state: State = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error) {
    logger.error('app.boundary.render', { name: error.name });
  }

  private handleRetry = () => {
    this.setState((prev) => ({ hasError: false, retryKey: prev.retryKey + 1 }));
  };

  override render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View accessibilityRole="alert" accessible accessibilityLabel="An error occurred in the app. Try again to continue.">
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>You can try again. Your data is stored on this device.</Text>
          </View>
          <Pressable
            onPress={this.handleRetry}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: systemLight.secondaryBackground,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: systemLight.label,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: systemLight.secondaryLabel,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: brand.primary,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
