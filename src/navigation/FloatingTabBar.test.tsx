/**
 * @fileoverview FloatingTabBar press + navigation wiring.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { AppThemeProvider } from '../theme';
import { TabBarAutoHideProvider } from './TabBarAutoHideContext';
import { FloatingTabBar } from './FloatingTabBar';

const Tab = createBottomTabNavigator();

function Screen({ label }: { label: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text testID={`screen-${label}`}>{`${label} screen`}</Text>
    </View>
  );
}

function Harness({ initialRoute = 'Today' }: { initialRoute?: 'Calendar' | 'Today' | 'Journal' }) {
  return (
    <AppThemeProvider>
      <TabBarAutoHideProvider>
        <NavigationContainer>
          <Tab.Navigator
            initialRouteName={initialRoute}
            tabBar={(props) => <FloatingTabBar {...props} />}
            screenOptions={{ headerShown: false, animation: 'none' }}
          >
            <Tab.Screen name="Calendar">{() => <Screen label="Calendar" />}</Tab.Screen>
            <Tab.Screen name="Today">{() => <Screen label="Today" />}</Tab.Screen>
            <Tab.Screen name="Journal">{() => <Screen label="Journal" />}</Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </TabBarAutoHideProvider>
    </AppThemeProvider>
  );
}

describe('FloatingTabBar', () => {
  it('switches tabs when pressing another tab label', () => {
    const { getByLabelText, getByTestId } = render(<Harness initialRoute="Today" />);

    expect(getByTestId('screen-Today')).toBeTruthy();

    fireEvent.press(getByLabelText('Journal tab'));

    expect(getByTestId('screen-Journal')).toBeTruthy();
  });

  it('switches to Calendar from Today', () => {
    const { getByLabelText, getByTestId } = render(<Harness initialRoute="Today" />);

    fireEvent.press(getByLabelText('Calendar tab'));

    expect(getByTestId('screen-Calendar')).toBeTruthy();
  });

  it('switches Calendar → Today → Journal in sequence', () => {
    const { getByLabelText, getByTestId } = render(<Harness initialRoute="Calendar" />);

    expect(getByTestId('screen-Calendar')).toBeTruthy();

    fireEvent.press(getByLabelText('Today tab'));
    expect(getByTestId('screen-Today')).toBeTruthy();

    fireEvent.press(getByLabelText('Journal tab'));
    expect(getByTestId('screen-Journal')).toBeTruthy();
  });

  it('switches Journal → Calendar', () => {
    const { getByLabelText, getByTestId } = render(<Harness initialRoute="Journal" />);

    fireEvent.press(getByLabelText('Calendar tab'));
    expect(getByTestId('screen-Calendar')).toBeTruthy();
  });

  it('rapid switching does not crash', () => {
    const { getByLabelText, getByTestId } = render(<Harness initialRoute="Today" />);

    for (let i = 0; i < 12; i += 1) {
      fireEvent.press(getByLabelText('Calendar tab'));
      fireEvent.press(getByLabelText('Journal tab'));
      fireEvent.press(getByLabelText('Today tab'));
    }

    expect(getByTestId('screen-Today')).toBeTruthy();
  });
});
