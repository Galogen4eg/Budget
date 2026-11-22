import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const settings=readFileSync(new URL('../components/SettingsModal.tsx',import.meta.url),'utf8');
const members=readFileSync(new URL('../components/MembersSettingsSection.tsx',import.meta.url),'utf8');

test('settings do not imply unimplemented Telegram 2FA enrollment',()=>{
 assert.doesNotMatch(settings,/setIs2FAEnabled|is2FAEnabled/);
 assert.doesNotMatch(settings,/@alex_terra_user/);
 assert.match(settings,/Двухфакторная аутентификация в Budget пока не настроена/);
});
test('settings do not claim unsupported local audit encryption',()=>{
 assert.doesNotMatch(settings,/Все действия в журнале аудита шифруются локальным ключом семьи/);
});
test('family selector does not steal a profile or infer it from email',()=>{
 assert.match(members,/bindFamilyProfile\(members, currentUserId, targetMemberId\)/);
 assert.match(members,/disabled=\{Boolean\(m\.userId && m\.userId !== currentUserId\)\}/);
 assert.doesNotMatch(members,/const byEmail = members\.find/);
});
