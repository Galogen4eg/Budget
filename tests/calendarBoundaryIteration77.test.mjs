import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('iteration 77: calendar foreground notifications only use plan/event occurrences',()=>{
 const source=read('../components/FamilyPlans.tsx');
 assert.doesNotMatch(source,/paymentAgenda\(/);
 assert.doesNotMatch(source,/settings\.mandatoryExpenses/);
 assert.doesNotMatch(source,/settings\.manualPaidExpenses/);
 assert.match(source,/dueCalendarNotifications\(future,now,ownProfileId,since\)/);
});

test('iteration 77: Telegram calendar payload does not add budget bills or paid markers',()=>{
 const source=read('../utils/calendarTelegramServer.ts');
 assert.doesNotMatch(source,/payments:settings\.mandatoryExpenses/);
 assert.doesNotMatch(source,/payments:input\.settings\.mandatoryExpenses/);
 assert.doesNotMatch(source,/paid:settings\.manualPaidExpenses/);
 assert.doesNotMatch(source,/paid:input\.settings\.manualPaidExpenses/);
 assert.match(source,/events:input\.events/);
 assert.match(source,/members:input\.members/);
});

test('iteration 77: plans UI does not offer financial expense creation as a calendar event',()=>{
 const source=read('../components/FamilyPlans.tsx');
 assert.match(source,/buildCalendarOccurrences\(events/);
 assert.doesNotMatch(source,/linkedExpenseId:/);
});
