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

let browser;
try{
  await waitForServer();
  await mkdir('artifacts/budget-browser',{recursive:true});
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const [label,width,height] of [['phone-320',320,700],['phone-390',390,844],['tablet-768',768,1024],['laptop-1280',1280,800],['desktop-1440',1440,900],['desktop-1920',1920,1080]]){
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    const response=await page.goto(baseURL,{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(response?.status(),200,label+': page did not return 200');
    await page.getByRole('button',{name:/Войти/i}).waitFor({state:'visible',timeout:30000});
    assert.equal(await page.locator('input[type="password"]').count()>0,true,label+': password field missing');
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
      const personal=page.getByRole('button',{name:/^Личный/}).first();
      const family=page.getByRole('button',{name:/^Семейный$/}).first();
      await personal.click();
      assert.equal(await personal.getAttribute('aria-pressed'),'true','1920: personal mode not selected');
      await family.click();
      assert.equal(await family.getAttribute('aria-pressed'),'true','1920: family mode not restored');
      assert.deepEqual(errors,[],'1920: Overview generated runtime errors');
      await page.screenshot({path:'artifacts/budget-browser/desktop-1920-overview.png',fullPage:true,animations:'disabled'});
      console.log('PASS desktop-1920 Overview demo interactions');
      // Re-select the latest month so the shared daily guidance is meaningful.
      await picker.click();
      await page.locator('div.absolute.right-0.top-full').getByRole('button').last().click();

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
    console.log('PASS',label,'login visible, no horizontal overflow or page errors');
    await page.close();
  }
}finally{
  await browser?.close();
  child?.kill('SIGTERM');
}
