# Firestore rules audit — Budget (2026-11-20)

Status: **DRAFT, NOT VALIDATED OR DEPLOYED**. The current live rules pasted in chat grant every signed-in account full access to all family subcollections and invitations.

## Confirmed P0 issues in live rules
1. `/families/{familyId}`: `allow read, create, update: if request.auth != null` enables any signed-in user to inspect families, replace owner/member fields, or write a forged membership list.
2. `/families/{familyId}/{allSubcollections=**}`: any signed-in account can read, change, or delete another family's transactions, goals and settings.
3. `/invitations/{email}`: any signed-in account can read, overwrite or delete other people's invitations.
4. Rules contain no trusted check of recipient email verification; an unverified email/password account could register an address matching an invitation and claim it.

## Prepared artifact
`security/firestore.rules.draft` is a **proposal**, not an accepted replacement. It restricts family data to members and treats invitation acceptance as a special transaction. Uses `getAfter` to validate multi-document operations. Its Firestore syntax, actual permission outcomes, access-call quotas and compatibility with current flows **have NOT been tested in the Firebase Emulator**.

## Known blockers before rule deployment
- **Invitation creation:** `createFamilyMemberWithInvitation` currently reads `invitations/{email}` before writing it. The draft's invitation `get` grants access only to an invitee or the owner of an *existing* invitation. It will reject the lookup of an absent invitation. Must redesign the new-invitation write and test coexistence with existing invitations before deploying.
- **Unverified or synthetic email logins:** `LoginScreen` supports `name@family.local`. Such addresses cannot receive verification mail. The proposal requires `email_verified` for claiming invitations; registration, account migration and verification/re-login UX must be implemented first.
- **Member update privileges:** test both normal profile edits and invited placeholder claim against emulator, including whether an extra member field blocks the transaction. Owner changes of member email while invitation is pending must not create a stale invitation.
- **Legacy data:** verify `families/{id}.members` contains all authorized UIDs and that `users/{uid}.familyId` points to the correct family before tightening access.
- **Family join:** rules must allow the invitee to read the family + placeholder before becoming a member, yet not expose another family's data.
- **Access-call quotas:** test transaction reads/writes and multi-doc imports in the emulator; get/exists/getAfter counts are limited.
- **Other app paths:** verify all collections and nested subcollections used by the UI are in the allowlist. The draft denies paths not explicitly listed.
- **Live removal:** deleting a linked member document alone must never be mistaken for revoking access. Revoke the UID from `families/{id}.members` and invalidate/repair `users/{uid}.familyId` in a privileged, validated workflow; the UI currently blocks this scenario.
- **Global rules:** new proposal prevents globally writable learned rules. Confirm impacts of `addGlobalRule` before rollout.

## Firestore Emulator test matrix (required, real tests—not textual checks)
- Owner creates family, own member, shared settings in existing batch: ALLOW.
- Owner creates pending placeholder + one invitation, then tries same email twice: first ALLOW, second DENY with no partial writes.
- Recipient with *verified* matching email reads invite and joins family in one transaction: ALLOW; two users see identical transactions.
- Unverified matching email and another signed-in user: DENY read and join.
- Another family's member reads/updates family expenses, goals and member settings: DENY.
- Any signed-in user cannot append another UID to an arbitrary family: DENY.
- Invitee and owner race accept/cancel invitation: exactly one commits, no dangling membership.
- Owner cancels pending member; invitee cannot join afterwards.
- Existing member can reauthenticate, read shared data and update only permitted member fields.
- Remove linked user's membership: they immediately lose all access even if `users/{uid}.familyId` remains stale.
- Normal imports, shared settings, user settings and write batches work within access-call quota.
- Existing unverified legacy logins remain usable until an explicit migration plan.

## Publish sequence
1. Correct code and verify auth-flow UX with two separate test accounts.
2. Execute Firestore Rules emulator permission tests with the actual draft.
3. Back up current Firebase rules and family membership documents.
4. Publish rules in Firebase Console separately from GitHub / Vercel deployment.
5. Verify a smoke test with both accounts on the real Firebase database.
6. Merge the code PR only when rules rollout and app version are compatible.

Do not paste the draft directly into Firebase Console until these blockers are resolved.
