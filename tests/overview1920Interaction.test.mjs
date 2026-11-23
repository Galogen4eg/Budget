import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftCalendarMonth} from '../utils/calendarMonthNavigation.ts';
const overview=readFileSync(new URL('../components/TerraOverview.tsx',import.meta.url),'utf8');
const header=readFileSync(new URL('../components/overview/OverviewHeaderBar.tsx',import.meta.url),'utf8');

test('Overview month stepping uses existing month-clamping helper at end of months',()=>{
 assert.match(overview,/shiftCalendarMonth\(activeMonth, step\)/);
 assert.doesNotMatch(overview,/next\.setMonth\(next\.getMonth\(\) \+ step\)/);
 assert.equal(shiftCalendarMonth(new Date(2027,0,31),1).getMonth(),1);
});
test('1920px desktop expense graph controls do not collapse to 25px tap targets',()=>{
 assert.match(overview,/aria-label="Период динамики расходов на ПК"/);
 assert.match(overview,/aria-pressed=\{chartScale === scale\}/);
 assert.match(overview,/min-h-\[44px\].*shrink-0/);
});
test('desktop month picker options meet minimum accessible pointer size',()=>{
 assert.match(header,/aria-expanded=\{isMonthPickerOpen\}/);
 assert.match(header,/min-h-\[44px\] w-full text-left/);
});
