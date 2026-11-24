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
module.exports={partition,merge};
