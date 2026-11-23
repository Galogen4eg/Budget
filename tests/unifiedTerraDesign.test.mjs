import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../components/'+name,import.meta.url),'utf8');
const token=read('filterUiTokens.ts');
const plan=read('FamilyPlansMobile.tsx');
const budget=read('TerraBudget.tsx');
const overview=read('TerraOverview.tsx');
const shopping=read('ShoppingListMobile.tsx');
const services=read('ServicesHub.tsx');
const chat=read('FamilyChat.tsx');
const mobileHeader=read('TerraMobileHeader.tsx');
const agenda=read('FamilyAgendaPanel.tsx');
const plansDesktop=read('FamilyPlansDesktop.tsx');

test('shared Terra tokens define stable spacing, nonshrinking controls and calm surfaces',()=>{
 assert.match(token,/overflow-x-auto/);
 assert.match(token,/overscroll-x-contain/);
 assert.match(token,/flex-none shrink-0/);
 assert.match(token,/whitespace-nowrap/);
 assert.match(token,/min-h-\[44px\]/);
 assert.match(token,/SURFACE_CARD/);
 assert.match(token,/PAGE_HEADING/);
});
test('plans and both budget modes use same filter rail and chips',()=>{
 assert.match(plan,/FILTER_RAIL/);
 assert.match(plan,/FILTER_CHIP/);
 assert.match(budget,/FILTER_RAIL/);
 assert.match(budget,/FILTER_CHIP/);
 assert.match(plan,/aria-pressed=\{isSelected\}/);
 assert.match(budget,/aria-pressed=\{selectedMember ===/);
});
test('overview chart periods do not shrink individual labels',()=>{
 assert.match(overview,/FILTER_CHIP/);
 assert.match(overview,/FILTER_RAIL/);
});
test('shopping presets and sections use shared visual language',()=>{
 assert.match(shopping,/FILTER_CHIP/);
 assert.match(shopping,/SURFACE_CARD/);
});
test('services cards share surface style',()=>{
 assert.match(services,/SURFACE_CARD/);
});

test('chat and shared mobile header use consistent page hierarchy and controls',()=>{
 assert.match(chat,/Создать тему/);
 assert.match(chat,/rounded-none md:rounded-2xl/);
 assert.match(mobileHeader,/PAGE_HEADING/);
 assert.match(mobileHeader,/w-11 h-11/);
});

test('calendar agenda and desktop view controls use nonshrinking tokens',()=>{
 assert.match(agenda,/FILTER_RAIL/);
 assert.match(agenda,/FILTER_CHIP/);
 assert.match(plansDesktop,/aria-label="Вид календаря"/);
 assert.match(plansDesktop,/FILTER_CHIP/);
});
