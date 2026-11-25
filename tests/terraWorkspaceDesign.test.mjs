import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('budget and shopping use content-based layout while preserving scroll containers',()=>{
 const css=read('public/terra-ui.css');
 for(const [file,cls] of [['TerraBudget.tsx','budget'],['ShoppingListDesktop.tsx','shopping']]){
  const code=read('components/'+file);
  assert.match(code,new RegExp('terra-'+cls+'-layout'));
  assert.match(code,new RegExp('terra-'+cls+'-columns'));
  assert.match(css,new RegExp('\\.terra-'+cls+'-columns'));
 }
});
test('voice and transaction forms have no decorative bounce or full-dialog drag dismissal',()=>{
 const shopping=read('components/ShoppingListDesktop.tsx'),form=read('components/AddTransactionModal.tsx');
 assert.doesNotMatch(shopping,/animate-bounce|animate-ping/);
 assert.doesNotMatch(form,/drag="y"|Автоправило уже запомнено|АКТИВНО/);
 assert.match(form,/role="dialog" aria-modal="true"/);
});
test('desktop month picker exposes a named options group',()=>{
 const code=read('components/overview/OverviewHeaderBar.tsx');
 assert.match(code,/aria-controls="overview-month-options"/);
 assert.match(code,/id="overview-month-options" role="group" aria-label="Доступные месяцы"/);
});
