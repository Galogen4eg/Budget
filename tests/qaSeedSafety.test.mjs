import test from 'node:test';
import assert from 'node:assert/strict';
import {qaSeedCredentials,assertEmptySeedCollection,assertQaFixtureBaseline,assertUnchangedQaFixtureBaseline,assertUnmarkedBillsPreserved} from './fixtures/qaSeedSafety.mjs';

test('reuse only the existing configured QA credentials, not a second account',()=>{
 assert.deepEqual(qaSeedCredentials({QA_EMAIL_1:' QA1 ',QA_PASSWORD_1:'fixture-pass',QA_FAMILY_ID:' qa-id '}),{login:'qa1',password:'fixture-pass',fid:'qa-id'});
 assert.throws(()=>qaSeedCredentials({QA_FILLED_EMAIL:'qa2',QA_FILLED_PASSWORD:'pass',QA_FILLED_FAMILY_ID:'other'}));
});
test('initial seed refuses preexisting documents and truncated results',()=>{
 assert.doesNotThrow(()=>assertEmptySeedCollection({}));
 assert.throws(()=>assertEmptySeedCollection({documents:[{name:'existing'}]}));
 assert.throws(()=>assertEmptySeedCollection({nextPageToken:'more'}));
});
test('populated regression baseline permits only exact marked fixtures; never delete unmarked records',()=>{
 const doc=id=>({name:'projects/p/databases/(default)/documents/families/qa/events/'+id,fields:{id:{stringValue:id}}});
 assert.doesNotThrow(()=>assertQaFixtureBaseline([doc('qa-fixture-v1-event-0')],true));
 assert.throws(()=>assertQaFixtureBaseline([doc('qa-fixture-v1-event-0')],false));
 assert.throws(()=>assertQaFixtureBaseline([doc('ordinary-record')],true));
 const mismatched=doc('qa-fixture-v1-event-0');mismatched.fields.id.stringValue='different';
 assert.throws(()=>assertQaFixtureBaseline([mismatched],true));
 assert.doesNotThrow(()=>assertQaFixtureBaseline([],false));
});

test('baseline readback detects changed or deleted fixture records',()=>{
 const id='qa-fixture-v1-event-0',doc={name:'families/qa/events/'+id,fields:{id:{stringValue:id},title:{stringValue:'Fixture'}}};
 assert.doesNotThrow(()=>assertUnchangedQaFixtureBaseline([doc],[structuredClone(doc)],true));
 assert.throws(()=>assertUnchangedQaFixtureBaseline([doc],[],true));
 const changed=structuredClone(doc);changed.fields.title.stringValue='Changed';
 assert.throws(()=>assertUnchangedQaFixtureBaseline([doc],[changed],true));
});
test('bill cleanup preserves original obligations and paid history',()=>{
 const bill=id=>({mapValue:{fields:{id:{stringValue:id},amount:{integerValue:'100'}}}});
 const fields=(ids,paid)=>({mandatoryExpenses:{arrayValue:{values:ids.map(bill)}},manualPaidExpenses:{mapValue:{fields:{'2026-11':{arrayValue:{values:paid.map(id=>({stringValue:id}))}}}}}});
 const before=fields(['fixture'],['fixture']);
 assert.doesNotThrow(()=>assertUnmarkedBillsPreserved(before,fields(['fixture','test'],['fixture','test']),'test'));
 assert.throws(()=>assertUnmarkedBillsPreserved(before,fields(['test'],['fixture','test']),'test'));
 assert.throws(()=>assertUnmarkedBillsPreserved(before,fields(['fixture','test'],['test']),'test'));
});
