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
