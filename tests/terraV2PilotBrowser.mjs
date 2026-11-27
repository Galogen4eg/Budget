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
    if(await daily.isVisible()){
     assert.equal(await daily.getByRole('progressbar').count(),0,label+' private daily progress visible');
     for(const value of await daily.locator('dl dd').allTextContents())assert.match(value,/^(?:—|•+\s*₽)$/u,label+' daily amount visible in privacy mode');
    }
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
    await button(page.locator('nav'),'Обзор').click();
   }
  }
  assert.equal(await ledger(),before,'UI pilot changed transaction records');
 }finally{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await settingsRef.set({theme:'light',privacyMode:false},{merge:true});
  await page.setViewportSize({width:1440,height:900});
 }
}
