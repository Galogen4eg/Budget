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
