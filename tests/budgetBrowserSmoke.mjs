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
  for(const [label,width,height] of [['phone-390',390,844],['tablet-768',768,1024],['desktop-1440',1440,900],['desktop-1920',1920,1080]]){
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
      const options=page.locator('button').filter({hasText:/^(январь|февраль|март|апрель|май|июнь|июль|август|сентябрь|октябрь|ноябрь|декабрь) \d{4}$/i}).filter({visible:true});
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
    }
    console.log('PASS',label,'login visible, no horizontal overflow or page errors');
    await page.close();
  }
}finally{
  await browser?.close();
  child?.kill('SIGTERM');
}
