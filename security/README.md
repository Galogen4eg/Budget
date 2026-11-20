# Firestore rules audit — Budget (2026-11-20)

Status: **DRAFT, EMULATOR-PARTIALLY-VALIDATED, NOT DEPLOYED**. The current live rules pasted in chat grant every signed-in account full access to all family subcollections and invitations.

## Confirmed P0 issues in live rules
1. `/families/{familyId}`: `allow read, create, update: if request.auth != null` enables any signed-in user to inspect families, replace owner/member fields, or write a forged membership list.
2. `/families/{familyId}/{allSubcollections=**}`: any signed-in account can read, change, or delete another family's transactions, goals and settings.
3. `/invitations/{email}`: any signed-in account can read, overwrite or delete other people's invitations.
4. Rules contain no trusted check of recipient email verification; an unverified email/password account could register an address matching an invitation and claim it.

## Prepared artifact
`security/firestore.rules.draft` is a **proposal**, not an accepted replacement. It restricts family data to members and treats invitation acceptance as a special transaction. Uses `getAfter` to validate multi-document operations. Firestore Emulator checks now cover 15 important paths, and all 15 passed on PR #16. This is **not** a full audit of app queries, security rules, access-call quotas, existing data, or real-account workflows.

## Known blockers before rule deployment
- **Invitation creation — FIXED & EMULATOR-TESTED:** The application now uses a write batch with no read of an absent invitation. The draft rules allow creation by the family owner with a matching placeholder and reject updates to an existing email-keyed invitation atomically.
- **Email verification — PARTLY IMPLEMENTED:** New real-email registrations receive a verification email; Account settings can resend and refresh verification. The rules reject unverified invitees, while legacy `name@family.local` accounts can continue in an existing family. Real two-account UX, email delivery and migration for a legacy username wishing to join another family are **not yet end-to-end tested**.
- **Member update privileges:** test both normal profile edits and invited placeholder claim against emulator, including whether an extra member field blocks the transaction. Owner changes of member email while invitation is pending must not create a stale invitation.
- **Legacy data:** verify `families/{id}.members` contains all authorized UIDs and that `users/{uid}.familyId` points to the correct family before tightening access.
- **Family join:** rules must allow the invitee to read the family + placeholder before becoming a member, yet not expose another family's data.
- **Access-call quotas:** test transaction reads/writes and multi-doc imports in the emulator; get/exists/getAfter counts are limited.
- **Other app paths:** verify all collections and nested subcollections used by the UI are in the allowlist. The draft denies paths not explicitly listed.
- **Live removal:** deleting a linked member document alone must never be mistaken for revoking access. Revoke the UID from `families/{id}.members` and invalidate/repair `users/{uid}.familyId` in a privileged, validated workflow; the UI currently blocks this scenario.
- **Global rules:** new proposal prevents globally writable learned rules. Confirm impacts of `addGlobalRule` before rollout.

## Verified in GitHub Actions, PR #16

On 2026-11-20, commit `8f571bc7fa8dc8579e13f5040e26bbbcffb9285f`, the dedicated **Firestore Emulator** workflow passed all 10 integration checks (job `136569581549`). The regular Budget checks passed regression tests, `tsc --noEmit`, and Vite production build (job `136569581950`). Neither workflow deploys the draft rules to Firebase.

Emulator-passed scenarios: member data access vs outsider, forged family membership rejection, owner invitation batch, verified invitation acceptance, unverified denial, legacy member access, invitation cancellation, revoked-user denial, first-family creation, and global rule write denial.

## Additional verified matrix — 2026-11-20

Commit `add51adf89e37ce409a15c388efb44c7c2803b73`, Firestore Emulator run `44818484871` / job `136572901431`: **15/15 PASS**. The extra tests found a genuine first-registration regression (the new account could not read its not-yet-created `families/{uid}` document), now fixed by allowing this exact UID-scoped get. Tests also cover common finance collections (transactions, goals, shopping, accounts, debts, events and pantry), shared settings, private member settings, invitation enumeration denial, and cross-family writes.

This confirms **draft-rule behavior only in an isolated emulator**. It does not inspect real Firebase documents or change deployed rules. Before production rollout, audit actual legacy membership records, transaction import batches, full UI storage paths and the real invitation flow on two accounts. No live Firestore access was available.

## Legacy-data and bank import verification — 2026-11-20

Commit `4ec09ba73d583e810171b5b2b9375784a89d9812`, GitHub Actions run `44819332145`: **17/17 Firestore Emulator checks passed** (job `136575820746`). The newest checks performed a real 450-document transaction import and verified access for the recorded `ownerId` of an existing family missing the `members` field, while a stranger was denied. GitHub Actions app checks run `44819332080` also passed regression tests, TypeScript and production build.

The legacy test exposed a rule-evaluation failure on missing `members`. We fixed `memberOf()` to use a safe default `data.get('members', [])` and allow the recorded owner access. **Do not mistake this for verification of the real database.** Historical `ownerId` fields may themselves be inaccurate under the previously permissive deployed rules; back up and audit them before applying this rule.

The Settings UI previously copied *all* family collections, including linked member profiles, **before** joining another family. This unsafe pre-join migration option was disabled; users can still accept invitations without automatically copying old transactions. Restoring migration requires explicit authorization and a conflict-safe process that does not overwrite member identities or existing financial records.

## Remaining emulator test matrix (not yet completed)
- Normal multi-section imports and settings writes with realistic batch sizes and access-call limits: ALLOW.
- Concurrent attempt to create an invitation with the same email from two separate families: only one commits.
- Full two-device syncing of expenses, shopping and savings after accepted invite.
- Existing family profile migration and joining when the account already owns a separate personal family.
- Comprehensive read/write permissions across every Budget collection and nested subcollection.
- Concurrent conflicting updates to the same member profile, and owner editing an invitation's pending email.
- Invitee and owner race accept/cancel invitation: exactly one commits, no dangling membership.
- Browser-level registration, email verification, invite acceptance and re-login.
- Existing member can reauthenticate and edit precisely permitted member fields.
- Design and test privileged linked-user removal workflow; UI currently prevents deleting active profiles.
- Verify access-call quotas for large writes, imports and joined-family subscriptions.
- Data audit: all legacy families contain correctly populated `members` UID lists before rules rollout.

## Publish sequence
1. Correct code and verify auth-flow UX with two separate test accounts.
2. Execute Firestore Rules emulator permission tests with the actual draft.
3. Back up current Firebase rules and family membership documents.
4. Publish rules in Firebase Console separately from GitHub / Vercel deployment.
5. Verify a smoke test with both accounts on the real Firebase database.
6. Merge the code PR only when rules rollout and app version are compatible.

Do not paste the draft directly into Firebase Console until these blockers are resolved.

## Family chat compatibility — 2026-11-20

The explicit shared-collection allowlist originally omitted `chat`, which would have broken messages under restricted rules. Added `chat` to the allowed family collections. Real Firebase Emulator CI on commit `23f36964413fc2816284643e6d45b9a15fae9857`, run `44821913149` / job `136584635329`: **18/18 passed**, including member read/write and outsider denial for chat. Regular app CI on the same commit passed tests, TypeScript and build. **These are draft rules only, not deployed.**
