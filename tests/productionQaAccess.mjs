import {readFileSync} from 'node:fs';
const names=['QA_EMAIL_1','QA_PASSWORD_1','QA_FAMILY_ID'];
const missing=names.filter(key=>!process.env[key]?.trim());
if(missing.length){console.error('Missing GitHub secrets: '+missing.join(', '));process.exit(1);}
console.log('PASS all three required GitHub secrets are available');
const src=readFileSync(new URL('../firebase.ts',import.meta.url),'utf8');
const value=key=>src.match(new RegExp('\\b'+key+'\\s*:\\s*"([^"]+)"'))?.[1];
const apiKey=value('apiKey'),project=value('projectId');
if(!apiKey||project!=='budg-1d5e0'){console.error('Unexpected Firebase configuration');process.exit(1);}
const email=process.env.QA_EMAIL_1.trim();
const familyId=process.env.QA_FAMILY_ID.trim();
const password=process.env.QA_PASSWORD_1;
const fail=message=>{console.error(message);process.exit(1);};
const safeCode=value=>typeof value==='string'&&/^[A-Z0-9_]{1,80}$/.test(value)?value:'UNKNOWN';
try{
 const auth=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(apiKey),{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email,password,returnSecureToken:true}),signal:AbortSignal.timeout(30000)
 });
 const signed=await auth.json();
 if(!auth.ok||!signed.idToken||!signed.localId)fail('FAIL Firebase authentication: '+safeCode(signed.error?.message));
 console.log('PASS production Firebase authentication');
 const uid=signed.localId;
 const read=async(...parts)=>{
  const url='https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents/'+parts.map(encodeURIComponent).join('/');
  const response=await fetch(url,{headers:{Authorization:'Bearer '+signed.idToken},signal:AbortSignal.timeout(30000)});
  const doc=await response.json();
  if(!response.ok)fail('FAIL production Firestore read: '+response.status+' '+safeCode(doc.error?.status));
  return doc.fields??{};
 };
 const profile=await read('users',uid);
 if(profile.familyId?.stringValue!==familyId)fail('FAIL QA_FAMILY_ID does not match the signed-in user family');
 console.log('PASS account belongs to the configured family');
 const family=await read('families',familyId);
 const members=(family.members?.arrayValue?.values??[]).map(x=>x.stringValue);
 if(family.ownerId?.stringValue!==uid||familyId!==uid||members.length!==1||members[0]!==uid)fail('FAIL safety gate: expected a separate single-owner QA family');
 console.log('PASS separate single-owner family structure verified');
 const member=await read('families',familyId,'members',uid);
 if(member.userId?.stringValue!==uid)fail('FAIL member profile is not linked to the QA account');
 console.log('PASS member profile readable and linked');
 const site=await fetch('https://budget-omega-jade.vercel.app/',{signal:AbortSignal.timeout(30000)});
 if(!site.ok)fail('FAIL production site HTTP '+site.status);
 console.log('PASS production site reachable (HTTP '+site.status+')');
 console.log('PASS read-only production access check; no financial documents written or deleted');
}catch(error){
 console.error('FAIL access check request failed: '+(error?.name==='TimeoutError'?'timeout':'network or response error'));
 process.exitCode=1;
}
