/**
 * @fileoverview Pure helpers for day To-do UI (extension teaser + list ordering).
 * @module lib/todos/dayTodoDisplay
 */

import type { DayTodoItem } from '../../types';
import { formatReminderMinutes, nextOpenReminderMinutes } from './reminderTime';
import { getToday } from '../utils/date';

export type PartitionedDayTodos = {
  open: DayTodoItem[];
  done: DayTodoItem[];
};

export function partitionDayTodos(items: readonly DayTodoItem[]): PartitionedDayTodos {
  const open: DayTodoItem[] = [];
  const done: DayTodoItem[] = [];
  for (const it of items) {
    if (it.done) done.push(it);
    else open.push(it);
  }
  const byOrder = (a: DayTodoItem, b: DayTodoItem) =>
    a.sortIndex - b.sortIndex || a.createdAt - b.createdAt;
  open.sort(byOrder);
  done.sort(byOrder);
  return { open, done };
}

export type DayTodoTeaser = {
  /** Main label (extension title row). */
  headline: string;
  /** Supporting line under the headline. */
  subtitle: string;
  accessibilityLabel: string;
  /** Counts for optional badges / tests. */
  openCount: number;
  doneCount: number;
};

const TEASER_TITLE = 'Reminders';

/**
 * Copy for the Today / Journal / Calendar extension row — reflects live counts + next open task.
 */
export function buildDayTodoExtensionTeaser(items: readonly DayTodoItem[]): DayTodoTeaser {
  const { open, done } = partitionDayTodos(items);
  const openCount = open.length;
  const doneCount = done.length;

  if (openCount === 0 && doneCount === 0) {
    return {
      headline: TEASER_TITLE,
      subtitle: 'Nothing here yet — tap to add a reminder',
      accessibilityLabel: 'Reminders for this day, empty list',
      openCount: 0,
      doneCount: 0,
    };
  }

  if (openCount === 0) {
    return {
      headline: 'All caught up',
      subtitle: `${doneCount} completed`,
      accessibilityLabel: `Reminders, all done, ${doneCount} completed`,
      openCount: 0,
      doneCount,
    };
  }

  const first = open[0]?.title?.trim() ?? '';
  const clipped = first.length > 48 ? `${first.slice(0, 46)}…` : first;

  let subtitle: string;
  if (doneCount === 0) {
    subtitle = openCount === 1 ? clipped : `${openCount} items · ${clipped}`;
  } else {
    subtitle =
      openCount === 1
        ? `1 open · ${doneCount} done · ${clipped}`
        : `${openCount} open · ${doneCount} done`;
  }

  return {
    headline: TEASER_TITLE,
    subtitle,
    accessibilityLabel: `Reminders, ${openCount} open${doneCount ? `, ${doneCount} completed` : ''}`,
    openCount,
    doneCount,
  };
}

/** Ultra-minimal copy for the Today / Journal / Calendar strip only (not the full Reminders screen). */
export type MinimalTodoExtensionTeaser = {
  /** Anchor label — always "Reminders" in product copy. */
  title: string;
  /** Optional single quiet line; omit when empty list. */
  detail: string | null;
  accessibilityLabel: string;
};

export function minimalTodoExtensionTeaser(
  items: readonly DayTodoItem[],
  listDayKey: string = getToday()
): MinimalTodoExtensionTeaser {
  const { open, done } = partitionDayTodos(items);
  const oc = open.length;
  const dc = done.length;

  if (oc === 0 && dc === 0) {
    return {
      title: 'Reminders',
      detail: null,
      accessibilityLabel: 'Reminders for this day, nothing yet, open to add',
    };
  }

  if (oc === 0) {
    return {
      title: 'Reminders',
      detail: 'All done',
      accessibilityLabel: `Reminders, all done, ${dc} completed`,
    };
  }

  const nextM = nextOpenReminderMinutes(items, listDayKey);
  if (nextM != null && open.some((t) => t.reminderMinutes != null)) {
    const label = formatReminderMinutes(nextM);
    if (oc === 1) {
      const raw = open[0]!.title.trim();
      const line = raw.length > 32 ? `${raw.slice(0, 30)}…` : raw;
      return {
        title: 'Reminders',
        detail: `${label} · ${line}`,
        accessibilityLabel: `Reminders, next at ${label}, ${line}`,
      };
    }
    return {
      title: 'Reminders',
      detail: `Next ${label} · ${oc} open`,
      accessibilityLabel: `Reminders, next time ${label}, ${oc} open`,
    };
  }

  if (oc === 1) {
    const raw = open[0]!.title.trim();
    const line = raw.length > 42 ? `${raw.slice(0, 40)}…` : raw;
    return {
      title: 'Reminders',
      detail: line,
      accessibilityLabel: `Reminders, ${line}`,
    };
  }

  return {
    title: 'Reminders',
    detail: `${oc} open`,
    accessibilityLabel: `Reminders, ${oc} items open`,
  };
}

export function dayTodoProgressLabel(openCount: number, doneCount: number): string | null {
  const total = openCount + doneCount;
  if (total === 0) return null;
  if (openCount === 0) return `${doneCount} completed`;
  if (doneCount === 0) return `${openCount} ${openCount === 1 ? 'reminder' : 'reminders'} open`;
  return `${doneCount} of ${total} done`;
}
