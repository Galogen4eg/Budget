import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/DuplicatesModal.tsx',import.meta.url),'utf8');

test('candidate review does not invent an original record',()=>{
 assert.doesNotMatch(source,/>Оригинал</);
 assert.match(source,/Запись для сравнения/);
});
test('deletion requires an independent confirmation after manual selection',()=>{
 assert.match(source,/const \[isConfirmingDelete, setIsConfirmingDelete\]/);
 assert.match(source,/if \(!isConfirmingDelete\)/);
 assert.match(source,/Подтвердить удаление/);
 assert.match(source,/selectedToDelete\.size/);
});
test('candidate selection is keyboard accessible and never preselected',()=>{
 assert.match(source,/useState<Set<string>>\(new Set\(\)\)/);
 assert.match(source,/aria-pressed=\{isSelected\}/);
 assert.match(source,/aria-label=\{\x60Выбрать для удаления/);
});
test('ignore action reports failure and waits for saved settings',()=>{
 assert.match(source,/await onIgnore\(pairs\)/);
 assert.match(source,/toast\.error\(/);
 assert.match(source,/isIgnoring/);
});
test('mobile review provides visible focus, non-clipped descriptions and reachable buttons',()=>{
 assert.match(source,/min-h-\[44px\]/);
 assert.match(source,/break-words/);
 assert.match(source,/focus-visible:ring-2/);
 assert.match(source,/safe-area-inset-bottom/);
});

test('iteration 67: ignoring a group hides it after persistence confirms',()=>{
 assert.match(source,/await onIgnore\(pairs\)/);
 assert.match(source,/setLocallyIgnoredPairs\(previous => new Set\(\[\.\.\.previous, \.\.\.pairs\]\)\)/);
 assert.match(source,/!locallyIgnoredPairs\.has\(pairKey\)/);
});
test('iteration 67: mistaken duplicate selection can be cleared without deleting anything',()=>{
 assert.match(source,/Снять выбор/);
 assert.match(source,/setSelectedToDelete\(new Set\(\)\)/);
 assert.match(source,/if \(!isConfirmingDelete\)/);
});
