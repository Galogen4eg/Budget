# Terra v2.1 — 02 Budget: baseline audit (28.11.2026)

Base: main 10f370e908bf8587fa685aa12f4630065f7527ff; tested PR head 44783613b35ec97a2aa22e03a4ffd9cf9ef67fd8; screenshot artifact 15257123607. Inspected desktop-1920-budget-family.png and desktop-1920-budget-archive.png; read TerraBudget.tsx relevant source, AGENTS.md, UI design and CI contracts. Not a completed audit or visual acceptance.

## Initial findings
- BUD-01 P2 confirmed source/reproduction: both month labels strip internal Russian г via /\\s*г\\.?/gi; August 2026 becomes «авуст 2026». Fix suffix-only behavior with shared date formatter and regression for all 12 months in both layouts.
- BUD-02 P2 observed: populated desktop history initially shown in screenshot as selected day 15 with zero operations while month has three. Inspect entry/default and retained calendar context before changing behavior. Clearly expose selected date and month totals; preserve deliberate date selection.
- BUD-03 P2 observed: calendar displays -2k ₽ for day 27 while yesterday's amount is 1 500 ₽; verify formatter paths and rounding, distinguish approximate cell labels from exact amounts in detail and accessible names. Use Russian locale; preserve exact kopecks in financial data.
- BUD-04 P2 observed: summary cards have unequal heights and competing visual hierarchy; assess natural responsive layout, reduce repeated month totals (summary and plan/fact) without losing meaning or controls.
- BUD-05 P2 observed: archive with zero month transactions shows a day-specific empty history, duplicate 0/0 count and empty category chart. Improve empty-state messaging for month vs date vs filters; validate actions and historical payment scope.
- BUD-06 verify: archived mandatory payments, category limits and member filtering must preserve correct month and family scope; no financial mutation tests on production.
- BUD-07 verify: dedicated mobile and dark Budget captures are not present in the inspected baseline set. Capture populated, archive, empty, long-value and privacy states at 320/375/390/430/768/1024/1440/1920, both themes, and measure geometry.

## Scope and next implementation block
Month and participant toolbar; KPI and reserve semantics; transaction history search/filter/pagination; financial day grid/week view, date detail and month rollover; category breakdown/drilldown, category limits, plan/fact and salary forecast; mandatory payments and all create/edit/delete/confirm workflows; import entry and result. Keep history standalone deep audit separate, but verify all Budget entry/return paths. Calendar of plans/events remains independent.

Follow VA-01–VA-08, tests-first, synthetic family fixtures, exact-head CI and screenshots, no merge before acceptance. No runtime source changes in this audit-start commit. Native Android/iOS, interactive mobile states, full code review and end-to-end live release verification not yet completed.
