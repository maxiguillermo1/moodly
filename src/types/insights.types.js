/**
 * @fileoverview Local-first **Insights & Reflection** contracts.
 * @module types/insights
 *
 * UI should render from **`QualifiedInsight`** using `messageKey` + `params` (i18n-ready).
 * Bundles are computed on demand; **presentation timing** (topic cooldowns) uses a small
 * persisted map in `insightsReflectionStateStorage` — not a second analytics SoT.
 * Do not confuse with `GoalInsight` in goals types (legacy goal row metadata).
 */
export {};
