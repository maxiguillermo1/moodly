/**
 * @fileoverview Task/reminder models.
 * @module types/todo.types
 */
/** Title clamp matches mood note normalization in storage (`normalizeNote`). */
export const MAX_DAY_TODO_TITLE_LEN = 200;
/** Hard cap on tasks stored per calendar day (AsyncStorage size + UX). */
export const DAY_TODO_MAX_ITEMS_PER_DAY = 100;
