import crypto from 'node:crypto';

// Firebase ID tokens are verified with Google's public signing keys. No service
// account or Firebase Blaze needed. Never trust a uid supplied by the browser.
let certificates=null,certificatesUntil=0;
async function googleCertificates(){
  if(certificates&&Date.now()<certificatesUntil)return certificates;
  const res=await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if(!res.ok)throw new Error('Firebase signing keys unavailable');
  const next=await res.json();
  const age=/max-age=(\d+)/.exec(res.headers.get('cache-control')||'');
  certificates=next;
  certificatesUntil=Date.now()+(age?Math.min(Number(age[1]),3600):600)*1000;
  return next;
}
export async function verifyFirebaseToken(token){
  if(typeof token!=='string'||token.length>8192)throw new Error('Missing Firebase authentication');
  const parts=token.split('.');
  if(parts.length!==3)throw new Error('Malformed authentication');
  const header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  const now=Math.floor(Date.now()/1000);
  const project='budg-1d5e0';
  if(header.alg!=='RS256'||!header.kid||
     payload.aud!==project||payload.iss!==`https://securetoken.google.com/${project}`||
     typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128||
     typeof payload.exp!=='number'||payload.exp<=now||
     typeof payload.iat!=='number'||payload.iat>now+60||
     typeof payload.auth_time!=='number'||payload.auth_time>now+60){
    throw new Error('Invalid Firebase authentication claims');
  }
  const certs=await googleCertificates();
  if(!Object.hasOwn(certs,header.kid))throw new Error('Unknown Firebase signing key');
  const valid=crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),certs[header.kid],Buffer.from(parts[2],'base64url'));
  if(!valid)throw new Error('Invalid Firebase signature');
  return {uid:payload.sub,token};
}
async function firestoreDoc(path,token){
  const url=`https://firestore.googleapis.com/v1/projects/budg-1d5e0/databases/(default)/documents/${path}`;
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)throw new Error('Family authorization failed');
  return response.json();
}
export async function verifyFamilyMembership(identity,familyId){
  if(typeof familyId!=='string'||!/^[-_A-Za-z0-9]{4,128}$/.test(familyId))throw new Error('Invalid family ID');
  const user=await firestoreDoc('users/'+encodeURIComponent(identity.uid),identity.token);
  if(user.fields?.familyId?.stringValue!==familyId)throw new Error('User is not in this family');
  const family=await firestoreDoc('families/'+encodeURIComponent(familyId),identity.token);
  const members=family.fields?.members?.arrayValue?.values||[];
  if(!members.some(member=>member.stringValue===identity.uid))throw new Error('User is not a family member');
}
function key(){
  if(!process.env.CRON_SECRET||process.env.CRON_SECRET.length<16)throw new Error('Server encryption secret missing');
  return crypto.createHash('sha256').update(process.env.CRON_SECRET).digest();
}
export function encryptSecret(secret){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
  const bytes=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
  return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),bytes.toString('base64url')].join('.');
}
export function decryptSecret(encoded){
  const [iv,tag,content]=encoded.split('.').map(s=>Buffer.from(s,'base64url'));
  const decipher=crypto.createDecipheriv('aes-256-gcm',key(),iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(content),decipher.final()]).toString('utf8');
}
export const SUBSCRIBERS='budget:calendar:telegram:active:v1';
export const userKey=uid=>`budget:calendar:telegram:subscriber:v1:${uid}`;
export const familyKey=familyId=>`budget:calendar:telegram:family:v1:${familyId}`;
export const deliveryKey=(botToken,chatId,reminder)=>'budget:calendar:telegram:sent:v1:'+crypto.createHash('sha256').update(
  [botToken,chatId,reminder.id,reminder.date,reminder.lead,reminder.triggerMinute].join('|')
).digest('hex');
export function validateTelegramCredentials(body){
  if(typeof body.timeZone!=='string'||body.timeZone.length>80)throw new Error('Invalid time zone');
  try{new Intl.DateTimeFormat('en',{timeZone:body.timeZone});}catch{throw new Error('Unknown time zone');}
  if(typeof body.botToken!=='string'||body.botToken.length<20||body.botToken.length>200||
     typeof body.chatId!=='string'||!/^\\-?\\d{4,20}$/.test(body.chatId))throw new Error('Invalid Telegram configuration');
}
export function validateCalendarSnapshot(body){
  const {familyId,events,members,payments,paid}=body;
  if(!Array.isArray(events)||events.length>2000||
     !Array.isArray(members)||members.length>20||
     !Array.isArray(payments)||payments.length>200||
     typeof paid!=='object'||!paid||Array.isArray(paid))throw new Error('Invalid calendar data');
  if(typeof timeZone!=='string'||timeZone.length>80)throw new Error('Invalid time zone');
  try{new Intl.DateTimeFormat('en',{timeZone});}catch{throw new Error('Unknown time zone');}
  if(typeof body.botToken!=='string'||body.botToken.length<20||body.botToken.length>200||
     typeof body.chatId!=='string'||!/^-?\d{4,20}$/.test(body.chatId))throw new Error('Invalid Telegram configuration');
  const cleanEvents=events.map(e=>({
    id:String(e.id||'').slice(0,150),title:String(e.title||'').slice(0,300),
    date:e.date,time:e.time,kind:e.kind,completed:Boolean(e.completed),
    isTemplate:Boolean(e.isTemplate),
    memberIds:Array.isArray(e.memberIds)?e.memberIds.slice(0,20):[],
    recurrence:e.recurrence,recurrenceUntil:e.recurrenceUntil,
    recurrenceExceptions:Array.isArray(e.recurrenceExceptions)?e.recurrenceExceptions.slice(0,300):[],
    reminders:Array.isArray(e.reminders)?e.reminders.slice(0,20):[]
  }));
  return {familyId,events:cleanEvents,members:members.map(m=>({id:m.id,userId:m.userId})),payments:payments.map(p=>({
    id:p.id,name:String(p.name||'').slice(0,200),day:p.day,remind:p.remind,memberId:p.memberId
  })),paid};
}
