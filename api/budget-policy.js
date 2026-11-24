import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import service from '../functions/budgetPolicyService.cjs';

const {changeHouseholdBudgetPolicy,PolicyError}=service;
const statusFor={'unauthenticated':401,'permission-denied':403,'invalid-argument':400,'failed-precondition':409};
const projectId='budg-1d5e0';
function productionRuntime(){
  const raw=process.env.BUDGET_FIREBASE_SERVICE_ACCOUNT;
  if(!raw)throw new Error('SET-12 credentials not configured');
  const account=JSON.parse(raw);
  if(account.project_id!==projectId)throw new Error('Unexpected Firebase project');
  const app=getApps().find(app=>app.name==='budget-policy')??initializeApp({credential:cert(account),projectId},'budget-policy');
  return {db:getFirestore(app),FieldValue,verifyToken:token=>getAuth(app).verifyIdToken(token,true),enabled:process.env.BUDGET_SET12_ENABLED==='true'};
}
export function createBudgetPolicyHandler(runtime=productionRuntime){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Метод не поддерживается'});}
  const token=typeof req.headers?.authorization==='string'?/^Bearer ([^\s]+)$/.exec(req.headers.authorization)?.[1]:null;
  if(!token)return res.status(401).json({error:'Войдите в Budget'});
  let data;
  try{data=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return res.status(400).json({error:'Некорректный запрос'});}
  if(!data||typeof data!=='object'||Array.isArray(data)||!['family','personal'].includes(data.target)||typeof data.preview!=='boolean'||typeof data.familyId!=='string')return res.status(400).json({error:'Некорректный запрос'});
  const started=Date.now();
  const timing=stage=>console.info(`SET-12 ${data.preview?'preview':'change'} ${stage} elapsedMs=${Date.now()-started}`);
  timing('start');
  let ctx;
  try{ctx=runtime();}catch{return res.status(503).json({error:'Сервер SET-12 ещё не настроен'});}
  let user;
  try{user=await ctx.verifyToken(token);timing('auth-complete');}catch{return res.status(401).json({error:'Войдите в Budget повторно'});}
  try{
   const result=await changeHouseholdBudgetPolicy({db:ctx.db,FieldValue:ctx.FieldValue,uid:user.uid,data,enabled:ctx.enabled,timing});
   timing('complete');
   return res.status(200).json(result);
  }catch(error){
   if(error instanceof PolicyError)return res.status(statusFor[error.code]??500).json({error:error.message});
   console.error('SET-12 migration failed',error?.code??'unknown');
   return res.status(500).json({error:'Не удалось выполнить переход. Проверьте текущий режим перед повтором.'});
  }
 };
}
export default createBudgetPolicyHandler();
