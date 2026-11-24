import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ci = read('.github/workflows/budget-ci.yml');
const checks = read('.github/workflows/budget-checks.yml');
const browser = read('.github/workflows/budget-browser-smoke.yml');
const settings = read('components/SettingsModal.tsx');

test('Telegram failure branch narrows discriminated result before accessing error',()=>{
 assert.match(settings,/['"]error['"] in result \? result\.error/);
 assert.doesNotMatch(settings,/toast\.error\(result\.error\)/);
});
test('one authoritative full gate typechecks before tests and production build on each PR',()=>{
 for(const workflow of [ci,checks]){
  assert.match(workflow,/pull_request:/);
  assert.match(workflow,/push:/);
  assert.match(workflow,/branches: \[main\]/);
  assert.match(workflow,/node-version: ['"]24['"]/);
 }
 const typeIndex=ci.indexOf('npx tsc --noEmit');
 const buildIndex=ci.indexOf('npm run build');
 assert.ok(typeIndex>=0 && buildIndex>typeIndex,'Budget CI must typecheck before full tests/build');
 assert.doesNotMatch(checks,/npx tsc --noEmit|npm run build/,'Budget checks must not duplicate expensive full gates');
 assert.match(checks,/tests\/familyBudgetProjection\.test\.mjs/);
 assert.match(checks,/tests\/ciWorkflowGuard\.test\.mjs/);
});

test('browser smoke builds real preview without re-running full test suite',()=>{
 assert.match(browser,/npx vite build/);
 assert.doesNotMatch(browser,/npm run build|npx tsc --noEmit/);
 assert.match(browser,/playwright install --with-deps --only-shell chromium/);
});
test('UI browser smoke runs for every PR, not only edits to smoke tests',()=>{
 assert.match(browser,/pull_request:/);
 assert.match(browser,/push:/);
 assert.doesNotMatch(browser,/paths:\s*\n/);
 assert.match(browser,/tests\/budgetBrowserSmoke\.mjs/);
});
test('GitHub Action runtimes use maintained Node24-based versions',()=>{
 for(const workflow of [ci,checks,browser]){
  assert.match(workflow,/actions\/checkout@v5/);
  assert.match(workflow,/actions\/setup-node@v5/);
 }
 assert.match(browser,/actions\/upload-artifact@v6/);
});

test('quota guard: smoke test blocks external APIs and service workers',()=>{
 const smoke=read('tests/budgetBrowserSmoke.mjs');
 assert.match(smoke,/Browser smoke requires a loopback preview/);
 assert.match(smoke,/origin===previewOrigin\|\|\(request\.method\(\)==='GET'&&staticTypes\.get\(origin\)===request\.resourceType\(\)\)/);
 assert.match(smoke,/return allowed\?route\.continue\(\):route\.abort\(\)/);
 assert.match(smoke,/https:\/\/cdn\.tailwindcss\.com/);
 assert.doesNotMatch(smoke,/https:\/\/[^'\"\n]*firebase/);
 assert.equal((smoke.match(/serviceWorkers:'block'/g)||[]).length,2);
 assert.match(smoke,/await isolate\(page\)/);
 assert.match(smoke,/await isolate\(dark\)/);
});
test('quota guard: shared financial listeners do not restart on profile discovery',()=>{
 const data=read('contexts/DataContext.tsx');
 assert.match(data,/const financialQueryMemberId=householdPersonal\?linkedMemberId:undefined/);
 assert.match(data,/\[familyId,user\?\.uid,policyReady,householdPersonal,financialQueryMemberId\]/);
 assert.match(data,/familyId && user\?\.uid \? subscribeToGlobalRules/);
});
test('quota guard: correcting one savings row does not rescan the ledger',()=>{
 assert.doesNotMatch(settings,/await confirmExternalSavingsTransfer[^\n]*await checkReadiness/);
 assert.match(settings,/savingsLinkIssues:prev\.savingsLinkIssues\?\.filter\(row=>row\.id!==issue\.id\)/);
 assert.match(settings,/После исправления всех записей повторите проверку/);
 assert.match(settings,/!!readiness\.issues\.length/);
});
test('quota exhaustion produces explicit HTTP 429 and client cooldown',()=>{
 const api=read('api/budget-policy.js'),db=read('utils/db.ts');
 assert.match(api,/error\?\.code===8/);
 assert.match(api,/res\.status\(429\)\.json\(\{code:'firestore-quota'/);
 assert.match(db,/Date\.now\(\)<budgetPolicyRetryAt/);
 assert.match(db,/budgetPolicyRetryAt=Date\.now\(\)\+300_000/);
});
