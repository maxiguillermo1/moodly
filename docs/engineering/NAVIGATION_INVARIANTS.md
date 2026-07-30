# Bottom navigation invariants

These rules are frozen unless profiling and regression tests prove a different implementation is required.

## Source of truth

1. React Navigation `state.index` is the **only** authority for which tab is selected.
2. Icons, labels, and accessibility `selected` state derive from `state.index` — never from pill geometry.
3. The gray selection pill is **presentation only**. It follows navigation; it never drives navigation.
4. Do not maintain a second optimistic selected-tab React state.
5. Do not infer the active tab from pill X position (`useAnimatedReaction` on geometry is forbidden).

## Touch pipeline

1. Tab cells use `PlatformPressable` (React Navigation default contract).
2. Decorative layers (`LiquidGlass`, blur, gradients, bloom, pill) use `pointerEvents="none"`.
3. When the bar is hidden (scroll/keyboard), `pointerEvents` must be `none` on the motion wrapper — opacity-only hide is not enough.
4. Do not apply `translateY` (or other transforms) on the pressable ancestor tree — breaks iOS hit testing.
5. Minimum effective touch target: 44×44 pt per tab cell.

## Dispatch contract

1. Emit `tabPress` with `canPreventDefault: true`.
2. Respect `defaultPrevented` — do not dispatch if prevented.
3. Dispatch with `CommonActions.navigate(route)` scoped via `target: state.key`.
4. Optimistic pill animation may run before dispatch but must not block dispatch.
5. `useLayoutEffect` syncs pill to `state.index` only when not already synced (avoids canceling in-flight springs).

## Forbidden patterns

- `navigation.preload()` for Calendar or Journal (nested native stack crash).
- `TabPreloader` or any navigation preload of tab screens.
- Remounting screens with changing React keys.
- Resetting tab navigation on tab switch.
- RNGH `Pressable` / Reanimated pressables on tab cells (historical touch drops on iOS).

## Screen lifecycle

- `lazy: true` for cold start; JS module `require()` warmup in `RootApp` after interactions (not navigation preload).
- `freezeOnBlur: true` default; `freezeOnBlur: false` for Calendar and Journal (FlashList).
- `detachInactiveScreens: false` — preserve nested stack and scroll state.
- Tab switching must not remount screens or reset nested Calendar stack.

## Performance measurement

Navigation changes require before/after measurements:

```bash
kairo perf
# exercise tab switches in simulator
npm run perf:report
```

See `PERFORMANCE_BASELINE.md` and `PERFORMANCE_BUDGETS.md`.

## Tests

`src/navigation/FloatingTabBar.test.tsx` — press wiring and multi-direction switching.

Any navbar refactor must extend these tests and pass `npm test` before merge.
