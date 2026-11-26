export type AlfaFileConfirmation =
 | {status:'confirmed';requested:number;fileSha256:string}
 | {status:'incomplete'|'unverified'|'superseded'};

/** A post-write file check is not a financial mutation. Fail closed on deletion. */
export async function confirmAlfaFile(fileSha256:string,readIds:()=>Promise<string[]>,areSaved:(ids:string[])=>Promise<boolean>,isCurrent:()=>boolean):Promise<AlfaFileConfirmation>{
 if(!isCurrent())return {status:'superseded'};
 if(!/^[a-f0-9]{64}$/.test(fileSha256))return {status:'unverified'};
 try{
  const ids=await readIds();
  if(!isCurrent())return {status:'superseded'};
  if(!ids.length)return {status:'unverified'};
  const allSaved=await areSaved(ids);
  if(!isCurrent())return {status:'superseded'};
  return allSaved?{status:'confirmed',requested:ids.length,fileSha256}:{status:'incomplete'};
 }catch{
  return {status:isCurrent()?'unverified':'superseded'};
 }
}
