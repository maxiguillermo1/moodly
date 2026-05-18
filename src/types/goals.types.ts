/**
 * @fileoverview Goals foundation models.
 * @module types/goals.types
 */

export type GoalType = 'habit' | 'target' | 'average' | 'project';

export type GoalCategory =
  | 'health'
  | 'fitness'
  | 'learning'
  | 'finance'
  | 'school'
  | 'work'
  | 'creativity'
  | 'wellness'
  | 'mindfulness'
  | 'personal'
  | 'custom';

export type GoalStatus = 'active' | 'completed' | 'archived';
export type GoalReminderFrequency = 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'custom';

export type GoalReminder = {
  id: string;
  enabled: boolean;
  frequency: GoalReminderFrequency;
  minutesFromMidnight: number | null;
  weekdays: number[];
  interval: number;
};

export type GoalMilestone = {
  id: string;
  title: string;
  targetValue: number;
  completedAt: number | null;
  sortIndex: number;
};

export type GoalHistory = {
  id: string;
  date: string;
  value: number;
  note: string;
  createdAt: number;
};

/**
 * `currentValue` is **derived from `history`** at persistence and display boundaries
 * (see `canonicalizeGoalModel` in `src/lib/goals/goalMath.ts`). It may still appear on
 * disk for older records; loaders reconcile it from history.
 */
export type GoalProgress = {
  currentValue: number;
  targetValue: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'none';
};

export type GoalInsight = {
  id: string;
  tone: 'encouraging' | 'neutral';
  message: string;
  createdAt: number;
};

export type Goal = {
  id: string;
  type: GoalType;
  status: GoalStatus;
  title: string;
  category: GoalCategory;
  customCategory: string | null;
  accentColor: string;
  progress: GoalProgress;
  reminder: GoalReminder | null;
  milestones: GoalMilestone[];
  history: GoalHistory[];
  notes: string;
  /**
   * Optional day length for the goal.
   * - undefined: legacy/default progress target behavior
   * - number: complete after this many unique logged days
   * - null: never-ending day counter
   */
  durationDays?: number | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  archivedAt: number | null;
};

export type GoalsRecordVersion = 1 | 2;

export type GoalsRecord = {
  version: GoalsRecordVersion;
  goalsById: Record<string, Goal>;
};

export type GoalComputedProgress = {
  percent: number;
  streak: number;
  completedToday: boolean;
  /** Distinct local days with `value > 0` after same-day merge. */
  loggedDays: number;
  insight: GoalInsight;
};
