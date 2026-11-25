import {runNavigationAudit} from './navigationAudit.mjs';
import {chromium} from 'playwright';
const origin='https://budget-omega-jade.vercel.app';
const login=process.env.QA_EMAIL_1?.trim().toLowerCase(),password=process.env.QA_PASSWORD_1,family=process.env.QA_FAMILY_ID?.trim();
if(!login||!password||!family)throw new Error('Missing QA credentials');
const email=login.includes('@')?login:login+'@family.local';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block',timezoneId:'UTC'});
const button=(scope,name)=>scope.getByRole('button',{name,exact:true}).filter({visible:true}).first();
try{
 await page.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  const app=url.origin===origin&&!url.pathname.startsWith('/api/');
  const firebase=url.protocol==='https:'&&['identitytoolkit.googleapis.com','securetoken.googleapis.com','firestore.googleapis.com','budg-1d5e0.firebaseapp.com'].includes(url.hostname);
  const assets=req.method()==='GET'&&['cdn.tailwindcss.com','fonts.googleapis.com','fonts.gstatic.com','www.gstatic.com'].includes(url.hostname);
  return app||firebase||assets?route.continue():route.abort();
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.getByPlaceholder('например: alexander или family1').fill(email);
 await page.locator('input[type=password]').fill(password);
 const auth=page.waitForResponse(r=>r.url().startsWith('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword')&&r.request().method()==='POST',{timeout:30000});
 await button(page,'Войти').click();const response=await auth;
 const user=await response.json();
 if(!response.ok()||user.localId!==family)throw new Error('QA login mismatch');
 const result=await runNavigationAudit(page);
 if(result.failures.length)process.exitCode=1;
}catch{console.error('FAIL production navigation suite setup or reset');process.exitCode=1;}
finally{await browser.close();}
