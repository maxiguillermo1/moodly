// Jest setup (tests only).
// Keep this file tiny and deterministic.

// AsyncStorage mock (fast, deterministic).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

