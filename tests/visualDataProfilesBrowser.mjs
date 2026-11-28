import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {makeVisualDataProfiles} from './fixtures/visualDataProfiles.mjs';
const visible=locator=>locator.filter({visible:true}).first();
const out='artifacts/terra-v2-pilot';
const money=cents=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:Math.abs(cents)%100?2:0,maximumFractionDigits:2}).format(cents/100)+' ₽';
const norm=text=>text.replace(/[\s\u00a0\u202f]+/g,' ').trim();
async function replace(db,collection,records){
 const old=await collection.get();
 for(let i=0;i<old.docs.length;i+=400){const batch=db.batch();for(const doc of old.docs.slice(i,i+400))batch.delete(doc.ref);await batch.commit();}
 for(let i=0;i<records.length;i+=400){const batch=db.batch();for(const doc of records.slice(i,i+400))batch.set(collection.doc(doc.id),doc.data);await batch.commit();}
}
async function assertMoney(page,values,expected,label){
 await values.first().waitFor({state:'visible',timeout:20000});
 // Wait for the Firestore subscription and for the selected ledger to render.
 const handles=await values.all();
 assert.ok(handles.length>=expected.length,label+' missing totals');
 for(let i=0;i<expected.length;i++){
  const handle=await handles[i].elementHandle();
  await page.waitForFunction(({el,want})=>el?.textContent?.replace(/[\s\u00a0\u202f]+/g,' ').trim()===want,{el:handle,want:norm(money(expected[i]))},{timeout:20000});
 }
}
async function inspect(page,root,label){
 const geometry=await root.evaluate(el=>{
  const cards=[...el.querySelectorAll('.terra-layout-surface')].filter(n=>n.getClientRects().length);
  return {overflow:el.scrollWidth-el.clientWidth,cards:cards.map(n=>({id:n.dataset.testid||'',overflow:n.scrollWidth-n.clientWidth})),
   headings:[...el.querySelectorAll('[data-overview-section-head] h3')].filter(n=>n.getClientRects().length).map(n=>({text:n.textContent,height:n.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(n).lineHeight)}))};
 });
 assert.ok(geometry.overflow<=2,label+' page overflow '+JSON.stringify(geometry));
 for(const card of geometry.cards)assert.ok(card.overflow<=2,label+' card overflow '+JSON.stringify(card));
 console.log('VISUAL PROFILE GEOMETRY '+label+' '+JSON.stringify(geometry));
 await page.evaluate(async()=>{await document.fonts.ready;});
 await page.screenshot({path:out+'/profile-'+label+'.png',animations:'disabled'});
}
export async function runVisualDataProfiles(page,{db,family,settingsRef,members,now}){
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Visual profile test requires both isolated emulators');
 if(!family.id.startsWith('crud-'))throw new Error('Expected disposable test family');
 const rows=family.collection('transactions'),categories=family.collection('categories');
 const originalRows=(await rows.get()).docs.map(doc=>({id:doc.id,data:doc.data()}));
 const originalSettings=(await settingsRef.get()).data();
 const profiles=makeVisualDataProfiles({now,members});
 const profileCategories=profiles.flatMap(p=>p.categories);
 const beforeCategory=new Map();
 for(const cat of profileCategories){const ref=categories.doc(cat.id);const old=await ref.get();beforeCategory.set(cat.id,old.exists?old.data():null);}
 await mkdir(out,{recursive:true});
 try{
  for(const cat of profileCategories)await categories.doc(cat.id).set(cat);
  for(const profile of profiles){
   await replace(db,rows,profile.transactions.map(data=>({id:data.id,data})));
   await page.reload({waitUntil:'domcontentloaded'});
   const nav=page.locator('nav');
   await visible(nav.getByRole('button',{name:'Обзор',exact:true})).waitFor({state:'visible',timeout:60000});
   for(const theme of ['light','dark']){
    await settingsRef.set({theme,privacyMode:false,defaultBudgetMode:'family'},{merge:true});
    await page.waitForFunction(t=>document.documentElement.classList.contains('dark')===(t==='dark'),theme);
    for(const [width,height] of [[320,568],[390,844],[1440,900]]){
     await page.setViewportSize({width,height});
     const suffix=width<768?'mobile':'desktop';
     await visible(nav.getByRole('button',{name:'Обзор',exact:true})).click();
     const overview=page.locator('[data-tab-panel="overview"]');
     await assertMoney(page,visible(overview.locator('[data-overview-month-money]')).locator('dd'),[profile.expected.incomeCents,profile.expected.expenseCents],profile.id+' overview');
     const label=profile.id+'-'+theme+'-'+width;
     await overview.getByTestId('overview-scroll-container').evaluate(el=>el.scrollTop=0);
     await inspect(page,visible(overview.locator('[data-terra-layout="'+suffix+'"]')),label+'-overview');
     const category=overview.getByTestId('overview-categories-'+suffix);
     await category.scrollIntoViewIfNeeded();
     await page.screenshot({path:out+'/profile-'+label+'-categories.png',animations:'disabled'});
     await visible(nav.getByRole('button',{name:'Бюджет',exact:true})).click();
     const budget=page.locator('[data-tab-panel="budget"]');
     const totals=visible(budget.getByTestId('budget-month-totals'));
     await assertMoney(page,totals.locator('dd'),[profile.expected.incomeCents,profile.expected.expenseCents,profile.expected.incomeCents-profile.expected.expenseCents],profile.id+' budget');
     const layout=visible(budget.locator('[data-terra-layout="'+suffix+'"]'));
     await layout.evaluate(el=>el.scrollTop=0);
     await inspect(page,layout,label+'-budget');
     console.log('PASS VISUAL PROFILE '+label+' exact monthly totals and geometry');
    }
   }
  }
 }finally{
  await replace(db,rows,originalRows);
  for(const [id,data] of beforeCategory){const ref=categories.doc(id);if(data)await ref.set(data);else await ref.delete();}
  if(originalSettings)await settingsRef.set(originalSettings);
  await page.setViewportSize({width:1440,height:900});
 }
}
