import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveFamilyJoinProfile,assertUnusedFamilyProfile} from '../utils/familyInvitation.ts';
const member=(patch={})=>({id:'profile-2',name:'Участник',color:'#000000',...patch});
test('iteration 82: rejoining preserves the existing profile ID and admin role',()=>{
 const existing=member({userId:'uid',isAdmin:true});
 assert.equal(resolveFamilyJoinProfile([existing],'uid',null).id,'profile-2');
 assert.equal(resolveFamilyJoinProfile([existing],'uid',null).isAdmin,true);
});
test('iteration 82: invitation cannot claim an occupied or missing profile',()=>{
 assert.throws(()=>resolveFamilyJoinProfile([member({userId:'other'})],'uid','profile-2'),/привязан/);
 assert.throws(()=>resolveFamilyJoinProfile([],'uid','profile-2'),/не найден/);
});
test('iteration 82: unused profile deletion rejects connected accounts and historical transactions',()=>{
 assert.throws(()=>assertUnusedFamilyProfile(member({userId:'uid'}),false),/аккаунт/);
 assert.throws(()=>assertUnusedFamilyProfile(member(),true),/запис/);
 assert.doesNotThrow(()=>assertUnusedFamilyProfile(member(),false));
});
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('iteration 82: family switch cannot overwrite target data before authorization',()=>{
 const modal=read('components/SettingsModal.tsx');
 assert.doesNotMatch(modal,/migrateFamilyData\(/);
 assert.match(modal,/await onJoinFamily\(targetId\)/);
});
test('iteration 82: deletion and rejoin use guarded persistence',()=>{
 const ui=read('components/MembersSettingsSection.tsx');
 const db=read('utils/db.ts');
 assert.match(ui,/await deleteUnusedFamilyProfile\(/);
 assert.match(db,/resolveFamilyJoinProfile\(/);
 assert.match(db,/assertUnusedFamilyProfile\(/);
});
