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
    await capture(page,'overview-'+label);
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
    if(!mobile)await axisFits(dialog.getByTestId('drilldown-chart'),label+' analytics');
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
    await button(overview,'Показать суммы').click();
    await chart.getByText('График скрыт в режиме приватности',{exact:true}).waitFor({state:'hidden'});
    console.log('PASS TERRA V2 PILOT '+label+' overview/analytics, period, targets, chart geometry and privacy');
   }
  }
  assert.equal(await ledger(),before,'UI pilot changed transaction records');
 }finally{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await settingsRef.set({theme:'light',privacyMode:false},{merge:true});
  await page.setViewportSize({width:1440,height:900});
 }
}
