import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {initializeFirestore} from 'firebase-admin/firestore';
import grok from '../functions/grokService.cjs';

const {createGrokService,GrokError}=grok;
let runtimeCache;
function productionRuntime(){
 if(runtimeCache)return runtimeCache;
 const raw=process.env.BUDGET_FIREBASE_SERVICE_ACCOUNT;
 const key=process.env.BUDGET_GROK_KEY_ENCRYPTION_KEY??'';
 if(!raw||!/^[a-f0-9]{64}$/i.test(key))throw Error('Grok is not configured');
 const account=JSON.parse(raw);
 if(account.project_id!=='budg-1d5e0')throw Error('Unexpected Firebase project');
 const app=getApps().find(a=>a.name==='budget-grok')??initializeApp({credential:cert(account),projectId:account.project_id},'budget-grok');
 const db=initializeFirestore(app,{preferRest:true});
 // No client rule grants access to this server-only subcollection.
 const ref=uid=>db.collection('users').doc(uid).collection('privateIntegrations').doc('grok');
 const store={
  read:async uid=>(await ref(uid).get()).data(),
  change:async(uid,transform)=>db.runTransaction(async tx=>{const doc=ref(uid),snap=await tx.get(doc);const next=transform(snap.data());tx.set(doc,next);return next;})
 };
 runtimeCache={verifyToken:token=>getAuth(app).verifyIdToken(token,true),service:createGrokService({store,secret:Buffer.from(key,'hex')})};
 return runtimeCache;
}
const messages={
 'bad-request':'Некорректный запрос или ключ.',
 'invalid-key':'Ключ не принят xAI или не имеет доступа к модели.',
 'key-limit':'Можно подключить не более трёх ключей.',
 'no-working-key':'Нет проверенного рабочего ключа Grok.',
 'quota':'Лимит запросов Grok исчерпан. Повторите позже.',
 'billing':'Проверьте баланс и оплату в консоли xAI.',
 'unavailable':'Grok временно недоступен. Запрос не повторён автоматически.',
 'model-error':'Модель не вернула ожидаемый ответ. Проверьте доступ в консоли xAI.',
 'disabled':'Grok отключён в настройках.',
 'not-found':'Ключ не найден.'
};
export function createGrokHandler(runtime=productionRuntime){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  // Capacitor uses localhost origins; browser requests are same-origin.
  const origin=req.headers?.origin;
  if(['capacitor://localhost','http://localhost','https://localhost'].includes(origin)){
   res.setHeader('Access-Control-Allow-Origin',origin);
   res.setHeader('Vary','Origin');
   res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  }
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Метод не поддерживается'});}
  const token=typeof req.headers?.authorization==='string'?/^Bearer ([^\s]+)$/.exec(req.headers.authorization)?.[1]:null;
  if(!token)return res.status(401).json({error:'Войдите в Budget',code:'unauthenticated'});
  let ctx;
  try{ctx=runtime();}catch{return res.status(503).json({error:'Интеграция Grok не настроена на сервере',code:'not-configured'});}
  let user;
  try{user=await ctx.verifyToken(token);}catch{return res.status(401).json({error:'Войдите в Budget повторно',code:'unauthenticated'});}
  let body;
  try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return res.status(400).json({error:messages['bad-request'],code:'bad-request'});}
  try{return res.status(200).json(await ctx.service(user.uid,body));}
  catch(e){
   if(e instanceof GrokError)return res.status(e.status).json({error:messages[e.code]??'Ошибка Grok',code:e.code});
   // Never log upstream bodies, request payloads, or credential material.
   return res.status(503).json({error:'Не удалось подтвердить состояние Grok. Повторите проверку.',code:'unavailable'});
  }
 };
}
export default createGrokHandler();
