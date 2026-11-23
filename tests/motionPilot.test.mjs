import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { agendaDisclosureTransition } from '../utils/uiMotion.ts';

const agenda = readFileSync(new URL('../components/FamilyAgendaPanel.tsx', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('reuse installed Framer Motion rather than adding a second Motion dependency', () => {
  assert.ok(pkg.dependencies['framer-motion']);
  assert.equal(pkg.dependencies.motion, undefined);
  assert.match(agenda, /from 'framer-motion'/);
});

test('disclosure motion is short, deterministic, and absent for reduced-motion users', () => {
  assert.deepEqual(agendaDisclosureTransition(false), { duration: 0.2, ease: 'easeOut' });
  assert.deepEqual(agendaDisclosureTransition(true), { duration: 0 });
});

test('agenda disclosure has animated height and a stable non-animated parent scroll', () => {
  assert.match(agenda, /<AnimatePresence initial=\{false\}>/);
  assert.match(agenda, /height: 0/);
  assert.match(agenda, /height: 'auto'/);
  assert.match(agenda, /aria-controls="family-agenda-content"/);
  assert.match(agenda, /useReducedMotion\(\)/);
  assert.match(agenda, /useMedia\('\(min-width: 768px\)'/);
});

test('disclosure hides exiting content from keyboard and assistive technology', () => {
  assert.match(agenda, /contentRef\.current\.inert=!panelOpen/);
  assert.match(agenda, /aria-hidden=\{!panelOpen\}/);
  assert.match(agenda, /aria-expanded=\{panelOpen\}/);
});

test('calendar-only agenda still excludes budget payments', () => {
  assert.doesNotMatch(agenda, /paymentAgenda\(/);
  assert.doesNotMatch(agenda, /linkedExpenseId/);
});
