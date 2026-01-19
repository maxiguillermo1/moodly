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
];

