import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFamilySwitch } from '../utils/familySwitch.ts';

test('only an explicit target may be joined', () => {
  assert.equal(validateFamilySwitch('source', ' target ', false), 'target');
  assert.throws(() => validateFamilySwitch('source', '', false), /ID/);
  assert.throws(() => validateFamilySwitch('source', 'source', false), /уже/);
});

test('never copy profiles and transactions to an arbitrary family before joining', () => {
  assert.throws(
    () => validateFamilySwitch('source', 'some-other-family', true),
    /перенос/i
  );
});
