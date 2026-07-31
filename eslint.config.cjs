// ESLint v9+ flat config — JavaScript + React Native (post TypeScript migration).

const reactHooks = require('eslint-plugin-react-hooks');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'ios/**',
      'android/**',
      'dist/**',
      'build/**',
      '.expo/**',
    ],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...(reactHooks.configs?.recommended?.rules ?? {}),
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^React$' }],
      'react-hooks/exhaustive-deps': 'warn',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
    },
  },
  // ---------------------------------------------------------------------------
  // Module boundary guardrails (FAANG-style)
  // ---------------------------------------------------------------------------
  {
    // UI layer must never touch persistence directly.
    files: [
      'src/screens/**/*.{js,jsx}',
      'src/features/**/*.{js,jsx}',
      'src/components/**/*.{js,jsx}',
      'src/hooks/**/*.{js,jsx}',
      'src/theme/**/*.{js,jsx}',
      'src/bootstrap/**/*.{js,jsx}',
      'src/navigation/**/*.{js,jsx}',
      'src/extensions/**/*.{js,jsx}',
    ],
    rules: {
      // UI should never log directly; use security logger (redacted + prod-safe).
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@react-native-async-storage/async-storage',
              message:
                'Do not import AsyncStorage in UI code (screens/components/hooks). Import persistence APIs from the `src/storage` façade (e.g. `import { getEntry } from "../storage"`).',
            },
          ],
          patterns: [
            {
              group: ['**/data/storage/**', '**/lib/storage/**'],
              message:
                'Do not import `src/data/storage/*` or other deep storage internals from UI. Import from `src/storage` only.',
            },
            {
              group: ['../lib/**', '../../lib/**', '../../../lib/**', '@/lib/**', '**/src/lib/**'],
              message:
                'UI code must not import from `src/lib/*` directly. Import pure helpers from `utils` (and `types`) and runtime services from `security` / `storage` facades.',
            },
            {
              group: ['../data/**', '../../data/**', '../../../data/**', '@/data/**', '**/src/data/**'],
              message:
                'UI code must not import from `data/*` directly. Import persistence APIs from the `storage` facade.',
            },
          ],
        },
      ],
    },
  },
  {
    // Domain must remain pure (no React, no UI, no storage).
    files: ['src/domain/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Domain must not import React. Keep domain pure and framework-free.',
            },
            {
              name: 'react-native',
              message: 'Domain must not import React Native. Keep domain pure and framework-free.',
            },
            {
              name: '@react-navigation/native',
              message: 'Domain must not import navigation. Keep domain pure and framework-free.',
            },
            {
              name: '@react-native-async-storage/async-storage',
              message:
                'Domain must not import AsyncStorage. Persist only in `src/data/storage`; screens use the `src/storage` façade.',
            },
          ],
          patterns: [
            {
              group: [
                '**/screens/**',
                '**/features/**',
                '**/components/**',
                '**/navigation/**',
                '**/data/storage/**',
                '**/lib/storage/**',
                '**/storage/**',
              ],
              message: 'Domain must not import UI/navigation/storage layers.',
            },
          ],
        },
      ],
    },
  },
  {
    // Logic must remain pure (beginner-friendly replacement for `domain`).
    files: ['src/logic/**/*.{js,jsx}', 'src/insights/**/*.{js,jsx}', 'src/utils/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Pure layers must not import React.',
            },
            {
              name: 'react-native',
              message: 'Pure layers must not import React Native.',
            },
            {
              name: '@react-navigation/native',
              message: 'Pure layers must not import navigation.',
            },
            {
              name: '@react-native-async-storage/async-storage',
              message: 'Pure layers must not import AsyncStorage.',
            },
          ],
          patterns: [
            {
              group: [
                '**/screens/**',
                '**/features/**',
                '**/components/**',
                '**/navigation/**',
                '**/data/storage/**',
                '**/lib/storage/**',
                '**/storage/**',
              ],
              message: 'Pure layers must not import UI/navigation/storage layers.',
            },
          ],
        },
      ],
    },
  },
  {
    // Data layer must not import UI or navigation (prevents hidden coupling).
    files: ['src/data/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/screens/**', '**/features/**', '**/components/**', '**/navigation/**', '**/theme/**', '**/ui/**', '**/perf'],
              message: 'Data layer must not import UI/navigation/theme/perf barrels. Keep persistence isolated and reusable.',
            },
          ],
        },
      ],
    },
  },
  {
    // Storage layer must not import UI or navigation.
    files: ['src/storage/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/screens/**', '**/features/**', '**/components/**', '**/navigation/**'],
              message: 'Storage layer must not import UI/navigation. Keep persistence isolated and reusable.',
            },
          ],
        },
      ],
    },
  },
  {
    // Date-key safety: prevent accidental UTC date-key derivation via `toISOString().slice(...)`.
    // This is a common footgun that breaks local-day semantics near midnight/DST.
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.property.name="slice"][callee.object.type="CallExpression"][callee.object.callee.property.name="toISOString"]',
          message:
            'Do not derive date keys using `toISOString().slice(...)` (UTC). Use local date helpers (`formatDateToISO`, `getToday`) and validate with `isValidISODateKey`.',
        },
      ],
    },
  },
  {
    // Hook unit tests may import AsyncStorage + storage test helpers (not product hooks).
    files: ['src/hooks/**/*.test.{js,jsx}'],
    rules: {
      'no-restricted-imports': 'off',
      'no-console': 'off',
    },
  },
];

