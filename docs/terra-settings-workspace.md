# Settings workspace — nine-block UX pass
Base 72dbf53e7370a6c8132550136cdfbae2bc6f312a (previous UX candidate, all six CI checks passed). Separate settings branch; no production writes, changes to Firestore rules or finance projection formulas.
- Account: real identity, confirmed household owner only, remove fictitious phone/date/administrator, one current password field, accessible show/hide, actual password requirements, existing Firebase flows.
- Appearance: local theme and privacy groups; keep persisted keys and shared-budget visibility distinction.
- Menu: compact list rows and independently aligned overview widgets.
- Family: shared invite action for both layouts, current ID separated from join target, existing owner guards and confirmations; responsive member list/editor.
- Budget: separate personal field labels, semantic groups, 44px salary day targets, pressed state and native switch. No change to salary calculation or savings formulas.
- Categories: remove invented distribution bar; show actual counts, adaptive compact/wide editor, preserve catalog and rules actions.
- History: date labels, count, invalid range guard, reset confirmation when period changes, prevent repeated deletion, preserve callback and JSON export.
- Integrations: credentials before verification, separate token/delivery, collapsible listener log, no secret values in UI screenshots or diagnostics; keep actual integration handlers.
- Diagnostics: aligned status rows and install controls; no additional reachability promises.
Acceptance: all existing CI plus new source and browser assertions; capture each settings block; check light/dark and narrow width. Physical keyboard, actual Telegram/Gemini calls, production user data not tested by emulator. Existing security policies unchanged. 

## Follow-up review
Moved invitation dialog to its own portal using the existing focus/back contract; no actual invitation submitted in UI tests. Fixed the compact category editor footer to remain inside its modal, removed redundant safe-area padding. History range defaults to current local month through today; date filters and existing delete predicate unchanged. Added all-nine-section captures and geometry checks in both themes at existing six smoke widths; the populated-family audit opens and cancels invitation when permitted. Retargeted PR #127 to main for the existing CI triggers; PR #126 remains unchanged and is the verified ancestor. CI and screenshots remain required.

## Render review — fe27cc7bade7d886b067e4678b1f1069d9a53654
Five of six workflows passed. Browser smoke rendered all 108 settings combinations. Populated navigation failed only for Menu and overview because the new inventory counted buttons but not native checkbox/select controls; now explicitly checks its startup selector, six tab checkboxes, two widget checkboxes and immutable Overview. Visual review of mobile 390 and desktop 1440: active shared-budget parameters should precede personal overrides in shared mode (reverse in household personal mode); retain both groups and original handlers. Simplify the opening balance/date fields and member list (no expense sums in account management), use actual switch indicators and remove example integration credentials. No projection logic or permissions changed. Exact-head tests and new screenshots still required.
