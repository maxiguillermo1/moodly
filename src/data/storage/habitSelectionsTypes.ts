/**
 * @fileoverview Shared habit-selections types (breaks storage ↔ sync import cycles).
 * @module data/storage/habitSelectionsTypes
 */

import type { HabitId } from '../../lib/constants/habitsCatalog';

/** Local calendar day key → selected habit ids for that day. */
export type HabitSelectionsRecord = Record<string, HabitId[]>;
