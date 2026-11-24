# Budget — UI design contract

Purpose: a calm, trustworthy family planning and money interface for two people, optimized for narrow phones first and wide desktop screens second. This is a continuation of Budget's established Terra appearance, **not** a visual rebrand.

## Visual direction

Visual thesis: the active financial amount or selected calendar date is the focal point; neighboring controls should be quieter. No decorative hero graphics, fake metrics, glowing borders, excessive gradients or repetitive animated cards.

| Role | Light | Dark |
| --- | --- | --- |
| App canvas | `#FAF6F0` | `#121214` |
| Surface | `#FAF8F5` | `#1C1C1E` |
| Primary action | `#4A7C59` | existing green-on-dark tokens |
| Main ink | `#2E3230` | `#F5F5F5` |
| Border | `#EAE5DB` | `rgba(255,255,255,.10)` |
| Dangerous action | existing restrained red | existing dark-mode red |

Use existing project font utilities (`font-headline` for main amounts/headings and `font-sans` or `font-body` for UI copy). Limit typography to three useful levels: page heading, section heading, readable 12–14px labels and 14–16px interactive/body content. Avoid tracking-heavy ALL CAPS for recurring navigation and actions.

## Reusable UI primitives

For the primary screen sections, reuse constants in `components/filterUiTokens.ts`: `SURFACE_CARD` for flat cards, `PAGE_HEADING` and `SECTION_HEADING` for hierarchy, and `FILTER_RAIL`/`FILTER_CHIP` for filters and preset actions.

- **One card silhouette:** `rounded-2xl`, a fine outline, consistent warm off-white canvas and compact `p-4 sm:p-5`. Do not mix gratuitous `rounded-[28px]`, oversized drop shadows and floating gradient containers on neighboring pages.
- **One filter behavior:** every chip is `flex-none shrink-0`, 44px tall, text kept on one line; the **rail** scrolls horizontally with `min-w-0` and `overflow-x-auto`. Never distribute full rows of filters into compressed equal-width columns.
- **One navigation hierarchy:** a clear page title and muted secondary date / selection controls; actions are identifiable, never represented by a handful of unrelated ornamental icon buttons.
- **One state language:** restrained dark-green selection, neutral inactive state, meaningful danger red. Do not use glowing gradients or bouncing animations merely to signal an active item.
- **Long real content:** large family names, repeated purchases and finance amounts must retain accessible names, avoid page-wide overflow and remain clickable on 320px phones.
- **Release check:** record actual widths and heights of controls with Chromium; text-based JSX checks alone do not prove a layout works. Keep this check separate from real family-account E2E.

## Layout and behavior

- Mobile: one main content column, horizontal spacing 12–16px, readable dates and amounts, no fixed pixel minimum taller than the viewport. Respect `100dvh` and safe-area bottom padding in sticky controls and modal footers.
- Desktop: visible date navigation with an optional details sidebar; keep the main calendar legible at 1024px without a fixed 380px sidebar consuming the workspace.
- Minimum touch target **44 × 44 CSS px**, with exceptions only where a much larger surrounding clickable target already exists.
- Real `button` elements for dates, cards and toggles. Keyboard focus must be visible. Reflect selected state with `aria-pressed`, not color alone. Label icon-only actions.
- Empty states tell the person what to do next. Display only actual money, chart values and events; never insert illustrative figures into live accounting widgets.
- Personal/family scope and participant ownership must remain explicit. UI polish must not change financial calculations or silently assign records to another person.
- Calendar: plans, tasks and events. Do **not** connect the financial monthly plan or expense forecasts to calendar dates.
- Preserve existing family Firestore APIs, retries, import safety and editing/deletion semantics.

## Motion

Based on Emil Kowalski's interaction guidance: no animation for high-frequency calendar navigation and keyboard input. A subtle 100–160ms press transform is sufficient for touch feedback when desired; transitions should target exact properties, not `transition-all`. Modal entrances may be about 180–220ms ease-out. Always honor `prefers-reduced-motion`. Avoid decorative pulsing, springy overshoot or arbitrary zooms.

## Review gates

1. Test important date calculations and stable identity/financial behaviors before layout changes.
2. Run Node regression tests, TypeScript check and Vite production build on the exact PR head.
3. Inspect 320px, 375px, 430px mobile widths, tablet width and 1024px+ desktop; check landscape and font scaling.
4. Verify actual add/edit/delete and calendar month/week/list workflows, including repeat events, with real browser interactions. Test Safari/iOS and Android separately.
5. Never mark a draft as deployable until checks run and any cross-PR dependencies are resolved.

References for design approach: Anthropic `frontend-design` and `theme-factory`, pbakaus `impeccable`, Leonxlnx `taste-skill`, emilkowalski `emil-design-eng`. These were consulted as external guidance, not installed as executable Budget skills.

## Dashboard consistency release

Overview cards and charts use DASHBOARD_CARD / CHART_TOOLTIP; chart period filters use FILTER_RAIL / FILTER_CHIP. Both chart plots use a fixed-height viewport per breakpoint and no replayed Area animation. Toolbar actions use 44px targets. Mobile navigation keeps minimum 44px width, stable selected background and no decorative blur or hover scaling. Global Framer Motion respects the user's system preference. Scoped CSS motion is loaded through public/terra-ui.css, not the unused legacy index.css; do not enable the legacy fixed body styles as part of visual changes. Browser regression exercises period switching, surface tokens and reduced motion at existing viewport matrix. Finance formulas, access and Firestore are unchanged.
