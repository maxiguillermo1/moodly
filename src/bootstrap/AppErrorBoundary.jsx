import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Catches unexpected React render errors so the app can recover without a blank screen.
 * @module bootstrap/AppErrorBoundary
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { logger } from '../security';
import { systemLight } from '../theme/systemPalettes';
import { brand } from '../theme/colors';
export class AppErrorBoundary extends React.Component {
    constructor() {
        super(...arguments);
        this.state = { hasError: false, retryKey: 0 };
        this.handleRetry = () => {
            this.setState((prev) => ({ hasError: false, retryKey: prev.retryKey + 1 }));
        };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error) {
        logger.error('app.boundary.render', { name: error.name });
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs(View, { style: styles.container, children: [_jsxs(View, { accessibilityRole: "alert", accessible: true, accessibilityLabel: "An error occurred in the app. Try again to continue.", children: [_jsx(Text, { style: styles.title, children: "Something went wrong" }), _jsx(Text, { style: styles.subtitle, children: "You can try again. Your data is stored on this device." })] }), _jsx(Pressable, { onPress: this.handleRetry, style: styles.button, accessibilityRole: "button", accessibilityLabel: "Try again", children: _jsx(Text, { style: styles.buttonLabel, children: "Try again" }) })] }));
        }
        return _jsx(React.Fragment, { children: this.props.children }, this.state.retryKey);
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
