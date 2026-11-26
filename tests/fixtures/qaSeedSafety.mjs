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
