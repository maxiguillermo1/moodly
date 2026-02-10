## Moodly perf libraries (curated, Expo Go–compatible)

This file is intentionally strict: **only** libraries with clear benefit, low risk, and **confirmed Expo Go compatibility** are considered for adoption.

### Current baseline assumptions
- Expo SDK: **54** (`expo` ~54)
- RN: **0.81.5**
- React: **19.1**
- Navigation: **React Navigation v7**, `native-stack` already in use
- List perf: Calendar uses **FlashList** already; Journal uses **FlatList** currently

---

## Decision table

| Library | Moodly-specific problem it solves | Expo Go compatible? | Risk | Bundle/runtime cost | Integration surface | Expected impact | Adopt now? | “No new library” alternative |
|---|---|---:|---|---|---|---|---:|---|
| `@shopify/flash-list` | Smooth scrolling + lower memory for **large, unbounded lists** (Journal) | **YES** (Expo docs: [FlashList](https://docs.expo.dev/versions/latest/sdk/flash-list/)) | Low | Low (already in deps) | Small | Med→High (Journal) | **YES** (apply to Journal) | Keep `FlatList`, tune: `getItemLayout` (if possible), `removeClippedSubviews`, batching/window params, memoized rows |
| `@react-navigation/native-stack` (already used) | Native transitions + better perf vs JS stack | YES (already running) | Low | None (status quo) | None | Med | **KEEP** | N/A |
| `react-native-reanimated` (already used) | UI-thread animations, scroll handlers | YES (already running) | Low | None (status quo) | None | Med | **KEEP** | N/A |
| `react-native-gesture-handler` (already used) | Gesture performance + correctness | YES (already running) | Low | None (status quo) | None | Low→Med | **KEEP** | N/A |
| `@welldone-software/why-did-you-render` | Find wasted renders in dev | **NOT SURE → treat as NO** (reported issues + React Compiler incompatibility) | Med | Low (dev-only) | Medium | Med (debug value) | **NO** (for now) | Use React DevTools Profiler + our `src/perf/*` probes; add targeted memoization instead of global WDYR |

### Notes / citations
- **FlashList**: Expo maintains official docs and installation guidance (see link above), and Expo SDK 54 projects commonly use it in Expo Go.
- **why-did-you-render**: npm docs and open issues indicate incompatibilities (notably with React Compiler); for Moodly we prefer stable built-in profiling + targeted probes.

---

## Non-library improvements worth considering (still Expo Go safe)

These are **not** new libraries; they’re config/code-level best practices. We will only apply them if baseline data suggests they’re warranted and they don’t risk behavior changes.

- **`react-native-screens`**: calling `enableScreens()` can improve navigation memory/perf in some setups (docs: [react-native-screens](https://docs.expo.dev/versions/latest/sdk/screens/)).  
  - Risk note: usually safe, but we’ll treat it as an optimization behind baseline proof, because it can subtly change lifecycle/mounting.

- **Avoid “freeze inactive screens”** (`enableFreeze`)  
  - This can change behavior (background updates stop). **Not allowed** under current constraints.

