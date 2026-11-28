import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../public/terra-ui.css',import.meta.url),'utf8');
const read=selector=>Object.fromEntries([...css.match(new RegExp(selector+'\\s*\\{([^}]+)\\}'))[1].matchAll(/--terra-([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m=>[m[1],m[2]]));
const luma=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
const contrast=(a,b)=>(Math.max(luma(a),luma(b))+0.05)/(Math.min(luma(a),luma(b))+0.05);
test('Terra semantic text and control token pairs meet contrast in light and dark',()=>{
 const light=read(':root'),dark={...light,...read('html\\.dark')};
 for(const palette of [light,dark]){
  for(const [a,b,min] of [['ink','surface',4.5],['muted','soft',4.5],['primary-text','canvas',4.5],['primary-text','surface',4.5],['primary-text','soft',4.5],['primary-text','primary-soft',4.5],['on-primary','primary-solid',4.5],['on-primary','primary-hover',4.5],['danger-text','danger-soft',4.5],['danger-text','surface',4.5],['on-danger','danger-solid',4.5],['on-danger','danger-hover',4.5],['income-chart','surface',3],['expense-chart','surface',3],['offline-text','offline-soft',4.5],['pending-text','pending-soft',4.5],['focus','soft',3],['control-border','soft',3]]){
   assert.ok(palette[a]&&palette[b],a+'/'+b+' missing');
   assert.ok(contrast(palette[a],palette[b])>=min,a+'/'+b);
  }
 }
});
