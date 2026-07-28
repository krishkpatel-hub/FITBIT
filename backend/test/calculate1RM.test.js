import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate1RM } from '../src/utils/calculate1RM.js';

test('calculate1RM returns 0 when weight or reps are missing', () => {
  assert.equal(calculate1RM(0, 5), 0);
  assert.equal(calculate1RM(225, 0), 0);
});

test('calculate1RM estimates one-rep max with the Epley formula', () => {
  assert.equal(calculate1RM(225, 5), 263);
  assert.equal(calculate1RM(135, 10), 180);
});
