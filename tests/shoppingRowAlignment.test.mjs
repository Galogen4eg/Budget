import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('mobile and desktop shopping use the same author-first metadata and row geometry contract',()=>{
 for(const file of ['components/ShoppingListMobile.tsx','components/ShoppingListDesktop.tsx']){
  const s=read(file);
  const a=s.indexOf('data-shopping-title'),b=s.indexOf('data-shopping-author',a),c=s.indexOf('terra-shopping-priority',b);
  assert.ok(a>=0&&b>a&&c>b,file+' title/author/priority order');
  assert.match(s,/terra-active-shopping-row/);
  assert.match(s,/terra-shopping-name/);
  assert.match(s,/data-shopping-controls/);
  assert.match(s,/data-shopping-quantity/);
  assert.match(s,/data-shopping-unit/);
  assert.doesNotMatch(s.split('data-shopping-quantity')[1].split('</span>')[0],/item\.unit/);
 }
 const css=read('public/terra-ui.css');
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) max-content/);
 assert.match(css,/grid-template-columns:44px minmax\(0,1fr\)/);
 assert.match(css,/\.terra-shopping-quantity\{[^}]*width:52px/);
 assert.match(css,/\.terra-shopping-unit\{[^}]*grid-column:1\/-1/);
 assert.match(css,/@media\(max-width:479px\)/);
});
