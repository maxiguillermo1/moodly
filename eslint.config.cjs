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
          ],
        },
      ],
    },
  },
];

