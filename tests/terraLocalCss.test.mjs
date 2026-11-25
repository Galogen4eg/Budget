import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import config from '../tailwind.config.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('compiled Tailwind entry has no legacy runtime CDN and uses pinned v3 compiler',()=>{
 const html=read('index.html'),pkg=JSON.parse(read('package.json'));
 assert.doesNotMatch(html,/cdn\.tailwindcss\.com|tailwind\.config\s*=/);
 assert.match(html,/href="\/terra-tailwind\.css"/);
 assert.equal(pkg.devDependencies.tailwindcss,'3.4.17');
 assert.match(read('postcss.config.cjs'),/tailwindcss/);
 assert.doesNotMatch(read('terra-tailwind.css'),/position:\s*fixed|--sat|@import/);
});
test('local config matches previous live Terra palette and scans reusable class constants',()=>{
 const colors=config.theme.extend.colors;
 for(const [name,role] of Object.entries({background:'canvas',surface:'surface','surface-subtle':'soft','surface-border':'border',graphite:'ink','graphite-muted':'muted'}))assert.equal(colors[name],'var(--terra-'+role+')');
 assert.equal(config.darkMode,'class');
 for(const path of ['./index.html','./index.tsx','./constants.tsx','./App.tsx','./components/**/*.{js,ts,jsx,tsx}'])assert.ok(config.content.includes(path),path);
 assert.deepEqual(config.theme.extend.fontFamily.body,config.theme.extend.fontFamily.sans);
 assert.deepEqual(config.theme.extend.fontFamily.display,config.theme.extend.fontFamily.headline);
});
test('both authenticated browser suites disallow CDN requests',()=>{
 for(const p of ['tests/transactionCrudBrowser.mjs','tests/fullApplicationCrudBrowser.mjs'])assert.doesNotMatch(read(p),/https:\/\/cdn\.tailwindcss\.com/);
});
