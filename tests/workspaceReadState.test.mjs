import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkspaceRead,updateWorkspaceRead,workspaceStatus} from '../utils/workspaceReadState.ts';
test('empty data is ready only after a confirmed snapshot; errors remain scoped to relevant sections',()=>{
 let state=initialWorkspaceRead('a');
 assert.equal(workspaceStatus(state,'a',['events','members']),'loading');
 state=updateWorkspaceRead(state,'a','events','ready');
 state=updateWorkspaceRead(state,'a','members','ready');
 state=updateWorkspaceRead(state,'a','shopping','error');
 assert.equal(workspaceStatus(state,'a',['events','members']),'ready');
 assert.equal(workspaceStatus(state,'a',['shopping']),'error');
 assert.equal(workspaceStatus(state,'b',['events']),'loading');
});
test('cache is not an authoritative empty state; old callbacks cannot restore another family',()=>{
 let state=initialWorkspaceRead('b');
 state=updateWorkspaceRead(state,'a','shopping','ready');
 assert.equal(workspaceStatus(state,'b',['shopping']),'loading');
 state=updateWorkspaceRead(state,'b','shopping','stale');
 assert.equal(workspaceStatus(state,'b',['shopping']),'stale');
 state=updateWorkspaceRead(state,'b','shopping','ready');
 assert.equal(workspaceStatus(state,'b',['shopping']),'ready');
 assert.equal(workspaceStatus(state,null,['shopping']),'ready');
});
