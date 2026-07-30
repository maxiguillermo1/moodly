/**
 * @fileoverview Root stack route params (single module to avoid navigator ↔ screen cycles).
 * @module navigation/types
 */

export type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
  Account: undefined;
  Habits: undefined;
  Goals: { date?: string } | undefined;
  Todo: { date?: string } | undefined;
};

export type MainTabParamList = {
  Calendar: undefined;
  Today: undefined;
  Journal: undefined;
};
