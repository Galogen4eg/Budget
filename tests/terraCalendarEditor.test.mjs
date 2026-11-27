import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatCalendarMonthTitle,calendarEventCountLabel} from '../utils/calendarDates.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('calendar month headings preserve every letter and use the same local month on both layouts',()=>{
 assert.equal(formatCalendarMonthTitle(new Date(2026,7,1)),'Август 2026');
 assert.equal(formatCalendarMonthTitle(new Date(2027,0,1)),'Январь 2027');
});
test('calendar event count uses the Russian plural rules including teens',()=>{
 for(const [n,label] of [[0,'0 событий'],[1,'1 событие'],[2,'2 события'],[5,'5 событий'],[11,'11 событий'],[21,'21 событие'],[24,'24 события']])assert.equal(calendarEventCountLabel(n),label);
});
test('calendar participant selection is owned by the shared parent, not recreated on resize',()=>{
 const parent=read('components/FamilyPlans.tsx');
 assert.match(parent,/const \[filterMemberId,setFilterMemberId\]=useState/);
 assert.match(parent,/filterMemberId,setFilterMemberId,/);
 for(const name of ['FamilyPlansDesktop','FamilyPlansMobile']){
  const source=read('components/'+name+'.tsx');
  assert.doesNotMatch(source,/const \[filterMemberId,\s*setFilterMemberId\]/);
  assert.match(source,/filterMemberId:\s*string/);
  assert.match(source,/formatCalendarMonthTitle\(currentDate\)/);
 }
});
test('event editor puts title before recurrence and exposes accessible reminder controls',()=>{
 const source=read('components/EventModal.tsx');
 assert.ok(source.indexOf('id="event-title-input"')<source.indexOf('>Повторять'));
 for(const label of ['Количество для напоминания','Единица времени напоминания','Закрыть настройку напоминания'])assert.ok(source.includes('aria-label="'+label+'"'));
 assert.match(source,/aria-label=\{\x60Удалить напоминание:/);
});
