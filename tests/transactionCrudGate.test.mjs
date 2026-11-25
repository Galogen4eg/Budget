import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transactionSaveError} from '../utils/transactionSaveError.ts';
test('transaction failures explain permission, network and known consistency errors without exposing server details',()=>{
 assert.match(transactionSaveError({code:'permission-denied',message:'private-id'}),/permission-denied/);
 assert.doesNotMatch(transactionSaveError({code:'permission-denied',message:'private-id'}),/private-id/);
 assert.match(transactionSaveError({code:'firestore/unavailable'}),/unavailable/);
 assert.match(transactionSaveError(new Error('Накопительная цель недоступна')),/Накопительная цель недоступна/);
 assert.match(transactionSaveError(new Error('private-id')),/TX-SAVE/);
 assert.doesNotMatch(transactionSaveError(new Error('private-id')),/private-id/);
});
test('every PR runs authenticated transaction CRUD, not merely the unsaved editor',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/budget-firestore-crud.yml',import.meta.url),'utf8');
 assert.doesNotMatch(workflow,/^\s+paths:/m);
 assert.match(workflow,/--project demo-budget --only auth,firestore --config firebase.test.json "node tests\/transactionCrudBrowser.mjs"/);
 const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 assert.match(app,/\{ \.\.\.txData, id: editing.id, userId: editing.userId \}/);
});
