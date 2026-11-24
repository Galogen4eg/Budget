'use strict';
// Server migration engine. All inputs come from transaction snapshots, never the caller.
function partition(expenses, paid, memberIds) {
  const buckets = new Map(memberIds.map(id=>[id,{mandatoryExpenses:[],manualPaidExpenses:{}}]));
  const owners = new Map();
  for (const e of expenses) {
    if (!e.id || owners.has(e.id) || !buckets.has(e.memberId)) throw new Error('Invalid obligation ownership');
    owners.set(e.id,e.memberId);
    buckets.get(e.memberId).mandatoryExpenses.push({...e});
  }
  for (const [month, ids] of Object.entries(paid)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Array.isArray(ids)) throw new Error('Invalid payment history');
    for (const id of new Set(ids)) {
      if (!owners.has(id)) throw new Error('Unassigned payment history');
      (buckets.get(owners.get(id)).manualPaidExpenses[month] ??= []).push(id);
    }
  }
  return buckets;
}
function merge(documents, memberIds) {
  const expected=new Set(memberIds), seen=new Set(), expenses=[], paid={}, ids=new Set();
  for (const d of documents) {
    if (!expected.has(d.memberId)||seen.has(d.memberId)||!Array.isArray(d.mandatoryExpenses)) throw new Error('Missing or duplicate member document');
    seen.add(d.memberId);
    const own=new Set();
    for(const e of d.mandatoryExpenses) {
      if(!e.id||e.memberId!==d.memberId||ids.has(e.id))throw new Error('Conflicting obligation ownership');
      ids.add(e.id);own.add(e.id);expenses.push({...e});
    }
    for(const [month, entries] of Object.entries(d.manualPaidExpenses||{})){
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Array.isArray(entries)||entries.some(id=>!own.has(id)))throw new Error('Invalid personal payment history');
      (paid[month]??=[]).push(...new Set(entries));
    }
  }
  if(seen.size!==expected.size)throw new Error('Missing member document');
  return {mandatoryExpenses:expenses,manualPaidExpenses:paid};
}
// Shared balances and limits are independent from personal balances and limits.
// Preserve the prior family configuration, never infer an opening balance from transactions.
const SHARED_FINANCE=['initialBalance','initialBalanceDate','savingsRate','targetMonthlyBudget','manualReservedAmount','categoryBudgets','mandatoryExpenses','manualPaidExpenses','ignoredDuplicatePairs'];
function prepareTransition({family,actor,target,profiles,configs,shared,records,archive}){
 if(!actor||family.ownerId!==actor||!Array.isArray(family.members)||!family.members.includes(actor))throw new Error('Only household owner may change budget policy');
 if(!['family','personal'].includes(target))throw new Error('Invalid target');
 const current=family.budgetPolicy??'family';
 if(!['family','personal'].includes(current))throw new Error('Invalid stored policy');
 if(current===target)return {policy:current,noChange:true};
 const uids=[...new Set(family.members)];
 if(uids.length!==family.members.length||uids.length===0)throw new Error('Invalid membership');
 const linked=uids.map(uid=>{
   const matches=profiles.filter(p=>p.userId===uid);
   if(matches.length!==1)throw new Error('Ambiguous member profile');
   return {uid,id:matches[0].id};
 });
 const ids=linked.map(p=>p.id);
 if(new Set(ids).size!==ids.length||ids.some(id=>!id))throw new Error('Invalid member IDs');
 if(records.some(row=>!ids.includes(row.memberId)))throw new Error('Financial record without linked owner');
 if(target==='personal'){
   const userPatches=Object.create(null);
   const buckets=partition(shared.mandatoryExpenses??[],shared.manualPaidExpenses??{},ids);
   for(const p of linked){
     const config=configs[p.uid];
     if(!config||!Number.isFinite(config.personalInitialBalance))throw new Error('Personal opening missing');
     const b=buckets.get(p.id);
     userPatches[p.uid]={personalMandatoryExpenses:b.mandatoryExpenses,personalManualPaidExpenses:b.manualPaidExpenses};
   }
   return {policy:target,userPatches,archive:Object.fromEntries(SHARED_FINANCE.filter(k=>k in shared&&!['mandatoryExpenses','manualPaidExpenses'].includes(k)).map(k=>[k,shared[k]])),removeShared:SHARED_FINANCE};
 }
 if(!archive||typeof archive!=='object')throw new Error('Missing shared settings archive');
 const merged=merge(linked.map(p=>({memberId:p.id,mandatoryExpenses:configs[p.uid]?.personalMandatoryExpenses,manualPaidExpenses:configs[p.uid]?.personalManualPaidExpenses})),ids);
 return {policy:target,sharedPatch:{...archive,...merged}};
}
module.exports={partition,merge,prepareTransition,SHARED_FINANCE};
