import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isInstalledApp} from '../utils/launchMode.ts';
const browser=(modes=[],apple=false)=>({navigator:{standalone:apple},matchMedia:q=>({matches:modes.includes(q)})});
test('local mode is available in installed launch contexts only',()=>{
 assert.equal(isInstalledApp(false,browser()),false);
 assert.equal(isInstalledApp(false,browser(['(display-mode: browser)'])),false);
 assert.equal(isInstalledApp(false,browser(['(display-mode: fullscreen)'])),false);
 assert.equal(isInstalledApp(false,browser(['(display-mode: standalone)'])),true);
 assert.equal(isInstalledApp(false,browser(['(display-mode: window-controls-overlay)'])),true);
 assert.equal(isInstalledApp(false,browser([],true)),true);
 assert.equal(isInstalledApp(true,browser()),true);
});
test('website slow auth offers retry, not local data; both boot stages use same compact logo',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const app=read('App.tsx'),splash=read('components/TerraSplash.tsx'),login=read('components/LoginScreen.tsx'),html=read('index.html'),css=read('public/terra-splash.css');
 assert.match(app,/onDemo=\{installedApp\?enterDemoMode:undefined\}/);
 assert.match(app,/<LoginScreen installedApp=\{installedApp\}/);
 assert.match(login,/\{installedApp&&<footer/);
 assert.match(splash,/onDemo\?<button[^>]+onClick=\{onDemo\}/);
 assert.match(splash,/window.location.reload\(\)/);
 for(const source of [splash,html])assert.match(source,/src="\/icons\/terra-icon.svg"/);
 assert.doesNotMatch(css,/terra-desktop\.webp/);
 assert.match(html,/max-width: 767px.*orientation: portrait/);
});
