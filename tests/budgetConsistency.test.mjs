import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { diffSettings, personalTransactions } from '../utils/budgetConsistency.ts';

test('shared settings: sending one changed property never resubmits stale unrelated ones', () => {
  const old = { privacyMode:false, monthlyTarget:40000, salaryDates:[5] };
  const next = { ...old, privacyMode:true };
  assert.deepEqual(diffSettings(old,next),{privacyMode:true});
});

test('nested settings changes are detected without including other settings', () => {
  const old = { monthlyTarget:40000, manualPaidExpenses:{'2026-11':['rent']} };
  const next = { ...old, manualPaidExpenses:{'2026-11':['rent','internet']} };
  assert.deepEqual(diffSettings(old,next),{manualPaidExpenses:{'2026-11':['rent','internet']}});
});

test('partial settings update is accepted without resetting the other values', () => {
  assert.deepEqual(diffSettings({privacyMode:false, theme:'light'}, {privacyMode:true}),{privacyMode:true});
});

test('personal transactions never fall back to the entire family when member mapping is missing', () => {
 const transactions=[{id:'1',memberId:'member-a'}, {id:'2',memberId:'member-b'}];
 assert.deepEqual(personalTransactions(transactions,'personal',undefined),[]);
 assert.deepEqual(personalTransactions(transactions,'personal','member-a'),[transactions[0]]);
 assert.deepEqual(personalTransactions(transactions,'family',undefined),transactions);
});

test('concurrent payments in different months do not overwrite the other month', () => {
  const before = {manualPaidExpenses:{'2026-10':['rent'],'2026-11':[]},theme:'light'};
  const after = {...before,manualPaidExpenses:{'2026-10':['rent'],'2026-11':['rent']}};
  assert.deepEqual(diffSettings(before,after),{manualPaidExpenses:{'2026-11':['rent']}});
});

test('unchanged shared settings generate no writes', () => {
  const previous = {manualPaidExpenses:{'2026-11':['rent']},theme:'light'};
  assert.deepEqual(diffSettings(previous,{...previous}),{});
});

test('budget actions do not pass stale complete settings documents to updateSettings',()=>{
  for(const path of ['App.tsx','components/TerraOverview.tsx']){
    const code=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.doesNotMatch(code,/updateSettings\(\{\s*\.\.\.settings\s*,/g,path);
  }
});

test('unrelated settings survive partial toggle from a stale second-device snapshot',()=>{
  const latest={privacyMode:false,manualReservedAmount:7000,savingsRate:15};
  const staleDevice={privacyMode:false,manualReservedAmount:1000,savingsRate:15};
  const patch=diffSettings(latest,{privacyMode:!staleDevice.privacyMode});
  assert.deepEqual({...latest,...patch},{privacyMode:true,manualReservedAmount:7000,savingsRate:15});
});
