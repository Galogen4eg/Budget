# Production regression register

Target: budget-omega-jade.vercel.app, deployed 49a19ed971b69e2d1ed6aee4fa87b69277eaed2c. QA-only work; no product release in this PR. Production uses the existing isolated single-owner QA family. All writes must be guarded. Emulator results are separate.

## Evidence and defects

| ID | Priority | Scenario | Evidence | Status |
|---|---|---|---|---|
| LIVE-001 | P2 | Mobile reopen/rename event | Actions 45629046092, timeout at mobile reload and rename | Failed; exact cause unconfirmed. Explicit current date and desktop/mobile accessible-name variants added. |
| LIVE-002 | P1 | Debt creation / cleanup | Actions 45629046092, assertion at create debt, then cleanup guard refused | Failed; possible leftover. Source DebtSnowball handleUpdateDebt assigns memberId only when !editingDebt, but new draft is an object. Verify missing owner on QA-like residual without logging record contents. Never auto-delete an unverified prior record. |
| LIVE-003 | P2 | Chat create/delete topics | FamilyChat handleCreateTopic/handleDeleteActiveTopic | Source-confirmed placeholders, not browser-verified. |
| LIVE-004 | P2 | Chat attachments | FamilyChat handleFileChange warns unsupported | Source-confirmed limitation. |
| LIVE-005 | P2 | Loyalty card scan | Wallet camera banner pre-fills demo values | Source-confirmed simulation; actual scan not verified. |
| LIVE-006 | P2 | Shopping cleanup coverage | ShoppingQuickListsPanel writes family purchase history when an item is completed | Prior test deletes shopping row only; historical QA markers can remain. No unrelated history deletion. |

## Confirmed live

Post-deploy run 45626390939: expense CRUD, invalid zero, reload, mobile edit, delete and cleanup; all six section navigation and nine settings subsections at 1440/390. Run 45629046092: shopping CRUD, chat send/search/reload, loyalty CRUD passed; event and debt failed as above. Second run 45629879781: results pending at register creation. Do not treat status pending as pass.

## Coverage additions pending actual execution

Income create/edit/delete and history filtering, mandatory payments create/edit/pay/undo/delete, theme/privacy persistence and restore, quick-list save/reapply/delete, synthetic XLSX preview and cancel. Prior debt residue diagnostic reads counts/booleans only. Cleanup checks exact unique markers and Firestore revision. Any safety block remains a non-pass.

## Remaining coverage

Actual XLSX commit/reimport/idempotence, bank-specific fixtures and duplicate handling; category/rule/goal CRUD; pantry and repeat-purchase history; recurring calendar event edits; all nested controls; responsive visual QA at additional widths; offline and physical device; second production account/reactions; Telegram/Gemini/FNS/bank integrations. Source code inspection is not execution. Do not claim full coverage until verified or explicitly blocked.

## Regression corrections

Run 45632628747: six live scenarios passed, event/income/preferences failed, debt blocked by ownerless fixture. Debt owner resolution now uses persisted ID; three focused helper tests cover creation, preserving owner, and personal-mode rejection. New test diagnostics split event reopen and settings writes, scope income history to its actual region and verify navigation readiness. Prior debt recovery is narrowly conditional on exact fixture and documented run time plus no financial references. If any condition fails, no deletion. The current production build remains unchanged until reviewed Git release, so a production test of debt creation before deployment can still reproduce the defect. Emulator suite uses readiness and verifies new debt owner. Results pending actual CI and post-release live verification.

## Production button audit extension

Run 45638348258: emulator 5/7 (event cross-user CRUD, theme isolation, wallet, debt ownership/CRUD, mandatory payments pass; shopping quantity and receiving chat on another account fail). This is not production confirmation. Extend productionNavigation.mjs with independently reset explicit named button checks, verify selected state, visible destination, dialog and cancellation. Main functional buttons at 1440 and 390; extra navigation/control inventory at 320, 768, 1280, 1920. Map IDs to BUDGET_ELEMENT_AND_FLOW_REGISTER.md. Chat topic placeholder intentionally reported as non-pass. Conditional widgets/fixtures, external actions, actual financial writes, goal/category/rule CRUD and second-user sync must be reported separately. Inventory is not click coverage. No live results claimed for the new code until GitHub Actions reports them.
