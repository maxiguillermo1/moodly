import { orderedActiveExtensionPlugins } from './dayExtensionRegistry';
import type { ExtensionsPolicy } from '../theme/ExtensionsPolicyContext';

const basePolicy: ExtensionsPolicy = {
  habitsEnabled: false,
  todayGoalsEnabled: false,
  todayTodoEnabled: false,
  todayExtensionsOrder: ['habits', 'goals', 'todo'],
  bumpTodayExtensionStackOrder: jest.fn(),
};

describe('orderedActiveExtensionPlugins', () => {
  it('filters inactive plugins while preserving saved order', () => {
    const plugins = orderedActiveExtensionPlugins({
      ...basePolicy,
      habitsEnabled: true,
      todayTodoEnabled: true,
      todayExtensionsOrder: ['todo', 'habits', 'goals'],
    });

    expect(plugins.map((p) => p.id)).toEqual(['todo', 'habits']);
  });

  it('appends active plugins missing from a saved order', () => {
    const plugins = orderedActiveExtensionPlugins({
      ...basePolicy,
      habitsEnabled: true,
      todayGoalsEnabled: true,
      todayTodoEnabled: true,
      todayExtensionsOrder: ['todo'] as any,
    });

    expect(plugins.map((p) => p.id)).toEqual(['todo', 'habits', 'goals']);
  });

  it('returns no plugins when every extension is hidden', () => {
    expect(orderedActiveExtensionPlugins(basePolicy)).toEqual([]);
  });
});
