/**
 * @fileoverview Unit tests for {@link module:lib/todos/dayTodoDisplay}.
 */

import type { DayTodoItem } from '../../types';
import {
  buildDayTodoExtensionTeaser,
  dayTodoProgressLabel,
  minimalTodoExtensionTeaser,
  partitionDayTodos,
} from './dayTodoDisplay';

function item(partial: Partial<DayTodoItem> & Pick<DayTodoItem, 'id' | 'title' | 'done'>): DayTodoItem {
  return {
    createdAt: 1,
    sortIndex: 0,
    reminderMinutes: null,
    ...partial,
  };
}

describe('partitionDayTodos', () => {
  it('splits and sorts by sortIndex', () => {
    const items = [
      item({ id: 'b', title: 'b', done: false, sortIndex: 2 }),
      item({ id: 'a', title: 'a', done: true, sortIndex: 0 }),
      item({ id: 'c', title: 'c', done: false, sortIndex: 1 }),
    ];
    const { open, done } = partitionDayTodos(items);
    expect(open.map((x) => x.id)).toEqual(['c', 'b']);
    expect(done.map((x) => x.id)).toEqual(['a']);
  });
});

describe('buildDayTodoExtensionTeaser', () => {
  it('handles empty', () => {
    const t = buildDayTodoExtensionTeaser([]);
    expect(t.headline).toBe('Reminders');
    expect(t.openCount).toBe(0);
    expect(t.subtitle).toContain('Nothing here');
  });

  it('handles all done', () => {
    const t = buildDayTodoExtensionTeaser([item({ id: '1', title: 'x', done: true, sortIndex: 0 })]);
    expect(t.headline).toBe('All caught up');
    expect(t.openCount).toBe(0);
    expect(t.doneCount).toBe(1);
  });
});

describe('minimalTodoExtensionTeaser', () => {
  it('empty: title only', () => {
    const m = minimalTodoExtensionTeaser([]);
    expect(m.title).toBe('Reminders');
    expect(m.detail).toBeNull();
  });

  it('one open: first title', () => {
    const m = minimalTodoExtensionTeaser([item({ id: '1', title: 'Buy milk', done: false, sortIndex: 0 })]);
    expect(m.detail).toBe('Buy milk');
  });

  it('many open: count only', () => {
    const m = minimalTodoExtensionTeaser([
      item({ id: '1', title: 'a', done: false, sortIndex: 0 }),
      item({ id: '2', title: 'b', done: false, sortIndex: 1 }),
    ]);
    expect(m.detail).toBe('2 open');
  });
});

describe('dayTodoProgressLabel', () => {
  it('returns null for empty', () => {
    expect(dayTodoProgressLabel(0, 0)).toBeNull();
  });
});
