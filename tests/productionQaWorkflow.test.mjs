import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/budget-production-qa-access.yml', import.meta.url), 'utf8');
const live = workflow.split('  read-only-access:\n')[1] ?? '';
const validation = workflow.split('  validate-scripts:\n')[1]?.split('  read-only-access:\n')[0] ?? '';

test('production QA is manually dispatched; PRs only validate script syntax without credentials', () => {
  assert.equal(live.split('\n')[0], "    if: github.event_name == 'workflow_dispatch'");
  assert.match(validation, /github\.event_name == 'pull_request'/);
  assert.match(validation, /node --check/);
  assert.doesNotMatch(validation, /secrets\.|firebase-tools|npm install/);
});

test('manual release QA keeps all stages and stops subsequent stages on failure', () => {
  assert.doesNotMatch(live, /always\(\)|continue-on-error/);
  for (const script of ['productionQaAccess.mjs','productionTransactionCrud.mjs','productionNavigation.mjs','productionModulesCrud.mjs']) {
    assert.ok(live.includes('run: node tests/' + script), script);
  }
});
