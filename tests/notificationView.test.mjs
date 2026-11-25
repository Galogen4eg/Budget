import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationView, markNotificationsRead } from '../utils/notificationView.ts';
const make=(id,isRead=false)=>({id,title:id,message:'Real reminder',date:'2026-11-25T10:00:00Z',type:'info',isRead});
test('real unread count and filters share the same list',()=>{
 const items=[make('one'),make('two',true)];
 assert.deepEqual(notificationView(items,'all'),{items,unread:1});
 assert.deepEqual(notificationView(items,'unread'),{items:[items[0]],unread:1});
});
test('mark all read is immutable, keeps real records, and unread filter is empty',()=>{
 const items=[make('one'),make('two',true)];
 const read=markNotificationsRead(items);
 assert.equal(items[0].isRead,false);
 assert.equal(read[1],items[1]);
 assert.deepEqual(notificationView(read,'unread'),{items:[],unread:0});
 assert.equal(notificationView(read,'all').items.length,2);
});
test('empty and dismissed lists do not acquire invented records',()=>{
 assert.deepEqual(notificationView([],'all'),{items:[],unread:0});
 assert.deepEqual(notificationView([make('one')].filter(n=>n.id!=='one'),'all'),{items:[],unread:0});
});
