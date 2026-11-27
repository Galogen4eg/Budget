import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

// This function runs only against the existing populated, isolated emulator.
const out='artifacts/terra-v2-pilot';
const visible=locator=>locator.filter({visible:true}).first();
const button=(root,name,exact=true)=>visible(root.getByRole('button',{name,exact}));
async function targetSize(locator,label){
 const rect=await locator.boundingBox();assert.ok(rect&&rect.width>=44&&rect.height>=44,label+' too small '+JSON.stringify(rect));
}
async function capture(page,name){
 await page.evaluate(async()=>{await document.fonts.ready;});
 await page.screenshot({path:out+'/'+name+'.png',animations:'disabled'});
}
async function noOverflow(locator,label){
 assert.ok(await locator.evaluate(el=>el.scrollWidth<=el.clientWidth+2),label+' horizontal overflow');
}
async function axisFits(locator,label){
 try{await locator.locator('[data-terra-money-tick]').first().waitFor({state:'visible',timeout:10000});}
 catch(error){console.error('TERRA axis diagnostic '+label+' '+JSON.stringify(await locator.evaluate(el=>({text:el.textContent?.slice(0,200),svg:[...el.querySelectorAll('svg')].map(svg=>({class:svg.getAttribute('class'),text:svg.textContent?.slice(0,200)})),rect:el.getBoundingClientRect().toJSON()}))));throw error;}
 const bounds=await locator.evaluate(plot=>{
  const svg=plot.querySelector('[data-terra-money-tick]').ownerSVGElement;
  const box=svg.getBoundingClientRect();
  const ticks=Array.from(svg.querySelectorAll('[data-terra-money-tick]'));
  return {count:ticks.length,clipped:ticks.map(tick=>({text:tick.textContent,rect:tick.getBoundingClientRect().toJSON()})).filter(tick=>tick.rect.left<box.left-.5||tick.rect.right>box.right+.5||tick.rect.top<box.top-.5||tick.rect.bottom>box.bottom+.5)};
 });
 assert.ok(bounds.count>=2,label+' missing Y-axis ticks');
 assert.deepEqual(bounds.clipped,[],label+' clipped Y-axis labels');
}


// Verify computed grid tracks and actual page/card rails, not just class names.
async function assertTerraLayoutGeometry(overview,label,width){
 const layout=overview.locator('[data-terra-layout="'+(width<768?'mobile':'desktop')+'"]').filter({visible:true}).first();
 const g=await layout.evaluate(root=>{
  const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const visible=e=>e&&e.getClientRects().length>0;
  const grids=[...root.querySelectorAll('[data-terra-grid]')].filter(visible).map(e=>{const c=getComputedStyle(e);return {id:e.dataset.terraGrid,columns:c.gridTemplateColumns.trim().split(/\s+/).length,gap:parseFloat(c.columnGap),rect:rect(e),children:[...e.children].filter(visible).map(rect)};});
  const cards=[...root.querySelectorAll('.terra-layout-surface')].filter(visible).map(e=>{const c=getComputedStyle(e),head=e.querySelector('[data-overview-section-head]');return {id:e.dataset.testid,rect:rect(e),padding:[c.paddingTop,c.paddingRight,c.paddingBottom,c.paddingLeft].map(parseFloat),head:visible(head)?rect(head):null,overflow:e.scrollWidth-e.clientWidth};});
  const stacks=[...root.querySelectorAll('[data-terra-stack]')].filter(visible).map(e=>({id:e.dataset.terraStack,rect:rect(e),children:[...e.children].filter(visible).map(rect)}));
  return {grids,cards,stacks};
 });
 const near=(a,b)=>Math.abs(a-b)<=1.5,mobile=width<768,gap=mobile?12:16;
 assert.ok(g.cards.length>=5,label+' missing cards');
 for(const card of g.cards){
  assert.ok(card.padding.every(p=>near(p,gap)),label+' inconsistent card padding '+JSON.stringify(card));
  assert.ok(card.overflow<=2,label+' card overflow '+card.id);
  if(card.head)assert.ok(near(card.head.left-card.rect.left,gap+1)&&near(card.rect.right-card.head.right,gap+1),label+' card heading not on content rails '+card.id);
 }
 if(mobile){
  const grid=g.grids.find(x=>x.id==='mobile');
  assert.equal(grid.columns,4,label+' mobile grid');assert.ok(near(grid.gap,12),label+' mobile gap');
  for(const [i,c] of grid.children.entries()){assert.ok(near(c.left,g.cards[0].rect.left)&&near(c.right,g.cards[0].rect.right),label+' mobile axes');if(i)assert.ok(near(c.top-grid.children[i-1].bottom,12),label+' mobile vertical gap');}
 }else{
  const grid=g.grids.find(x=>x.id==='workspace'),summary=g.grids.find(x=>x.id==='summary');
  assert.ok([4,8,12].includes(grid.columns),label+' unexpected tracks');
  assert.equal(grid.columns,summary.columns,label+' mismatched tracks');
  assert.ok(near(grid.gap,16)&&near(grid.rect.left,summary.rect.left)&&near(grid.rect.right,summary.rect.right),label+' page axes');
  for(const stack of g.stacks)for(const [i,c] of stack.children.entries()){assert.ok(near(c.left,stack.rect.left)&&near(c.right,stack.rect.right),label+' stack axes');if(i)assert.ok(near(c.top-stack.children[i-1].bottom,16),label+' stack gap');}
  if(grid.columns===12){const [main,aside]=g.stacks,track=(grid.rect.width-11*grid.gap)/12;assert.ok(near(main.rect.width,track*8+grid.gap*7)&&near(aside.rect.width,track*4+grid.gap*3),label+' wrong 8/4 spans');assert.ok(near(main.rect.top,aside.rect.top)&&near(aside.rect.left-main.rect.right,grid.gap),label+' workspace axes');}
 }
 console.log('TERRA LAYOUT GEOMETRY '+label+' '+JSON.stringify(g));
}

// Full-width visual acceptance of the overview, with actual populated emulator data.
async function budgetGeometryPilot(page,settingsRef){
 const budget=page.locator('[data-tab-panel="budget"]');
 for(const theme of ['light','dark']){
  await settingsRef.set({theme,privacyMode:false},{merge:true});
  await page.waitForFunction(t=>document.documentElement.classList.contains('dark')===(t==='dark'),theme);
  for(const [width,height] of [[320,568],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,900],[1920,1080]]){
   const label='budget-'+theme+'-'+width,mobile=width<768,gap=mobile?12:16;
   await page.setViewportSize({width,height});
   await button(page.locator('nav'),'Бюджет').click();
   const layout=visible(budget.locator('[data-terra-layout="'+(mobile?'mobile':'desktop')+'"]'));
   await layout.waitFor({state:'visible'});
   const g=await layout.evaluate(root=>{
    const rect=e=>e.getBoundingClientRect().toJSON();
    const grids=[...root.querySelectorAll('[data-terra-grid]')].map(e=>({id:e.dataset.terraGrid,columns:getComputedStyle(e).gridTemplateColumns.trim().split(/\s+/).length,gap:parseFloat(getComputedStyle(e).columnGap),width:e.clientWidth,children:[...e.children].filter(x=>x.getClientRects().length).map(rect)}));
    const cards=[...root.querySelectorAll('.terra-layout-surface')].filter(e=>e.getClientRects().length).map(e=>({id:e.dataset.testid,padding:parseFloat(getComputedStyle(e).paddingLeft),overflow:e.scrollWidth-e.clientWidth}));
    const s=getComputedStyle(root);
    return {grids,cards,contentWidth:root.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),overflow:root.scrollWidth-root.clientWidth};
   });
   assert.ok(g.overflow<=2,label+' page overflow');
   assert.ok(g.cards.length>=5,label+' missing surfaces');
   for(const card of g.cards){assert.equal(card.padding,gap,label+' inconsistent padding '+card.id);assert.ok(card.overflow<=2,label+' overflowing card '+card.id);}
   for(const grid of g.grids){
    assert.equal(grid.gap,gap,label+' grid gap');
    const expected=mobile?4:g.contentWidth>=1040?12:g.contentWidth>=520?8:4;
    assert.equal(grid.columns,expected,label+' columns '+grid.id);
    if(grid.id==='workspace'&&expected===12){
     assert.equal(grid.children.length,2,label+' workspace columns');
     assert.ok(Math.abs(grid.children[0].top-grid.children[1].top)<=1,label+' workspace alignment');
    }
   }
   const history=visible(budget.locator('[data-testid="budget-history-'+(mobile?'mobile':'desktop')+'"]'));
   await noOverflow(history,label+' history');
   for(const row of await history.locator('[data-history-row]').all()){
    const box=await row.boundingBox();if(box)assert.ok(box.height>=48,label+' short history row');
   }
   await layout.evaluate(el=>el.scrollTop=0);
   await capture(page,'budget-reaudit-main-'+theme+'-'+width);
   await history.scrollIntoViewIfNeeded();
   await capture(page,'budget-reaudit-history-'+theme+'-'+width);
   console.log('PASS TERRA BUDGET GEOMETRY '+label);
  }
 }
}

async function overviewGeometryPilot(page,settingsRef){
 const overview=page.locator('[data-tab-panel="overview"]');
 const visibleInOverview=selector=>overview.locator(selector).filter({visible:true});
 for(const theme of ['light','dark']){
  await settingsRef.set({theme,privacyMode:false},{merge:true});
  await page.waitForFunction(t=>document.documentElement.classList.contains('dark')===(t==='dark'),theme);
  for(const [width,height] of [[320,568],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,900],[1920,1080]]){
   const label=theme+'-'+width;
   await page.setViewportSize({width,height});
   await button(page.locator('nav'),'Обзор').click();
   const limit=overview.getByTestId('overview-month-limit').filter({visible:true}).first();
   await limit.waitFor({state:'visible',timeout:20000});
   assert.equal(await limit.getAttribute('data-limit-status'),'over',label+' known dense expense exceeds limit');
   assert.match(await limit.innerText(),/Превышение:/);
   const progress=limit.getByRole('progressbar');
   assert.equal(await progress.getAttribute('aria-valuenow'),'100');
   assert.equal(await progress.locator('div').evaluate(el=>getComputedStyle(el).backgroundColor),theme==='dark'?'rgb(253, 164, 160)':'rgb(168, 50, 44)',label+' limit danger token');
   await noOverflow(limit,label+' limit');
   await assertTerraLayoutGeometry(overview,label,width);
   const toolbar=visibleInOverview(width<768?'[data-overview-mobile-controls]':'[data-overview-toolbar]').first();
   await noOverflow(toolbar,label+' controls');
   const controlBoxes=await toolbar.locator('button').filter({visible:true}).evaluateAll(nodes=>nodes.map(el=>({label:el.getAttribute('aria-label')||el.textContent,height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width,top:el.getBoundingClientRect().top})));
   assert.ok(controlBoxes.length>=3,label+' missing controls');
   for(const box of controlBoxes)assert.ok(box.height>=44&&box.width>=44,label+' too small control '+JSON.stringify(box));
   if(width>=390&&width<768||width>=1440)assert.ok(Math.max(...controlBoxes.map(x=>x.top))-Math.min(...controlBoxes.map(x=>x.top))<=1,label+' controls not aligned');
   if(width>=768){
    const summary=overview.getByTestId('overview-metrics-desktop');
    const headings=summary.locator('[data-overview-summary-heading]');
    const axes=await headings.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().top));
    if(width>=1440){
     assert.equal(axes.length,3,label+' missing summary zones');
     assert.ok(Math.max(...axes)-Math.min(...axes)<=1,label+' summary headings not aligned');
     const bounds=await summary.boundingBox();
     assert.ok(bounds.height<=212,label+' financial summary unnecessarily tall '+bounds.height);
     const zones=await summary.locator('[data-overview-summary-zone]').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().toJSON()));
     assert.ok(zones[0].right<=zones[1].left+1&&zones[1].right<=zones[2].left+1,label+' zones overlap');
    }
    await noOverflow(summary,label+' financial summary');
    const chartCard=overview.getByTestId('overview-chart-desktop');
    const plot=chartCard.getByTestId('overview-chart-plot');
    const plotBounds=await plot.boundingBox();
    assert.ok(plotBounds.height<=224,label+' chart plot too tall');
    const footer=chartCard.locator('.terra-overview-chart-footer');
    const controls=await footer.locator('summary, .terra-overview-chart-budget').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().toJSON()));
    if(controls.length===2)assert.ok(Math.abs(controls[0].top-controls[1].top)<=1,label+' chart footer actions misaligned');
    if(width>=1440)assert.ok((await chartCard.boundingBox()).height<=440,label+' graph card unnecessarily tall');
   }
   for(const header of await visibleInOverview('[data-overview-section-head]').all()){
    await noOverflow(header,label+' section header');
    for(const action of await header.getByRole('button').filter({visible:true}).all())await targetSize(action,label+' section action');
   }
   await overview.getByTestId('overview-scroll-container').evaluate(el=>{el.scrollTop=0;});
   await capture(page,'overview-reaudit-main-'+label);
   for(const kind of ['history','category']){
    const rows=visibleInOverview('[data-overview-'+kind+'-row]');
    assert.ok(await rows.count()>=4,label+' '+kind+' rows');
    const boxes=await rows.evaluateAll((els,kind)=>els.map(row=>{
      const rect=el=>el.getBoundingClientRect().toJSON();
      const title=row.querySelector('[data-overview-'+kind+'-title]');
      const amount=row.querySelector('[data-overview-'+kind+'-amount]');
      const secondary=row.querySelector(kind==='history'?'[data-overview-history-meta]':'[data-overview-category-percent]');
      return {row:rect(row),title:rect(title),amount:rect(amount),secondary:rect(secondary),overflow:row.scrollWidth-row.clientWidth,titleOverflow:title.scrollWidth-title.clientWidth,amountOverflow:amount.scrollWidth-amount.clientWidth};
    }),kind);
    const first=boxes[0];
    for(const box of boxes){
     assert.ok(Math.max(box.overflow,box.titleOverflow,box.amountOverflow)<=2,label+' '+kind+' overflow '+JSON.stringify(box));
     assert.ok(box.title.right<=box.amount.left+1,label+' '+kind+' text overlaps amount');
     if(kind==='history')assert.ok(box.amount.width<=Math.max(88,box.row.width*.34)+1,label+' history amount column too wide');
     assert.ok(Math.abs((box.row.right-box.amount.right)-(first.row.right-first.amount.right))<=1,label+' '+kind+' amount right axis');
     assert.ok(Math.abs((box.title.left-box.row.left)-(first.title.left-first.row.left))<=1,label+' '+kind+' title left axis');
     if(kind==='history')assert.ok(Math.abs(box.secondary.left-box.title.left)<=1&&box.secondary.top>=box.title.bottom-1,label+' history author/date alignment');
     else assert.ok(Math.abs(box.secondary.right-box.amount.right)<=1&&box.secondary.top>=box.amount.bottom-1,label+' category percentage alignment');
    }
    const card=overview.getByTestId((kind==='category'?'overview-categories':'overview-history')+(width<768?'-mobile':'-desktop'));
    await card.scrollIntoViewIfNeeded();
    await capture(page,'overview-reaudit-'+kind+'-'+label);
    await card.screenshot({path:out+'/overview-reaudit-card-'+kind+'-'+label+'.png',animations:'disabled'});
    await rows.last().scrollIntoViewIfNeeded();
    await capture(page,'overview-reaudit-'+kind+'-end-'+label);
   }
   console.log('PASS TERRA OVERVIEW GEOMETRY '+label+' limit, row axes, metadata and overflow');
  }
 }
 await settingsRef.set({theme:'light',privacyMode:false},{merge:true});
 await page.setViewportSize({width:1440,height:900});
}

export async function runTerraV2Pilot(page,{settingsRef,transactionsRef}){
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Pilot requires isolated emulator');
 await mkdir(out,{recursive:true});
 const ledger=async()=>JSON.stringify((await transactionsRef.get()).docs.map(doc=>[doc.id,doc.data()]));
 const before=await ledger();
 const overview=page.locator('[data-tab-panel="overview"]');
 try{
  for(const theme of ['light','dark']){
   await settingsRef.set({theme,privacyMode:false},{merge:true});
   await page.waitForFunction(theme=>document.documentElement.classList.contains('dark')===(theme==='dark'),theme);
   for(const [width,height] of [[1440,900],[390,844]]){
    const mobile=width<768,label=theme+'-'+width;
    await page.setViewportSize({width,height});
    await page.reload({waitUntil:'domcontentloaded'});
    await button(page.locator('nav'),'Обзор').waitFor({state:'visible',timeout:60000});
    await button(page.locator('nav'),'Обзор').click();
    const chart=overview.getByTestId(mobile?'overview-chart-mobile':'overview-chart-desktop');
    await chart.waitFor({state:'visible',timeout:30000});
    await page.waitForFunction(theme=>document.documentElement.classList.contains('dark')===(theme==='dark'),theme);
    await noOverflow(overview,label+' overview');await noOverflow(chart,label+' chart');
    const plot=chart.getByTestId('overview-chart-plot');
    const beforeHeight=(await plot.boundingBox()).height;
    const periods=chart.getByRole('group',{name:'Период динамики расходов'});
    for(const period of ['Неделя','Месяц','День']){
     const tab=button(periods,period);await targetSize(tab,label+' '+period);await tab.click();
     assert.equal(await tab.getAttribute('aria-pressed'),'true');
     assert.ok(Math.abs((await plot.boundingBox()).height-beforeHeight)<=1,label+' chart height changed');
    }
    await axisFits(plot,label+' overview');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await button(periods,'День').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
    await page.emulateMedia({reducedMotion:'no-preference'});
    if(mobile){
     const picker=button(overview,/^Выбрать месяц:/,false);
     await picker.click();const monthGroup=overview.locator('#overview-month-controls-mobile');
     await monthGroup.waitFor({state:'visible'});
     const previous=button(monthGroup,'Предыдущий месяц'),next=button(monthGroup,'Следующий месяц');
     await targetSize(previous,label+' previous');await targetSize(next,label+' next');
     const prior=await picker.getAttribute('aria-label');await previous.click();assert.notEqual(await picker.getAttribute('aria-label'),prior);
     await next.click();assert.equal(await picker.getAttribute('aria-label'),prior);
     await button(monthGroup,'Текущий месяц').click();await monthGroup.waitFor({state:'hidden'});
     await overview.getByTestId('overview-daily-mobile').waitFor({state:'visible'});
     await picker.click();await previous.click();
     await overview.getByTestId('overview-daily-mobile').waitFor({state:'hidden'});
     await button(monthGroup,'Текущий месяц').click();await monthGroup.waitFor({state:'hidden'});
     await targetSize(button(overview.getByTestId('overview-daily-mobile'),/Открыть подробности .* резерва/,false),label+' reserve shortcut');
    }
    const daily=overview.getByTestId(mobile?'overview-daily-mobile':'overview-daily-desktop');
    if(await daily.isVisible()){
     await noOverflow(daily,label+' daily comparison');
     assert.equal(await daily.locator('dl dd').count(),2);
     assert.ok(await daily.getByRole('progressbar').count()<=1,label+' duplicate daily progress');
     const pair=await daily.locator('dl').evaluate(el=>[...el.children].map(x=>x.getBoundingClientRect().toJSON()));
     assert.ok(pair[0].right<=pair[1].left+1,label+' daily values overlap');
    }
    const values=chart.locator('summary').filter({hasText:'Значения графика'});
    await values.waitFor({state:'visible'});await targetSize(values,label+' chart values');await values.click();
    const point=chart.getByTestId('overview-chart-values').getByRole('button').first();
    await point.waitFor({state:'visible'});await targetSize(point,label+' detail value');
    await point.click();
    const dayDialog=page.getByTestId('terra-day-detail');
    await dayDialog.waitFor({state:'visible'});
    assert.equal(await dayDialog.getAttribute('aria-modal'),'true');
    await button(dayDialog,'Закрыть детали дня').focus();
    await page.keyboard.press('Escape');
    await dayDialog.waitFor({state:'hidden'});
    assert.equal(await point.evaluate(el=>document.activeElement===el),true,label+' focus return');
    await values.click();
    await overview.getByTestId('overview-scroll-container').evaluate(el=>{el.scrollTop=0;});
    if(mobile){
     const balance=overview.getByTestId('overview-balance-mobile');const rect=await balance.boundingBox();
     assert.ok(rect&&rect.height<=430,label+' first-screen balance too tall '+JSON.stringify(rect));
     const top=await chart.boundingBox();const tab=await page.locator('[data-terra-tabbar]').boundingBox();
     assert.ok(top&&tab&&top.y+32<tab.y,label+' chart heading outside first viewport');
     const scope=overview.getByTestId('overview-scope-mobile');if(await scope.isVisible())assert.equal(await scope.getByRole('button').count(),2);
    }
    const history=overview.getByTestId(mobile?'overview-history-mobile':'overview-history-desktop');
    const all=history.getByTestId(mobile?'overview-history-all-mobile':'overview-history-all-desktop');
    await targetSize(all,label+' history link');
    assert.equal(await all.evaluate(el=>getComputedStyle(el).color),theme==='dark'?'rgb(155, 209, 168)':'rgb(53, 96, 68)',label+' history link contrast token');
    await capture(page,'overview-'+label);
    await history.scrollIntoViewIfNeeded();await capture(page,'overview-history-'+label);
    const categoryCard=overview.getByTestId(mobile?'overview-categories-mobile':'overview-categories-desktop');
    const categoryRows=categoryCard.getByRole('button',{name:/^Аналитика категории:/});
    assert.equal(await categoryRows.count(),6,label+' dense category preview must stay compact');
    const countText=await categoryCard.getByTestId('overview-category-preview-count').innerText();
    const countMatch=countText.match(/^Показано 6 из (\d+)$/);
    assert.ok(countMatch&&Number(countMatch[1])>=30,label+' full active root category count missing');
    await noOverflow(categoryCard,label+' dense categories');
    await categoryCard.scrollIntoViewIfNeeded();await capture(page,'overview-categories-'+label);
    const allCategories=button(categoryCard,'Все категории расходов');
    await targetSize(allCategories,label+' all categories');
    await allCategories.click();
    const categoryDialog=page.getByTestId('overview-all-categories');
    await categoryDialog.waitFor({state:'visible'});
    const allRows=categoryDialog.getByRole('button',{name:/^Операции категории:/});
    assert.equal(await allRows.count(),Number(countMatch[1]),label+' complete category list');
    await noOverflow(categoryDialog,label+' categories dialog');
    await capture(page,'overview-all-categories-'+label);
    await allRows.last().scrollIntoViewIfNeeded();
    await targetSize(allRows.last(),label+' last category');
    await page.keyboard.press('Escape');
    await categoryDialog.waitFor({state:'hidden'});
    assert.equal(await allCategories.evaluate(el=>document.activeElement===el),true,label+' category focus return');
    await allCategories.click();
    await categoryDialog.waitFor({state:'visible'});
    await allRows.last().click();
    await categoryDialog.waitFor({state:'hidden'});
    const categoryDetail=page.getByTestId('transaction-drilldown');
    await categoryDetail.waitFor({state:'visible'});
    await button(categoryDetail,mobile?'Закрыть или вернуться назад':'Закрыть').click();
    await categoryDetail.waitFor({state:'hidden'});
    await chart.scrollIntoViewIfNeeded();
    await capture(page,'overview-chart-'+label);
    // Verify the exact existing drilldown path and its controls; no new route.
    await button(overview,'Аналитика всех категорий').click();
    const dialog=page.getByTestId('transaction-drilldown');
    await dialog.waitFor({state:'visible'});
    await button(dialog,mobile?'Аналитика и график трат':'Аналитика и графики трат').click();
    await page.locator('[data-testid="transaction-drilldown"][data-view="analytics"]').waitFor({state:'visible'});
    const grouping=dialog.getByRole('group',{name:'Группировка аналитики'});
    for(const period of ['По неделям','По дням']){
     const tab=button(grouping,period);await targetSize(tab,label+' analytics '+period);await tab.click();
     assert.equal(await tab.getAttribute('aria-pressed'),'true');
    }
    await noOverflow(dialog,label+' analytics dialog');
    const series=dialog.getByRole('group',{name:'Состав графика'});
    for(const name of ['Расходы','Доходы','Все']){
     const tab=button(series,name);await targetSize(tab,label+' series '+name);await tab.click();
     assert.equal(await tab.getAttribute('aria-pressed'),'true');
    }
    await noOverflow(dialog.getByTestId('drilldown-chart'),label+' shared chart');
    await axisFits(dialog.getByTestId('drilldown-chart'),label+' analytics');
    const analyticsValues=dialog.locator('summary').filter({hasText:'Значения графика'});await analyticsValues.click();
    await dialog.getByTestId('analytics-values').waitFor({state:'visible'});
    await analyticsValues.click();
    const merchant=dialog.getByRole('searchbox',{name:'Поиск магазина или получателя'});
    const categoryToggle=dialog.getByTestId('analytics-category-toggle').first();
    await categoryToggle.click();
    assert.equal(await categoryToggle.getAttribute('aria-expanded'),'true');
    const payeeRow=dialog.getByTestId('analytics-payee-row').first();
    await payeeRow.waitFor({state:'visible'});
    const payeeName=await payeeRow.locator('p').first().innerText();
    await merchant.fill(payeeName);
    await dialog.getByTestId('analytics-payee-row').first().waitFor({state:'visible'});
    await merchant.fill('терра-нет-такого-получателя');
    await dialog.getByText('Ничего не найдено',{exact:true}).waitFor({state:'visible'});
    await merchant.fill('');
    await noOverflow(dialog,label+' merchant search');
    await capture(page,'analytics-'+label);
    await dialog.getByTestId('drilldown-chart').scrollIntoViewIfNeeded();
    await capture(page,'analytics-chart-'+label);
    await button(dialog,mobile?'Назад к операциям':'Реестр операций').click();
    await button(dialog,mobile?'Закрыть или вернуться назад':'Закрыть').click();
    await dialog.waitFor({state:'hidden'});
    // Privacy is the existing personal setting, not a local mock.
    const hide=button(overview,'Скрыть суммы');await hide.click();
    await chart.getByText('График скрыт в режиме приватности',{exact:true}).waitFor({state:'visible'});
    assert.equal(await chart.locator('.recharts-wrapper').count(),0);
    if(await daily.isVisible()){
     assert.equal(await daily.getByRole('progressbar').count(),0,label+' private daily progress visible');
     for(const value of await daily.locator('dl dd').allTextContents())assert.match(value,/^(?:—|•+\s*₽)$/u,label+' daily amount visible in privacy mode');
    }
    await button(overview,'Аналитика всех категорий').click();
    await dialog.waitFor({state:'visible'});
    await button(dialog,mobile?'Аналитика и график трат':'Аналитика и графики трат').click();
    await dialog.getByText('График скрыт в режиме приватности',{exact:true}).waitFor({state:'visible'});
    assert.equal(await dialog.getByTestId('drilldown-chart').count(),0);
    assert.equal(await dialog.getByTestId('analytics-peak').count(),0);
    assert.equal(await dialog.getByRole('searchbox',{name:'Поиск магазина или получателя'}).count(),0);
    await button(dialog,mobile?'Назад к операциям':'Реестр операций').click();
    await button(dialog,mobile?'Закрыть или вернуться назад':'Закрыть').click();
    await dialog.waitFor({state:'hidden'});
    await button(overview,'Показать суммы').click();
    await chart.getByText('График скрыт в режиме приватности',{exact:true}).waitFor({state:'hidden'});
    console.log('PASS TERRA V2 PILOT '+label+' overview/analytics, period, targets, chart geometry and privacy');
    // Budget uses the exact same populated family and selected month.
    await button(page.locator('nav'),'Бюджет').click();
    const budget=page.locator('[data-tab-panel="budget"]');
    const metrics=budget.getByTestId(mobile?'budget-metrics-mobile':'budget-metrics-desktop');
    await metrics.waitFor({state:'visible'});
    await noOverflow(metrics,label+' budget summary');
    if(mobile){
     const shortcuts=budget.getByRole('group',{name:'Разделы бюджета'});
     await noOverflow(shortcuts,label+' budget shortcuts');
     const rail=await shortcuts.boundingBox();
     for(const shortcut of await shortcuts.getByRole('button').all()){
      await targetSize(shortcut,label+' budget shortcut');
      const rect=await shortcut.boundingBox();
      assert.ok(rect&&rail&&rect.x>=rail.x-1&&rect.x+rect.width<=rail.x+rail.width+1,label+' clipped budget shortcut');
     }
    }
    await metrics.scrollIntoViewIfNeeded();await capture(page,'budget-summary-'+label);
    const budgetHistory=budget.getByTestId(mobile?'budget-history-mobile':'budget-history-desktop');
    const controls=budgetHistory.getByTestId('budget-history-controls');
    const historyPeriod=controls.getByRole('group',{name:'Период истории операций'});
    await button(historyPeriod,'Весь месяц').click();
    const budgetRows=budgetHistory.locator('[data-history-row]');
    assert.equal(await budgetRows.count(),20,label+' initial month history window');
    const firstIds=await budgetRows.evaluateAll(nodes=>nodes.map(el=>el.dataset.historyRow));
    const totalText=await controls.getByRole('status').innerText();
    assert.ok(Number(totalText.split(' из ')[0])>=500,label+' month history dataset too small');
    await controls.scrollIntoViewIfNeeded();await capture(page,'budget-month-history-'+label);
    const more=button(budgetHistory,/^Показать ещё /,false);
    await targetSize(more,label+' history next page');await more.click();
    assert.equal(await budgetRows.count(),40,label+' expanded month history window');
    assert.deepEqual((await budgetRows.evaluateAll(nodes=>nodes.map(el=>el.dataset.historyRow))).slice(0,20),firstIds);
    await button(historyPeriod,/^День ·/,false).click();
    const budgetAll=button(budget,'Все категории расходов');
    await targetSize(budgetAll,label+' budget full categories');await budgetAll.scrollIntoViewIfNeeded();
    await capture(page,'budget-category-preview-'+label);
    await budgetAll.click();
    const budgetCategories=page.getByTestId('budget-all-categories');
    await budgetCategories.waitFor({state:'visible'});
    const categoryItems=budgetCategories.locator('[data-category-id]');
    assert.ok(await categoryItems.count()>=30,label+' budget active root categories');
    await noOverflow(budgetCategories,label+' budget all categories');
    await capture(page,'budget-all-categories-'+label);
    await categoryItems.last().scrollIntoViewIfNeeded();
    await targetSize(categoryItems.last(),label+' budget last category');
    await page.keyboard.press('Escape');
    await budgetCategories.waitFor({state:'hidden'});
    assert.equal(await budgetAll.evaluate(el=>document.activeElement===el),true,label+' budget categories focus return');
    await button(page.locator('nav'),'Обзор').click();
    console.log('PASS TERRA BUDGET PILOT '+label+' summary, all shortcuts, month history 20/40, full categories, focus');
    await button(page.locator('nav'),'Планы').click();
    const plans=page.locator('[data-tab-panel="plans"]');
    const scroll=plans.getByTestId('plans-scroll-container');
    const views=plans.getByRole('group',{name:'Вид календаря'});
    await views.waitFor({state:'visible'});
    await noOverflow(scroll,label+' plans');
    const participants=plans.getByRole('group',{name:mobile?'Фильтр участников планов':'Участник планов'});
    await noOverflow(participants,label+' participants');
    for(const choice of await participants.getByRole('button').all())await targetSize(choice,label+' participant');
    await scroll.evaluate(el=>{el.scrollTop=0;});
    await capture(page,'plans-month-'+label);
    const selectedDay=plans.getByTestId('plans-selected-day');
    if(mobile){
     const jump=button(plans,/^События дня \(/,false);
     await targetSize(jump,label+' selected day shortcut');await jump.click();
     assert.equal(await selectedDay.evaluate(el=>document.activeElement===el),true,label+' selected day focus');
     assert.ok(await scroll.evaluate(el=>el.scrollTop>0),label+' selected day did not scroll');
    }else await selectedDay.scrollIntoViewIfNeeded();
    assert.ok(!(await selectedDay.innerText()).includes('(+2 дн.)')&&!(await selectedDay.innerText()).includes('(+4 дн.)'),label+' fixture duration leaked as multiple days');
    await capture(page,'plans-selected-day-'+label);
    for(const mode of ['Неделя','День','Расписание']){
     const choice=button(views,mode);await targetSize(choice,label+' '+mode);await choice.click();
     assert.equal(await choice.getAttribute('aria-pressed'),'true');
     await views.scrollIntoViewIfNeeded();await noOverflow(scroll,label+' '+mode);await capture(page,'plans-'+({Неделя:'week',День:'day',Расписание:'list'}[mode])+'-'+label);
    }
    await button(views,'Месяц').click();
    const add=button(plans,'Добавить событие');await add.click();
    const editor=page.getByRole('dialog',{name:'Новый план'});
    await editor.waitFor({state:'visible'});
    await noOverflow(editor,label+' event editor');
    const titleInput=editor.locator('#event-title-input');
    const noteInput=editor.getByRole('textbox',{name:'Заметка или место встречи'});
    for(const field of [titleInput,noteInput]){
     await targetSize(field,label+' event text input');
     const colors=await field.evaluate(el=>{
      const style=getComputedStyle(el),placeholder=getComputedStyle(el,'::placeholder');
      return {bg:style.backgroundColor,fg:style.color,placeholder:placeholder.color};
     });
     const luminance=color=>{
      const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
      return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
     };
     const contrast=(a,b)=>{const [high,low]=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (high+.05)/(low+.05);};
     assert.ok(contrast(colors.bg,colors.fg)>=4.5,label+' unreadable editor text '+JSON.stringify(colors));
     assert.ok(contrast(colors.bg,colors.placeholder)>=4.5,label+' unreadable editor placeholder '+JSON.stringify(colors));
    }
    await titleInput.fill('QA — проверка читаемости');
    await noteInput.fill('Тестовая заметка, без сохранения');
    await capture(page,'plans-editor-filled-'+label);
    await titleInput.fill('');await noteInput.fill('');
    await capture(page,'plans-editor-'+label);
    await button(editor,'Закрыть редактор события').click();await editor.waitFor({state:'hidden'});
    console.log('PASS TERRA PLANS PILOT '+label+' selected day scroll, period views, event editor');
    await button(page.locator('nav'),'Покупки').click();
    const shopping=page.locator('[data-tab-panel="shopping"]');
    const shoppingScroll=shopping.getByTestId('shopping-scroll-container');
    const library=shopping.getByTestId('shopping-library');
    await library.waitFor({state:'visible'});
    await noOverflow(shoppingScroll,label+' shopping');
    await shoppingScroll.evaluate(el=>{el.scrollTop=0;});
    await capture(page,'shopping-main-'+label);
    const repeat=button(library,'Повторить покупки');
    await targetSize(repeat,label+' repeat purchases');
    if(await repeat.getAttribute('aria-expanded')!=='true')await repeat.click();
    const frequent=library.getByTestId('family-frequent-purchases');
    await frequent.waitFor({state:'visible',timeout:20000});
    await noOverflow(frequent,label+' family frequency');
    for(const count of await frequent.getByTestId('frequency-count').all())assert.ok(Number((await count.innerText()).replace('×',''))>=2,label+' invalid frequency');
    await repeat.scrollIntoViewIfNeeded();
    await capture(page,'shopping-repeat-'+label);
    const templates=button(library,'Быстрые списки');
    await templates.click();
    await button(library,'Продукты на неделю · 4').click();
    const preview=library.getByRole('region',{name:'Состав быстрого списка'});
    await preview.waitFor({state:'visible'});
    assert.equal(await preview.locator('li').count(),4);
    await preview.scrollIntoViewIfNeeded();await capture(page,'shopping-template-'+label);
    await button(preview,'Отмена').click();
    const pantryToggle=button(library,/^Кладовая/,false);
    await pantryToggle.click();
    const pantry=library.getByTestId('pantry-list');
    await pantry.waitFor({state:'visible',timeout:20000});
    await noOverflow(pantry,label+' pantry');
    assert.ok(await pantry.evaluate(el=>getComputedStyle(el).overflowY!=='auto'),label+' nested pantry scroll');
    await pantry.scrollIntoViewIfNeeded();await capture(page,'shopping-pantry-'+label);
    const editStock=button(pantry,/^Редактировать запас:/,false);
    await targetSize(editStock,label+' stock edit');await editStock.click();
    const stockEditor=library.getByRole('form',{name:'Редактирование запаса'});
    await stockEditor.waitFor({state:'visible'});
    await noOverflow(stockEditor,label+' stock editor');await capture(page,'shopping-pantry-editor-'+label);
    await button(stockEditor,'Отмена').click();await stockEditor.waitFor({state:'hidden'});
    await pantryToggle.click();
    console.log('PASS TERRA SHOPPING PILOT '+label+' actual family history, templates, pantry and editor');
    await button(page.locator('nav'),'Чат').click();
    const chat=page.locator('[data-tab-panel="chat"]');
    const feed=chat.getByTestId('chat-messages-scroll-container');
    const composer=chat.getByRole('textbox',{name:'Сообщение семье'});
    await chat.getByTestId('chat-message-text').filter({hasText:'Посмотрим планы на вечер.'}).waitFor({state:'visible',timeout:20000});
    assert.ok(await chat.getByTestId('chat-message-text').count()>=40,label+' long chat fixture');
    await noOverflow(feed,label+' chat');
    await targetSize(composer,label+' composer');
    await targetSize(button(chat,'Отправить сообщение'),label+' send');
    assert.equal(await chat.getByRole('button',{name:'Удалить чат'}).count(),0);
    assert.equal(await chat.getByRole('button',{name:'Прикрепить чек или файл'}).count(),0);
    await capture(page,'chat-main-'+label);
    await feed.evaluate(el=>{el.scrollTop=0;});
    const latest=button(chat,'К последним сообщениям');
    await latest.waitFor({state:'visible'});await targetSize(latest,label+' latest');
    await capture(page,'chat-history-'+label);
    const searchToggle=button(chat,'Поиск');
    await searchToggle.click();
    const search=chat.getByRole('textbox',{name:'Поиск по сообщениям'});
    await targetSize(search,label+' search');
    await search.fill('  ТЕРМОС  ');
    assert.equal(await chat.getByTestId('chat-message-text').count(),1);
    await capture(page,'chat-search-'+label);
    await search.fill('QA отсутствующий запрос');
    assert.equal(await chat.getByTestId('chat-message-text').count(),0);
    await searchToggle.click();
    await search.waitFor({state:'hidden'});
    assert.ok(await chat.getByTestId('chat-message-text').count()>=40,label+' closed search did not restore history');
    assert.ok(await feed.evaluate(el=>el.scrollTop<=5),label+' search lost reading position');
    await latest.click();
    await latest.waitFor({state:'hidden'});
    assert.ok(await feed.evaluate(el=>el.scrollHeight-el.clientHeight-el.scrollTop<=120),label+' latest failed');
    await composer.fill('QA строка 1\nQA строка 2\nQA строка 3');
    const fullHeight=(await composer.boundingBox()).height;
    assert.ok(fullHeight>44,label+' multiline composer did not expand');
    await capture(page,'chat-composer-'+label);
    if(mobile){
      await page.setViewportSize({width,height:520});
      const box=await composer.boundingBox();
      assert.ok(box&&box.y>=0&&box.y+box.height<=520,label+' composer clipped in reduced viewport');
      await capture(page,'chat-reduced-viewport-'+label);
      await page.setViewportSize({width,height});
    }
    await composer.fill('');
    await button(page.locator('nav'),'Обзор').click();
    console.log('PASS TERRA CHAT PILOT '+label+' history, search restore, latest, multiline and viewport');
    await button(page.locator('nav'),'Сервисы').click();
    const services=page.locator('[data-tab-panel="services"]');
    const serviceScroll=services.getByTestId('services-scroll-container');
    const grid=services.locator('[data-purpose="service-cards-grid"]');
    await grid.waitFor({state:'visible'});
    await noOverflow(serviceScroll,label+' services');
    await capture(page,'services-main-'+label);
    const debtButton=button(grid,/^Долги/,false);
    await debtButton.click();
    const summary=services.getByRole('region',{name:'Сводка по долгам'});
    await summary.waitFor({state:'visible',timeout:20000});
    await noOverflow(summary,label+' debt summary');
    assert.doesNotMatch(await services.innerText(),/Экономия ~248 000|Безопасно \(24%\)|Автосписание настроено|\+1\.2%/);
    await summary.scrollIntoViewIfNeeded();await capture(page,'services-debts-'+label);
    const calculator=button(services,'Калькулятор досрочного погашения');
    await targetSize(calculator,label+' calculator');
    const calculatorCard=services.getByRole('region',{name:'Досрочное погашение'});
    await calculatorCard.scrollIntoViewIfNeeded();
    await noOverflow(calculatorCard,label+' calculator card');
    const cardLayout=await calculatorCard.evaluate(el=>({width:el.clientWidth,copyWidth:el.querySelector('p').clientWidth,copy:el.querySelector('p').getBoundingClientRect().toJSON(),action:el.querySelector('button').getBoundingClientRect().toJSON()}));
    assert.ok(cardLayout.copyWidth>=Math.min(240,cardLayout.width-40),label+' calculator description squeezed');
    if(mobile)assert.ok(cardLayout.copy.bottom<=cardLayout.action.top,label+' calculator must stack on mobile');
    await capture(page,'services-payoff-card-'+label);
    await calculator.click();
    const payoff=page.getByRole('dialog',{name:'Досрочное погашение'});
    await payoff.waitFor({state:'visible'});
    const result=payoff.getByTestId('debt-payoff-result');
    await result.waitFor({state:'visible'});
    await noOverflow(payoff,label+' payoff');
    assert.match(await payoff.innerText(),/без новых процентов и комиссий/);
    await capture(page,'services-payoff-'+label);
    await button(payoff,'Закрыть калькулятор').click();
    await settingsRef.set({privacyMode:true},{merge:true});
    await summary.getByText('•••',{exact:true}).first().waitFor({state:'visible',timeout:20000});
    assert.doesNotMatch(await summary.innerText(),/\d[\d\s.,]*₽|\d+%/);
    await summary.scrollIntoViewIfNeeded();await capture(page,'privacy-debts-'+label);
    await calculator.click();
    await payoff.getByText(/Расчёт скрыт в режиме приватности/).waitFor({state:'visible'});
    assert.equal(await payoff.getByTestId('debt-payoff-result').count(),0);
    await capture(page,'privacy-payoff-'+label);
    await button(payoff,'Закрыть калькулятор').click();
    await settingsRef.set({privacyMode:false},{merge:true});
    await summary.getByText('•••',{exact:true}).first().waitFor({state:'hidden',timeout:20000});
    await button(services,'Все сервисы').click();
    await grid.waitFor({state:'visible'});
    assert.equal(await debtButton.evaluate(el=>document.activeElement===el),true,label+' services focus return');
    await button(grid,/^Карты лояльности/,false).click();
    const cardSearch=services.getByRole('textbox',{name:'Поиск карт'});
    await cardSearch.waitFor({state:'visible',timeout:20000});
    await targetSize(cardSearch,label+' wallet search');
    await noOverflow(serviceScroll,label+' wallet');
    await capture(page,'services-wallet-'+label);
    await button(services,'Все сервисы').click();
    await button(grid,/^Чеки ФНС и выписки/,false).click();
    const qr=services.locator('#receipt-qr-input');
    await qr.fill('invalid');
    await button(services,'Показать реквизиты').click();
    await services.getByRole('alert').waitFor({state:'visible'});
    await qr.fill('t=20261126T1435&s=1460.07&fn=9999440300645512&i=18491&fp=293810293&n=1');
    await button(services,'Показать реквизиты').click();
    const receipt=services.getByRole('region',{name:'Реквизиты из QR-кода'});
    await receipt.waitFor({state:'visible'});
    assert.match(await receipt.innerText(),/1[\s\u00a0]460,07/);
    await noOverflow(receipt,label+' QR result');
    await capture(page,'services-receipt-'+label);
    await button(services,'Все сервисы').click();
    await button(page.locator('nav'),'Обзор').click();
    console.log('PASS TERRA SERVICES PILOT '+label+' real debt values, payoff, wallet and QR');
    await button(mobile?overview:page,mobile?'Настройки и профиль':'Настройки').click();
    const settings=page.getByRole('dialog',{name:'Настройки',exact:true});
    await settings.waitFor({state:'visible'});
    if(mobile)await button(settings,'Открыть профиль').click();
    else await button(settings.getByRole('navigation',{name:'Разделы настроек'}),/^Профиль и безопасность/,false).click();
    const account=settings.locator('[data-settings-section="account"]');
    const login=account.locator('#settings-account-login');
    await login.waitFor({state:'visible'});
    assert.match(await login.inputValue(),/@example\.test$/);
    await targetSize(login,label+' login');await noOverflow(account,label+' account');
    await capture(page,'account-main-'+label);
    await login.fill('QA display name');
    assert.equal(await button(account,'Сохранить логин').isDisabled(),true);
    await capture(page,'account-invalid-'+label);
    const newPassword=account.locator('#settings-password-new'),confirm=account.locator('#settings-password-confirm');
    await newPassword.fill('emulator-test-only');await confirm.fill('different');
    assert.equal(await button(account,'Обновить пароль').isDisabled(),true);
    await newPassword.scrollIntoViewIfNeeded();
    await targetSize(newPassword,label+' password');
    await button(account,'Показать новый пароль').click();
    assert.equal(await newPassword.getAttribute('type'),'text');
    await button(account,'Скрыть новый пароль').click();
    await capture(page,'account-password-'+label);
    await newPassword.fill('');await confirm.fill('');
    await button(settings,'Закрыть настройки').click();
    await settings.waitFor({state:'hidden'});
    console.log('PASS TERRA ACCOUNT PILOT '+label+' actual login, invalid input, masked password and responsive form');
   }
  }
  await overviewGeometryPilot(page,settingsRef);
  await budgetGeometryPilot(page,settingsRef);
  assert.equal(await ledger(),before,'UI pilot changed transaction records');
 }finally{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await settingsRef.set({theme:'light',privacyMode:false},{merge:true});
  await page.setViewportSize({width:1440,height:900});
 }
}
