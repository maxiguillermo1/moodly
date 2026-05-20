# Accessibility Contract

Kairo **v0.6** accessibility should feel as calm and intentional as the visual product. Improvements must preserve visual minimalism while making core flows usable with VoiceOver, Dynamic Type, Reduce Motion, and larger touch targets.

## VoiceOver

- Icon-only controls need `accessibilityRole`, `accessibilityLabel`, and a useful hint when the outcome is not obvious.
- Modal sheets should be scoped with `accessibilityViewIsModal` and announce or focus the sheet title when opened.
- Destructive or non-obvious row actions should be available through `accessibilityActions`, not only gestures.
- Core input groups, such as mood selection, must announce current selection state.

## Dynamic Type

- Primary labels should allow scaling with bounded `maxFontSizeMultiplier` values that preserve layout.
- Settings and list rows may wrap to two lines where truncation would hide meaning.
- Normal-size layout should remain visually unchanged.

## Motion And Sensory Settings

- Respect Reduce Motion for navigation, modal, reorder, touch-scale, and calendar title motion.
- Haptics should reinforce user intent without feeling noisy; avoid haptics for passive hydration or background state changes.
- Reduced transparency and stronger contrast settings should preserve readable separators and surfaces.

## Touch Targets

- Tappable controls should reach a 44pt effective target through size or `hitSlop`.
- Small visual controls may stay visually minimal if the invisible touch target is large enough and does not overlap neighboring controls.

## Automated checks (CI)

- Unit tests cover **deterministic** accessibility helpers (`src/system/accessibility.test.ts`) and **MoodPicker** roles/labels (`src/components/mood/MoodPicker.test.tsx`).
- **Journal** sheet: save is **disabled with VoiceOver state** when no mood is selected (`JournalEditModal.test.tsx`) — matches Today’s guard, prevents silent no-ops on rapid taps.
- **Floating tab bar** uses shared **`DEFAULT_HIT_SLOP`** (10pt) on each tab control for a larger effective touch target without changing pill layout.

VoiceOver rotor order, live regions on device, and Reduce Motion **across all screens** still require the manual matrix below before App Store submission.

- VoiceOver tab navigation, modal open/close, settings switches, mood picker, Journal edit/delete, Calendar day edit, and Reminders actions.
- Dynamic Type at large accessibility sizes for Today, Journal, Calendar sheet, Settings, Habits, Goals, and Reminders.
- Reduce Motion enabled across tab switching, calendar navigation, sheet presentation, and drag/reorder flows.
