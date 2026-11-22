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
  for(const [label,width,height] of [['phone-390',390,844],['tablet-768',768,1024],['desktop-1440',1440,900]]){
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
    console.log('PASS',label,'login visible, no horizontal overflow or page errors');
    await page.close();
  }
}finally{
  await browser?.close();
  child?.kill('SIGTERM');
}
