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
async function assertMoney(page,selector,expected,label,positiveNet=false){
 const wants=expected.map((value,i)=>norm((positiveNet&&i===2&&value>0?'+':'')+money(value)));
 try{
  await page.waitForFunction(({selector,wants})=>{
   const root=[...document.querySelectorAll(selector)].find(el=>el.getClientRects().length&&!el.closest('[hidden],[inert]'));
   const actual=root?[...root.querySelectorAll('dd')].map(el=>el.textContent.replace(/[\s\u00a0\u202f]+/g,' ').trim()):[];
   return wants.every((want,i)=>actual[i]===want);
  },{selector,wants},{timeout:20000});
 }catch(error){console.error('VISUAL PROFILE TOTALS '+label+' '+JSON.stringify({wants,actual:await page.locator(selector).filter({visible:true}).first().locator('dd').allTextContents()}));throw error;}
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
export async function runVisualDataProfiles(page,{db,family,settingsRef,members,now,sections=['overview']}){
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Visual profile test requires both isolated emulators');
 if(!family.id.startsWith('crud-'))throw new Error('Expected disposable test family');
 const rows=family.collection('transactions'),categories=family.collection('categories');
 const shopping=family.collection('shopping'),events=family.collection('events');
 const snapshots=await Promise.all([rows,shopping,events].map(async collection=>(await collection.get()).docs.map(doc=>({id:doc.id,data:doc.data()}))));
 const [originalRows,originalShopping,originalEvents]=snapshots;
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
   await replace(db,shopping,profile.shopping.map(data=>({id:data.id,data})));
   await replace(db,events,profile.events.map(data=>({id:data.id,data})));
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
     await assertMoney(page,'[data-tab-panel="overview"] [data-overview-month-money]',[profile.expected.incomeCents,profile.expected.expenseCents],profile.id+' overview');
     const label=profile.id+'-'+theme+'-'+width;
     await overview.getByTestId('overview-scroll-container').evaluate(el=>el.scrollTop=0);
     await inspect(page,visible(overview.locator('[data-terra-layout="'+suffix+'"]')),label+'-overview');
     const category=overview.getByTestId('overview-categories-'+suffix);
     await category.scrollIntoViewIfNeeded();
     const bars=await category.locator('[data-overview-category-fill]').evaluateAll(nodes=>nodes.map(el=>{
       const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;
       const ctx=canvas.getContext('2d');
       function rgb(color){ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);}
       function luminance(channels){return channels.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);}
       const a=luminance(rgb(getComputedStyle(el).backgroundColor)),b=luminance(rgb(getComputedStyle(el.parentElement).backgroundColor));
       return {contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),width:parseFloat(el.style.width)};
     }));
     for(const bar of bars){assert.ok(bar.contrast>=3,label+' category bar contrast '+JSON.stringify(bar));assert.ok(bar.width>0,label+' nonzero category share vanished');}
     if(profile.id==='skewed')assert.ok(bars.length>=6,label+' expected six preview categories');
     const heading=category.locator('h3');
     if(width>=390&&width<768){const lines=await heading.evaluate(el=>el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight));assert.ok(lines<=1.05,label+' category heading wraps unnecessarily');}

     await page.screenshot({path:out+'/profile-'+label+'-categories.png',animations:'disabled'});
     const chart=overview.getByTestId('overview-chart-'+suffix);
     await visible(chart.getByRole('button',{name:'Месяц',exact:true})).click();
     await chart.scrollIntoViewIfNeeded();
     await inspect(page,chart,label+'-month-chart');
     if(profile.id==='empty'||profile.id==='income-only')assert.equal(await chart.locator('.recharts-bar-rectangle path').count(),0,label+' chart must not invent expenses');
     if(profile.id==='kopeck')assert.ok(await chart.locator('.recharts-bar-rectangle path').count()>0,label+' one kopeck must have a graph');
     await visible(chart.getByRole('button',{name:'День',exact:true})).click();
     const shop=visible(overview.getByTestId('overview-shopping-card'));
     await shop.scrollIntoViewIfNeeded();
     const expectedShop=Math.min(4,profile.shopping.length);
     await page.waitForFunction(({count})=>[...document.querySelectorAll('[data-testid="overview-shopping-card"]')].some(el=>el.getClientRects().length&&el.querySelectorAll('button[aria-label^="Отметить покупку"]').length===count),{count:expectedShop});
     await inspect(page,shop,label+'-shopping');
     const eventCard=overview.getByTestId('overview-events-'+suffix);
     if(profile.events.length){
      await eventCard.waitFor({state:'visible'});await eventCard.scrollIntoViewIfNeeded();
      assert.equal(await eventCard.getByRole('button',{name:/^Открыть событие:/}).count(),Math.min(3,profile.events.length),label+' event preview count');
      await inspect(page,eventCard,label+'-events');
     }else await eventCard.waitFor({state:'hidden'});
     if(profile.id==='large-and-long'&&width===390){
      const history=overview.getByTestId('overview-history-'+suffix);
      const edit=history.getByRole('button',{name:/^Редактировать операцию: Очень длинное синтетическое/});
      await edit.click();
      const editor=page.getByRole('dialog',{name:'Редактирование операции',exact:true});
      await editor.waitFor({state:'visible'});await inspect(page,editor,label+'-long-operation-editor');
      await visible(editor.getByRole('button',{name:'Закрыть модальное окно',exact:true})).click();
      await editor.waitFor({state:'hidden'});
      assert.equal(await edit.evaluate(el=>document.activeElement===el),true,label+' editor focus return');
     }
     if(sections.includes('budget')){
     await visible(nav.getByRole('button',{name:'Бюджет',exact:true})).click();
     const budget=page.locator('[data-tab-panel="budget"]');
     await assertMoney(page,'[data-tab-panel="budget"] [data-testid="budget-month-totals"]',[profile.expected.incomeCents,profile.expected.expenseCents,profile.expected.incomeCents-profile.expected.expenseCents],profile.id+' budget',true);
     const layout=visible(budget.locator('[data-terra-layout="'+suffix+'"]'));
     await layout.evaluate(el=>el.scrollTop=0);
     await inspect(page,layout,label+'-budget');
     }
     console.log('PASS VISUAL PROFILE '+label+' exact monthly totals and geometry');
    }
   }
  }
 }finally{
  await replace(db,rows,originalRows);
  await replace(db,shopping,originalShopping);
  await replace(db,events,originalEvents);
  for(const [id,data] of beforeCategory){const ref=categories.doc(id);if(data)await ref.set(data);else await ref.delete();}
  if(originalSettings)await settingsRef.set(originalSettings);
  await page.setViewportSize({width:1440,height:900});
 }
}
