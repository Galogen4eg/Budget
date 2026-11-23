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
test('CI type-checks BEFORE building and testing on every pull request',()=>{
 for(const workflow of [ci,checks]){
  assert.match(workflow,/pull_request:/);
  assert.match(workflow,/push:/);
  assert.match(workflow,/branches: \[main\]/);
  const typeIndex=workflow.indexOf('npx tsc --noEmit');
  const buildIndex=workflow.indexOf('npm run build');
  assert.ok(typeIndex>=0 && buildIndex>typeIndex,'TypeScript must fail fast before Vite build');
  assert.match(workflow,/node-version: ['"]24['"]/);
 }
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
