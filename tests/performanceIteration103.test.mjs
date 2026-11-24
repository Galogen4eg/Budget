import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rememberTabVisit,shouldMountTab} from '../utils/tabLifecycle.ts';
test('heavy tabs mount on first visit, then keep state without duplicate visit updates',()=>{
 const initial={scope:'family-a',tabs:['overview']};
 assert.equal(shouldMountTab(initial,'family-a','overview','shopping'),false);
 assert.equal(shouldMountTab(initial,'family-a','shopping','shopping'),true);
 const visited=rememberTabVisit(initial,'family-a','shopping');
 assert.equal(shouldMountTab(visited,'family-a','overview','shopping'),true);
 assert.equal(rememberTabVisit(visited,'family-a','shopping'),visited);
});
test('visited tabs do not carry into another account or family',()=>{
 const previous={scope:'family-a',tabs:['overview','shopping','chat']};
 assert.equal(shouldMountTab(previous,'family-b','overview','chat'),false);
 assert.deepEqual(rememberTabVisit(previous,'family-b','overview'),{scope:'family-b',tabs:['overview']});
});
test('app lazy loads expensive tabs but keeps plans and notifications running',()=>{
 const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 for(const [tab,component] of [['budget','TerraBudget'],['shopping','ShoppingList'],['chat','FamilyChat'],['services','ServicesHub']]){
  assert.ok(app.includes("const "+component+" = React.lazy"));
  assert.ok(app.includes("mountTab('"+tab+"') && <Suspense"));
 }
 assert.match(app,/<FamilyPlans\s/);
 assert.doesNotMatch(app,/mountTab\('plans'\)/);
 const plans=readFileSync(new URL('../components/FamilyPlans.tsx',import.meta.url),'utf8');
 assert.match(plans,/occurrenceCache\.from!==range\.from/);
 assert.match(plans,/dueCalendarNotifications\(future,now,ownProfileId,since\)/);
 assert.match(plans,/setInterval\(tick,30000\)/);
});
