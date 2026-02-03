// ESLint v9+ flat config (required; .eslintrc.* is ignored by default).
// Keep this minimal and focused on correctness + perf footguns (hooks).

const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
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
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // Hooks correctness is non-negotiable.
      ...(reactHooks.configs?.recommended?.rules ?? {}),
      // High-signal hygiene (but avoid “nit” rules like banning `any` in an RN app).
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Strong signal for perf + correctness; can be disabled locally with intent.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // ---------------------------------------------------------------------------
  // Module boundary guardrails (FAANG-style)
  // ---------------------------------------------------------------------------
  {
    // UI layer must never touch persistence directly.
    files: [
      'src/screens/**/*.{ts,tsx,js,jsx}',
      'src/components/**/*.{ts,tsx,js,jsx}',
      'src/hooks/**/*.{ts,tsx,js,jsx}',
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
                'Do not import AsyncStorage in UI code. Use the `src/data/*` layer (e.g. `import { getEntry } from ../data`).',
            },
          ],
          patterns: [
            {
              group: ['**/data/storage/**', '**/lib/storage/**'],
              message:
                'Do not import deep storage modules from UI code. Import via the `src/data` public surface instead.',
            },
            {
              group: ['../lib/**', '../../lib/**', '../../../lib/**', '@/lib/**', '**/src/lib/**'],
              message:
                'UI code must not import from `lib/*` directly. Import pure helpers from `domain`/`utils` and runtime services from `security`/`storage` facades.',
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
    files: ['src/domain/**/*.{ts,tsx,js,jsx}'],
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
              message: 'Domain must not import AsyncStorage. Use `src/data/*` for persistence.',
            },
          ],
          patterns: [
            {
              group: [
                '**/screens/**',
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
    files: ['src/logic/**/*.{ts,tsx,js,jsx}', 'src/insights/**/*.{ts,tsx,js,jsx}', 'src/utils/**/*.{ts,tsx,js,jsx}'],
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
              group: ['**/screens/**', '**/components/**', '**/navigation/**', '**/data/storage/**', '**/lib/storage/**', '**/storage/**'],
              message: 'Pure layers must not import UI/navigation/storage layers.',
            },
          ],
        },
      ],
    },
  },
  {
    // Data layer must not import UI or navigation (prevents hidden coupling).
    files: ['src/data/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/screens/**', '**/components/**', '**/navigation/**'],
              message: 'Data layer must not import UI/navigation. Keep persistence isolated and reusable.',
            },
          ],
        },
      ],
    },
  },
  {
    // Storage layer must not import UI or navigation.
    files: ['src/storage/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/screens/**', '**/components/**', '**/navigation/**'],
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
    files: ['src/**/*.{ts,tsx,js,jsx}'],
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
];

