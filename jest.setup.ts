// Jest setup (tests only).
// Keep this file tiny and deterministic.

// AsyncStorage mock (fast, deterministic).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-sqlite', () => require('./src/data/persistence/sqlite/__mocks__/expoSqliteMock'));

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  const List = React.forwardRef((props: any, ref: any) => {
    const { data = [], renderItem, ListHeaderComponent, ListFooterComponent, ...rest } = props;
    const children: unknown[] = [];
    if (ListHeaderComponent) {
      children.push(React.createElement(ListHeaderComponent, { key: '_hdr' }));
    }
    data.forEach((item: unknown, index: number) => {
      children.push(
        renderItem({
          item,
          getIndex: () => index,
          drag: () => {},
          isActive: false,
        })
      );
    });
    if (ListFooterComponent) {
      children.push(React.createElement(ListFooterComponent, { key: '_ftr' }));
    }
    return React.createElement(ScrollView, Object.assign({ ref }, rest), ...children);
  });
  return {
    __esModule: true,
    default: List,
    ScaleDecorator: (p: { children?: unknown }) => p.children,
  };
});
