import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Smoke-only: verifies unauthenticated app rendering in an actual browser.
// It never creates accounts, sends credentials, or modifies financial data.
const baseURL = process.env.BUDGET_SMOKE_URL || 'http://127.0.0.1:4173';
const child = process.env.BUDGET_SMOKE_URL ? null : spawn(
  'npm', ['run','preview','--','--host','127.0.0.1','--port','4173','--strictPort'],
  {stdio:'inherit',shell:process.platform==='win32'}
);

const waitForServer=async()=>{
  for(let attempt=0;attempt<40;attempt++){
    try{
      const response=await fetch(baseURL,{signal:AbortSignal.timeout(2500)});
      if(response.ok)return;
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw new Error('Budget preview server did not become healthy');
};

// Browser smoke is local-only. Never contact production Firebase or any other external service.
const previewOrigin=new URL(baseURL).origin;
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(baseURL).hostname))throw new Error('Browser smoke requires a loopback preview');
const isolate=async page=>page.route('**/*',route=>new URL(route.request().url()).origin===previewOrigin?route.continue():route.abort());
let browser;
try{
  await waitForServer();
  await mkdir('artifacts/budget-browser',{recursive:true});
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const [label,width,height] of [['phone-320',320,700],['phone-390',390,844],['tablet-768',768,1024],['laptop-1280',1280,800],['desktop-1440',1440,900],['desktop-1920',1920,1080]]){
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block'});
    await isolate(page);
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    if(label==='phone-390'){
      const dark=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,colorScheme:'light',reducedMotion:'reduce',serviceWorkers:'block'});
      await isolate(dark);
      try{
        await dark.addInitScript(()=>localStorage.setItem('theme','dark'));
        // Pause only the app bundle: the inline theme bootstrap must already be dark.
        await dark.route('**/assets/*.js',route=>route.abort());
        await dark.goto(baseURL,{waitUntil:'domcontentloaded',timeout:45000});
        const splash=dark.locator('[data-terra-boot]');
        await splash.waitFor({state:'visible',timeout:15000});
        assert.equal(await dark.evaluate(()=>document.documentElement.classList.contains('dark')),true,'dark startup must respect stored theme');
        await splash.locator('.terra-splash-art').waitFor({state:'visible'});
        assert.equal(await splash.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(24, 28, 25)');
        assert.notEqual(await splash.locator('.terra-splash-image').evaluate(el=>getComputedStyle(el).filter),'none');
        assert.equal(await splash.locator('.terra-splash-dots i').first().evaluate(el=>getComputedStyle(el).animationName),'none');
        await dark.screenshot({path:'artifacts/budget-browser/phone-390-startup-dark.png',animations:'disabled'});
      }finally{await dark.close();}
    }
    // Hold the app bundle so we can see the actual pre-React loading screen.
    let releaseBoot;
    const bootGate=new Promise(resolve=>{releaseBoot=resolve;});
    await page.route('**/assets/*.js',async route=>{await bootGate;await route.continue();});
    try{
      const response=await page.goto(baseURL,{waitUntil:'commit',timeout:45000});
      assert.equal(response?.status(),200,label+': page did not return 200');
      const boot=page.locator('[data-terra-boot]');
      await boot.waitFor({state:'visible',timeout:30000});
      const expected=height>=width?'terra-mobile.webp':'terra-desktop.webp';
      const art=boot.locator('.terra-splash-art');
      await art.waitFor({state:'visible',timeout:15000});
      const loaded=await art.locator('.terra-splash-image').evaluate(async el=>{
        const url=getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
        if(!url)return null;
        const img=new Image();img.src=url;await img.decode();
        return {url,width:img.naturalWidth,height:img.naturalHeight};
      });
      assert.ok(loaded?.url.endsWith(expected),label+': wrong artwork');
      const geometry=await art.boundingBox();
      assert.ok(geometry&&geometry.x>=-1&&geometry.y>=-1&&geometry.x+geometry.width<=width+1&&geometry.y+geometry.height<=height+1,label+': artwork clipped '+JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.width/geometry.height-loaded.width/loaded.height)<0.02,label+': artwork distorted');
      assert.equal(await art.locator('.terra-splash-dots i').first().evaluate(el=>getComputedStyle(el).animationName),'terra-dot-pulse');
      assert.equal(await art.locator('.terra-splash-dots i').count(),3);
      await page.screenshot({path:'artifacts/budget-browser/'+label+'-startup.png',animations:'disabled',timeout:15000});
      console.log('PASS',label,'responsive startup artwork',expected);
    }finally{releaseBoot();}

    await page.getByRole('button',{name:/Войти/i}).waitFor({state:'visible',timeout:30000});
    assert.equal(await page.locator('input[type="password"]').count()>0,true,label+': password field missing');
    assert.equal(await page.locator('.terra-splash').count(),0,label+': splash stays after login is ready');
    if(label==='phone-390'){
      await page.unroute('**/assets/*.js');
      let releaseReload;
      const reloadGate=new Promise(resolve=>{releaseReload=resolve;});
      await page.route('**/assets/*.js',async route=>{await reloadGate;await route.continue();});
      try{
        await page.reload({waitUntil:'commit',timeout:45000});
        const boot=page.locator('[data-terra-boot]');
        await boot.locator('.terra-splash-compact').waitFor({state:'visible',timeout:15000});
        assert.equal(await boot.locator('.terra-splash-art').isVisible(),false);
        assert.equal(await boot.locator('.terra-splash-image').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
        await page.screenshot({path:'artifacts/budget-browser/phone-390-reload.png',animations:'disabled'});
      }finally{releaseReload();}
      await page.getByRole('button',{name:/Войти/i}).waitFor({state:'visible',timeout:30000});
      assert.equal(await page.locator('.terra-splash').count(),0);
    }
    await page.waitForTimeout(450);
    const widthInfo=await page.evaluate(()=>({
      viewport:window.innerWidth,
      document:document.documentElement.scrollWidth,
      body:document.body.scrollWidth,
    }));
    assert.ok(widthInfo.document<=widthInfo.viewport+2 && widthInfo.body<=widthInfo.viewport+2,
      label+': horizontal overflow '+JSON.stringify(widthInfo));
    assert.deepEqual(errors,[],label+': JavaScript page errors');
    await page.screenshot({path:'artifacts/budget-browser/'+label+'.png',fullPage:true,animations:'disabled'});
    if(label==='desktop-1920'){
      // The local demo is isolated from family Firestore; exercise the real
      // Overview UI on Full HD, not just the unauthenticated login page.
      const demo=page.getByRole('button',{name:/Локальный демо-режим/});
      await demo.click({timeout:10000});
      await page.getByRole('group',{name:'Период динамики расходов на ПК'}).waitFor({state:'visible',timeout:15000});
      const tabs=page.getByRole('group',{name:'Период динамики расходов на ПК'});
      for(const name of ['Неделя','Месяц','День']){
        const tab=tabs.getByRole('button',{name,exact:true});
        await tab.click();
        assert.equal(await tab.getAttribute('aria-pressed'),'true','1920: chart '+name+' not selected');
        const rect=await tab.boundingBox();
        assert.ok(rect && rect.height>=44,'1920: small chart control '+name);
      }
      const picker=page.getByRole('button',{name:/Выбрать месяц\. Сейчас:/});
      await picker.click();
      assert.equal(await picker.getAttribute('aria-expanded'),'true','1920: month picker did not open');
      const options=page.locator('div.absolute.right-0.top-full').getByRole('button');
      assert.ok(await options.count()>0,'1920: no month options');
      await options.first().click();
      assert.equal(await picker.getAttribute('aria-expanded'),'false','1920: month picker did not close');
      // Return to the current real calendar month before validating family
      // calculations and taking screenshots with demo transactions present.
      await picker.click();
      // Desktop month picker has month options but no "Current month" button.
      // The last option in this picker is the latest available period.
      await page.locator('div.absolute.right-0.top-full').getByRole('button').last().click();
      assert.equal(await picker.getAttribute('aria-expanded'),'false','1920: latest month picker did not close');
      const personal=page.getByRole('button',{name:/^Личный/}).first();
      const family=page.getByRole('button',{name:/^Семейный$/}).first();
      await personal.click();
      assert.equal(await personal.getAttribute('aria-pressed'),'true','1920: personal mode not selected');
      await family.click();
      assert.equal(await family.getAttribute('aria-pressed'),'true','1920: family mode not restored');
      assert.deepEqual(errors,[],'1920: Overview generated runtime errors');
      await page.screenshot({path:'artifacts/budget-browser/desktop-1920-overview.png',fullPage:true,animations:'disabled'});
      console.log('PASS desktop-1920 Overview demo interactions');

      // The member chips are HISTORY filters. They must not reallocate
      // the shared family opening balance, paid bills or savings reserve.
      await page.getByRole('button',{name:'Бюджет',exact:true}).first().click();
      const familyLimit=page.locator('[data-testid="family-daily-limit-desktop"]');
      await familyLimit.waitFor({state:'visible'});
      const originalFamilyLimit=(await familyLimit.innerText()).trim();
      const memberRail=page.getByRole('group',{name:'Участник бюджета'}).filter({visible:true}).first();
      for(const name of ['Папа','Мама','Все']){
        const button=memberRail.getByRole('button',{name:new RegExp(name,'i')}).first();
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'),'true','1920: filter '+name+' did not select');
        assert.equal((await familyLimit.innerText()).trim(),originalFamilyLimit,
          '1920: member history filter changed shared family daily guidance');
      }
      // Verify Full HD calendar selection, day details and a safe unsaved
      // transaction form. Do not write or mutate persistent/demo data.
      // Full HD actions must remain reachable without tiny click targets.
      for(const name of ['Предыдущий месяц','Следующий месяц']){
        const arrow=page.getByRole('button',{name,exact:true}).filter({visible:true}).first();
        const bounds=await arrow.boundingBox();
        assert.ok(bounds && bounds.width>=44 && bounds.height>=44,
          '1920: undersized Budget month control '+name);
      }
      const calendarDay=page.getByRole('button',{name:/^Выбрать 15 /}).filter({visible:true}).first();
      await calendarDay.click();
      assert.equal(await calendarDay.getAttribute('aria-pressed'),'true','1920: selected calendar day not reflected');
      const expandDay=page.getByRole('button',{name:/Развернуть/}).filter({visible:true}).first();
      const expandBounds=await expandDay.boundingBox();
      assert.ok(expandBounds && expandBounds.height>=44,'1920: undersized day details action');
      await expandDay.click();
      await page.getByText('Финансовые операции и детальный баланс дня').waitFor({state:'visible'});
      const closeDay=page.locator('button[title="Закрыть"]').filter({visible:true}).last();
      // DayDetailModal scales from 0.98 to 1 on entrance; measure only
      // after that transform finishes, not at an intermediate frame.
      await page.waitForFunction(() => {
        const close=document.querySelector('button[title="Закрыть"]');
        if(!close)return false;
        const rect=close.getBoundingClientRect();
        return rect.width>=43.95 && rect.height>=43.95;
      },null,{timeout:4000});
      const closeBounds=await closeDay.boundingBox();
      assert.ok(closeBounds && closeBounds.width>=43.95 && closeBounds.height>=43.95,
        '1920: undersized day details close action '+JSON.stringify(closeBounds));
      await closeDay.click();
      await page.getByText('Финансовые операции и детальный баланс дня').waitFor({state:'hidden'});
      await page.getByRole('button',{name:'Добавить операцию',exact:true}).filter({visible:true}).first().click();
      await page.getByRole('heading',{name:'Новая операция'}).waitFor({state:'visible'});
      const amountField=page.getByRole('textbox',{name:'Сумма операции'});
      await amountField.fill('1250');
      assert.equal(await amountField.inputValue(),'1250','1920: amount field does not accept expense');
      const incomeTab=page.getByRole('button',{name:/ДОХОД/}).filter({visible:true}).first();
      await incomeTab.click();
      assert.equal(await incomeTab.getAttribute('aria-pressed'),'true','1920: income mode not selected');
      await page.getByRole('button',{name:'Закрыть модальное окно'}).click();
      await page.getByRole('heading',{name:'Новая операция'}).waitFor({state:'hidden'});
      assert.deepEqual(errors,[],'1920: calendar or transaction dialog raised runtime errors');
      console.log('PASS desktop-1920 calendar day details and unsaved transaction form');

      assert.deepEqual(errors,[],'1920: Budget family filter generated runtime errors');
      await page.screenshot({path:'artifacts/budget-browser/desktop-1920-budget-family.png',fullPage:true,animations:'disabled'});
      console.log('PASS desktop-1920 family projection stable across member filters');

      // Iteration 66: fully exercise mandatory bill create/edit/mark/delete
      // in the local demo only. No authenticated Firestore writes.
      const addBill=page.getByRole('button',{name:'Добавить обязательный платёж'}).filter({visible:true}).last();
      await addBill.click();
      await page.getByRole('heading',{name:'Новый обязательный платёж'}).waitFor({state:'visible'});
      await page.locator('#paymentName').fill('Тест итерации 66');
      await page.locator('#paymentAmount').fill('1250.45');
      await page.locator('#paymentDay').fill('18');
      const markManual=page.getByRole('button',{name:/Отметить оплаченным вручную/});
      await markManual.click();
      assert.equal(await markManual.getAttribute('aria-pressed'),'true','1920: manual-paid flag not selected');
      await page.getByRole('button',{name:'Добавить платёж',exact:true}).click();
      await page.getByRole('heading',{name:'Новый обязательный платёж'}).waitFor({state:'hidden'});
      const editBill=page.getByRole('button',{name:'Редактировать обязательный платёж: Тест итерации 66'}).filter({visible:true}).last();
      await editBill.click();
      await page.getByRole('heading',{name:'Редактирование платежа'}).waitFor({state:'visible'});
      assert.equal(await page.locator('#paymentAmount').inputValue(),'1250.45');
      assert.equal(await page.getByRole('button',{name:/Отметить оплаченным вручную/}).getAttribute('aria-pressed'),'true');
      await page.locator('#paymentAmount').fill('1300.55');
      await page.getByRole('button',{name:'Сохранить изменения',exact:true}).click();
      await page.getByRole('heading',{name:'Редактирование платежа'}).waitFor({state:'hidden'});
      await editBill.click();
      assert.equal(await page.locator('#paymentAmount').inputValue(),'1300.55');
      await page.getByRole('button',{name:'Удалить платеж',exact:true}).click();
      await page.getByRole('button',{name:'Подтвердить удаление',exact:true}).click();
      await page.getByRole('heading',{name:'Редактирование платежа'}).waitFor({state:'hidden'});
      assert.equal(await editBill.count(),0,'1920: deleted mandatory payment still visible');
      assert.deepEqual(errors,[],'1920: mandatory payment CRUD raised runtime errors');
      console.log('PASS desktop-1920 mandatory payment create/edit/manual-paid/delete demo');


    }
    if(label!=='desktop-1920'){
      // Other requested viewport widths: validate the newly added mandatory
      // entry point and full modal save/delete in isolated demo state.
      await page.getByRole('button',{name:/Локальный демо-режим/}).click();
      await page.getByRole('button',{name:'Бюджет',exact:true}).first().click();
      const add=page.getByRole('button',{name:'Добавить обязательный платёж'}).filter({visible:true}).last();
      const bounds=await add.boundingBox();
      assert.ok(bounds && bounds.height>=44,label+': mandatory create target too small');
      await add.click();
      await page.getByRole('heading',{name:'Новый обязательный платёж'}).waitFor({state:'visible'});
      await page.locator('#paymentName').fill('QA обязательство '+label);
      await page.locator('#paymentAmount').fill('100.15');
      await page.locator('#paymentDay').fill('12');
      await page.screenshot({path:'artifacts/budget-browser/'+label+'-mandatory.png',fullPage:true,animations:'disabled'});
      await page.getByRole('button',{name:'Добавить платёж',exact:true}).click();
      await page.getByRole('heading',{name:'Новый обязательный платёж'}).waitFor({state:'hidden'});
      const edit=page.getByRole('button',{name:'Редактировать обязательный платёж: QA обязательство '+label}).filter({visible:true}).last();
      await edit.click();
      await page.getByRole('button',{name:'Удалить платеж',exact:true}).click();
      await page.getByRole('button',{name:'Подтвердить удаление',exact:true}).click();
      await page.getByRole('heading',{name:'Редактирование платежа'}).waitFor({state:'hidden'});
      assert.equal(await edit.count(),0,label+': deleted demo payment still visible');
      assert.deepEqual(errors,[],label+': mandatory flow generated errors');
      console.log('PASS',label,'mandatory payment create/delete demo');
    }
    // Shopping section smoke: verify real navigation and responsive quick-list
    // expansion on each viewport, without writing any family data.
    const shoppingTab=page.getByRole('button',{name:/Покупки/i}).filter({visible:true}).first();
    await shoppingTab.click();
    const quickLists=page.getByRole('button',{name:/Быстрые списки/}).filter({visible:true}).first();
    const repeat=page.getByRole('button',{name:/Повторить покупки/}).filter({visible:true}).first();
    await quickLists.waitFor({state:'visible'});
    for(const control of [quickLists,repeat]){
      const dimensions=await control.boundingBox();
      assert.ok(dimensions && dimensions.height>=44,label+': small shopping panel control');
      await control.click();
      assert.equal(await control.getAttribute('aria-expanded'),'true',label+': shopping panel did not expand');
    }
    const shoppingOverflow=await page.evaluate(()=>({
      viewport:window.innerWidth,body:document.body.scrollWidth,
      document:document.documentElement.scrollWidth
    }));
    assert.ok(shoppingOverflow.body<=shoppingOverflow.viewport+2 &&
      shoppingOverflow.document<=shoppingOverflow.viewport+2,
      label+': shopping horizontal overflow '+JSON.stringify(shoppingOverflow));
    await page.screenshot({path:'artifacts/budget-browser/'+label+'-shopping.png',fullPage:true,animations:'disabled'});
    assert.deepEqual(errors,[],label+': shopping panel runtime errors');
    console.log('PASS',label,'Shopping quick lists / repeat navigation and responsive layout');
    // Calendar is independent of the financial calendar. Exercise the actual
    // Plans screen in isolated demo mode, without saving or sending events.
    await page.getByRole('button',{name:'Планы',exact:true}).filter({visible:true}).first().click();
    const plans=page.getByTestId('plans-scroll-container');
    await plans.waitFor({state:'visible'});
    for(const name of ['Месяц','Неделя','День','Расписание']){
      const tab=plans.getByRole('button',{name,exact:true}).filter({visible:true}).first();
      await tab.click();
      assert.equal(await tab.getAttribute('aria-pressed'),'true',label+': calendar view '+name);
      const bounds=await tab.boundingBox();
      assert.ok(bounds && bounds.height>=43.95,label+': calendar view target '+name);
    }
    await plans.getByRole('button',{name:'День',exact:true}).click();
    await plans.getByRole('button',{name:'Следующий день',exact:true}).filter({visible:true}).first().click();
    await plans.getByRole('button',{name:'Предыдущий день',exact:true}).filter({visible:true}).first().click();
    const addEvent=plans.getByRole('button',{name:'Добавить событие',exact:true}).filter({visible:true}).first();
    await addEvent.click();
    const eventDialog=page.getByRole('dialog').filter({has:page.locator('#event-title-input')});
    await eventDialog.waitFor({state:'visible'});
    await eventDialog.locator('#event-title-input').fill('QA календарь '+label);
    await eventDialog.getByRole('button',{name:'Закрыть редактор события'}).click();
    await eventDialog.waitFor({state:'hidden'});
    await plans.getByRole('button',{name:'Месяц',exact:true}).click();
    if(width<1024){
      const metrics=await plans.evaluate(el=>{
        const initial=el.scrollTop;
        el.scrollTop=0;
        el.scrollTop=el.scrollHeight;
        const result={height:el.clientHeight,scrollHeight:el.scrollHeight,scrollTop:el.scrollTop};
        el.scrollTop=initial;
        return result;
      });
      if(metrics.scrollHeight>metrics.height+2)assert.ok(metrics.scrollTop>0,label+': plans scroll blocked');
    }
    const plansOverflow=await page.evaluate(()=>({viewport:innerWidth,body:document.body.scrollWidth,document:document.documentElement.scrollWidth}));
    assert.ok(plansOverflow.body<=plansOverflow.viewport+2&&plansOverflow.document<=plansOverflow.viewport+2,label+': plans horizontal overflow '+JSON.stringify(plansOverflow));
    await page.screenshot({path:'artifacts/budget-browser/'+label+'-plans.png',fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'Обзор',exact:true}).filter({visible:true}).first().click();
    await plans.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Планы',exact:true}).filter({visible:true}).first().click();
    await plans.waitFor({state:'visible'});
    assert.deepEqual(errors,[],label+': plans navigation runtime errors');
    console.log('PASS',label,'Plans views / day navigation / unsaved editor / return');
    // Exercise the actual settings dialog at every viewport. Changes are local demo only.
    const nav=page.getByRole('navigation',{name:width<768?'Основная навигация':'Основное меню'});
    const openSettings=page.getByRole('button',{name:'Настройки',exact:true}).filter({visible:true}).first();
    await openSettings.click();
    const settingsDialog=page.getByRole('dialog',{name:'Настройки',exact:true});
    await settingsDialog.waitFor({state:'visible'});
    await settingsDialog.getByRole('button',{name:/Оформление и приватность/}).filter({visible:true}).first().click();
    const themes=settingsDialog.getByRole('group',{name:'Тема приложения'});
    const startupSelect=settingsDialog.getByRole('combobox',{name:'Стартовый раздел'});
    await themes.getByRole('button',{name:'Тёмная',exact:true}).click();
    await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));
    assert.equal(await startupSelect.evaluate(el=>getComputedStyle(el).colorScheme),'dark',label+': native select color scheme');
    assert.equal(await startupSelect.locator('option').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(36, 37, 40)',label+': dark option background');
    assert.equal(await page.evaluate(()=>localStorage.getItem('theme')),'dark',label+': startup theme not persisted');
    await themes.getByRole('button',{name:'Светлая',exact:true}).click();
    await page.waitForFunction(()=>!document.documentElement.classList.contains('dark'));
    await page.emulateMedia({colorScheme:'dark'});
    await themes.getByRole('button',{name:'Системная',exact:true}).click();
    await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));
    await page.emulateMedia({colorScheme:'light'});
    await page.waitForFunction(()=>!document.documentElement.classList.contains('dark'));
    await themes.getByRole('button',{name:'Светлая',exact:true}).click();
    assert.equal(await settingsDialog.getByRole('checkbox',{name:'Обзор',exact:true}).isDisabled(),true,label+': overview must remain reachable');
    const services=settingsDialog.getByRole('checkbox',{name:'Сервисы',exact:true});
    const startup=settingsDialog.getByRole('combobox',{name:'Стартовый раздел'});
    await startup.selectOption('services');
    assert.equal(await startup.inputValue(),'services');
    await services.uncheck();
    await nav.getByRole('button',{name:'Сервисы',exact:true}).waitFor({state:'detached'});
    assert.equal(await startup.inputValue(),'overview',label+': invalid startup tab not reset');
    await services.check();
    await nav.getByRole('button',{name:'Сервисы',exact:true}).waitFor({state:'visible'});
    const shoppingWidget=settingsDialog.getByRole('checkbox',{name:'Список покупок',exact:true});
    await shoppingWidget.uncheck();
    const settingsOverflow=await settingsDialog.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));
    assert.ok(settingsOverflow.scroll<=settingsOverflow.width+2,label+': settings horizontal overflow '+JSON.stringify(settingsOverflow));
    await page.screenshot({path:'artifacts/budget-browser/'+label+'-settings.png',fullPage:true,animations:'disabled'});
    await settingsDialog.getByRole('button',{name:'Закрыть настройки'}).filter({visible:true}).click();
    await settingsDialog.waitFor({state:'hidden'});
    await nav.getByRole('button',{name:'Обзор',exact:true}).click();
    await page.getByRole('heading',{name:/^Список покупок$/i}).filter({visible:true}).first().waitFor({state:'hidden'});
    // Reopen from a section with an accessible header action, restore the card,
    // then inspect the PWA guide without opening a native installation dialog.
    await nav.getByRole('button',{name:'Планы',exact:true}).click();
    await openSettings.click();
    await settingsDialog.getByRole('button',{name:/Оформление и приватность/}).filter({visible:true}).first().click();
    assert.equal(await shoppingWidget.isChecked(),false,label+': widget preference not retained');
    await shoppingWidget.check();
    if(width<768)await settingsDialog.getByRole('button',{name:'Назад',exact:true}).click();
    await settingsDialog.getByRole('button',{name:/^Диагностика/}).filter({visible:true}).first().click();
    await settingsDialog.getByRole('heading',{name:'Подключение и данные'}).waitFor({state:'visible'});
    const installGuide=settingsDialog.getByRole('button',{name:'Как установить',exact:true});
    if(await installGuide.isVisible()){
      await installGuide.click();
      const guide=page.getByRole('dialog',{name:'Установка приложения',exact:true});
      await guide.waitFor({state:'visible'});
      assert.ok(await guide.getByText(/iPhone: в Safari/).isVisible());
      assert.ok(await guide.getByText(/Android: в Chrome/).isVisible());
      await guide.getByRole('button',{name:'Понятно',exact:true}).click();
      await guide.waitFor({state:'hidden'});
    }else{
      assert.ok(await settingsDialog.getByRole('button',{name:'Установить приложение',exact:true}).isVisible() ||
        await settingsDialog.getByText('Приложение открыто в отдельном окне.').isVisible());
    }
    await settingsDialog.getByRole('button',{name:'Закрыть настройки'}).filter({visible:true}).click();
    await settingsDialog.waitFor({state:'hidden'});
    await nav.getByRole('button',{name:'Обзор',exact:true}).click();
    await page.getByRole('heading',{name:/^Список покупок$/i}).filter({visible:true}).first().waitFor({state:'visible'});
    assert.deepEqual(errors,[],label+': settings runtime errors');
    console.log('PASS',label,'settings themes, navigation, widgets, diagnostics and PWA help');
    if(width===390){
      await page.evaluate(()=>localStorage.setItem('theme','dark'));
      await page.addInitScript(()=>{window.__themeTransitions=[];const observe=()=>{if(!document.documentElement)return;new MutationObserver(()=>window.__themeTransitions.push(document.documentElement.classList.contains('dark'))).observe(document.documentElement,{attributes:true,attributeFilter:['class']});};if(document.documentElement)observe();else document.addEventListener('readystatechange',observe,{once:true});});
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));
      await page.waitForTimeout(1200);
      assert.ok(await page.evaluate(()=>document.documentElement.classList.contains('dark')&&!window.__themeTransitions.includes(false)),label+': persisted dark theme flashes light during startup');
    }
    console.log('PASS',label,'login visible, no horizontal overflow or page errors');
    await page.close();
  }
}finally{
  await browser?.close();
  child?.kill('SIGTERM');
}
