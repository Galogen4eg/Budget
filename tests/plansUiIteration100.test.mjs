import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../components/'+name+'.tsx',import.meta.url),'utf8');
test('plans use a single page scroll on desktop and phone',()=>{
 const root=read('FamilyPlans');
 const desktop=read('FamilyPlansDesktop');
 assert.match(root,/overflow-y-auto overscroll-y-contain touch-pan-y/);
 assert.doesNotMatch(root,/lg:overflow-hidden/);
 assert.doesNotMatch(desktop,/overflow-y-auto/);
 assert.match(desktop,/grid grid-cols-7 gap-2 min-w-0/);
});
test('plans retain event actions and distinguish selected day from today',()=>{
 const desktop=read('FamilyPlansDesktop');
 const mobile=read('FamilyPlansMobile');
 for(const source of [desktop,mobile]){
  assert.match(source,/aria-pressed=\{viewMode === 'day'\}/);
  assert.match(source,/aria-label=\{\x60Открыть событие:/);
  assert.match(source,/onOpenEvent/);
  assert.match(source,/onSendToTelegram/);
 }
 assert.doesNotMatch(desktop,/evt.time \|\| '10:00'/);
 assert.match(desktop,/События дня/);
});
test('agenda remains collapsible and editor retains bounded native scroll',()=>{
 const agenda=read('FamilyAgendaPanel');
 assert.match(agenda,/const panelOpen=expanded/);
 assert.match(agenda,/aria-expanded=\{panelOpen\}/);
 assert.match(agenda,/onToggleTask\(event\)/);
 assert.match(read('EventModal'),/custom-scrollbar overscroll-y-contain touch-pan-y/);
});
