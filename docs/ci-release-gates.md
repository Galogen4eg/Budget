# Budget CI — release gate (2026-11-23)

## Root cause documented
A previous PR for mobile plans triggered a red **Budget CI / check** job because `components/SettingsModal.tsx` directly read `result.error` on a Telegram success/failure union. Vite build and source-level regression tests alone did not reject this: Vite transpiles TypeScript without a complete `tsc` diagnostic pass. The current implementation uses `'error' in result` and passes typecheck. A historical red run is not evidence that the latest commit is failing.

The Node.js 20 deprecation warning was from older JavaScript action runtimes, not from the app's configured Node.js version. We upgraded `checkout` and `setup-node` to v5 (Node.js 24 runtimes) and `upload-artifact` to v6.

## Mandatory checks on every PR, and main
1. `Budget CI / check`: Node 24, install, `npx tsc --noEmit` **before** `npm run build` (which runs all prebuild regression tests).
2. `Budget checks / test-and-build`: independent preserved check name for compatibility with existing protection rules; same typecheck-first sequence and Node 24.
3. `Budget browser smoke / chromium-smoke`: smoke test on each PR and main push, with Chromium screenshots attached, not just when the browser test file changes.
4. `tests/ciWorkflowGuard.test.mjs`: source-level regression so accidental removal/reordering of gates breaks `prebuild`.

`npm install` is retained because this repository has `bun.lock`, not `package-lock.json`; `npm ci` would fail without the npm lockfile. Do not silently switch package managers during a UI or release fix.

## GitHub repository setting required (one-time manual configuration)
The installed GitHub connector does **not** expose branch rulesets/protection mutation; this cannot be certified as enabled by a workflow YAML change. Repository owner must open **Settings → Rules → Rulesets**, create/enable a branch ruleset targeting `main` (or update existing branch protection), and:
- Require a pull request before merging.
- Require status checks to pass; choose **Budget CI / check**, **Budget checks / test-and-build**, and **Budget browser smoke / chromium-smoke**, after their latest runs have appeared.
- Require branches to be up to date before merging if compatible with the team's workflow; disallow bypasses for production.
- Keep Vercel production deployments triggered only by GitHub merges to `main`.

A failing / cancelled / missing required check means **do not merge**. A local successful `npm run build` never overrides a red GitHub run. If the branch already merged, treat the GitHub failure as a production follow-up, not proof of a successful release.

## Before each release
Verify **exact PR head SHA** against the passing workflow run and run summary, not against an earlier commit or a preview build. Confirm the Vercel production deployment is `READY`, its `githubCommitSha` matches the actual `main` merge commit, and the production alias points to that deployment. Check browser UI and two-account/financial scenarios separately; CI does not replace user-data end-to-end verification.

Issue: https://github.com/Galogen4eg/Budget/issues/53

## Visual acceptance (Terra v2.1)
For UI changes, reread docs/ui-design-contract.md VA-01–VA-08 before starting and before release. Review all reachable modified screen/dialog/menu/editor/transition states, not just page screenshots. Require measured geometry, contrast, actual before/after screenshot review and functional browser scenarios with synthetic family data, on the exact candidate SHA. Record missing coverage explicitly; do not merge on a red required check or unaccepted visual scope. This is a review requirement, not a claim that CI can judge subjective visual quality.

### Browser geometry precision
The nominal touch target remains 44 × 44 CSS px. For DOMRect/bounding-box measurements, use `tests/touchTargetGeometry.mjs` with a 1/1024 CSS px numerical epsilon (smaller than a Chromium layout unit). Do not use this to accept real shrinking transitions or undersized controls. Regression cases include the observed 43.999996 px floating-point error and actual 43.89/41.72 px undersized targets. Keep checking both dimensions and preserve real interaction tests.
