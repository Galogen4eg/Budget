import test from 'node:test';
import assert from 'node:assert/strict';
import {modalBackTarget} from '../utils/modalBackTarget.ts';
test('Back dismisses only the top active registered dialog',()=>{
 assert.equal(modalBackTarget(['editor','picker'],'editor'),'picker');
 assert.equal(modalBackTarget(['editor'],null),'editor');
 assert.equal(modalBackTarget([],null),null);
});
test('Back over a stale child entry returning to current parent does not dismiss it',()=>{
 assert.equal(modalBackTarget(['editor'],'editor'),null);
});
