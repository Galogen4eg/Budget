// Pure safety gates for the explicitly configured existing QA account.
export const QA_FIXTURE_PREFIX='qa-fixture-v1-';
export function qaSeedCredentials(env){
 const login=env.QA_EMAIL_1?.trim().toLowerCase(),password=env.QA_PASSWORD_1,fid=env.QA_FAMILY_ID?.trim();
 if(!login||!password||!fid||fid.includes('/'))throw new Error('Existing QA credentials required');
 return {login,password,fid};
}
export function assertEmptySeedCollection(result){
 if(!result||result.nextPageToken||(result.documents??[]).length)throw new Error('Initial seed refuses nonempty or incomplete collection');
}
export function assertQaFixtureBaseline(records,seeded){
 if(!Array.isArray(records))throw new Error('Unexpected baseline');
 for(const doc of records){
  const id=doc?.name?.split('/').at(-1);
  if(!seeded||!id?.startsWith(QA_FIXTURE_PREFIX)||doc.fields?.id?.stringValue!==id)throw new Error('Unmarked QA data; refusing mutation');
 }
}

const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function assertUnchangedQaFixtureBaseline(before,after,seeded){
 assertQaFixtureBaseline(before,seeded);assertQaFixtureBaseline(after,seeded);
 const byName=rows=>Object.fromEntries(rows.map(d=>[d.name,d.fields]));
 if(!equal(byName(before),byName(after)))throw new Error('Seeded records changed during regression');
}
export function assertUnmarkedBillsPreserved(before,after,testId){
 const bills=fields=>(fields?.mandatoryExpenses?.arrayValue?.values??[]).filter(v=>!testId||v?.mapValue?.fields?.id?.stringValue!==testId);
 const paid=fields=>Object.fromEntries(Object.entries(fields?.manualPaidExpenses?.mapValue?.fields??{}).map(([month,value])=>[month,(value?.arrayValue?.values??[]).filter(v=>!testId||v.stringValue!==testId).map(v=>v.stringValue)]).filter(([,ids])=>ids.length));
 if(!equal(bills(before),bills(after))||!equal(paid(before),paid(after)))throw new Error('Non-test mandatory payments changed; refusing restore');
}
