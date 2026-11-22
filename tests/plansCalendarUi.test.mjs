import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const mobile=readFileSync(new URL('../components/FamilyPlansMobile.tsx',import.meta.url),'utf8');
const desktop=readFileSync(new URL('../components/FamilyPlansDesktop.tsx',import.meta.url),'utf8');
const editor=readFileSync(new URL('../components/EventModal.tsx',import.meta.url),'utf8');
test('calendar day cells are keyboard-accessible buttons with selected-state feedback',()=>{
 assert.match(mobile, /aria-pressed=\{isSelected\}/);
 assert.match(mobile, /aria-label=\{\x60Выбрать \$\{day\}/);
});
test('month navigation uses safe date utility on both screen sizes',()=>{
 assert.match(mobile, /shiftCalendarMonth\(currentDate, increment\)/);
 assert.match(desktop, /shiftCalendarMonth\(currentDate, dir\)/);
});
test('mobile calendar has reachable navigation and view controls',()=>{
 assert.match(mobile, /min-h-\[44px\]/);
 assert.match(mobile, /aria-pressed=\{viewMode === 'month'\}/);
 assert.match(mobile, /aria-pressed=\{viewMode === 'week'\}/);
 assert.match(mobile, /aria-pressed=\{viewMode === 'list'\}/);
});
test('event editor is usable on small screens with accessible actions',()=>{
 assert.match(editor, /aria-label="Закрыть редактор события"/);
 assert.match(editor, /min-h-\[44px\]/);
 assert.match(editor, /focus-visible:ring-2/);
});
