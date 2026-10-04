import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserFacingError } from '../../frontend/src/utils/apiError.ts';

test('authenticated pages keep useful validation messages but hide server internals', () => {
  assert.equal(
    getUserFacingError({ response: { status: 400, data: { message: 'Enter a valid date.' } } }, 'Try again.'),
    'Enter a valid date.',
  );
  assert.equal(
    getUserFacingError({ response: { status: 500, data: { message: 'CastError at Workout.date' } } }, 'Unable to load.'),
    'Unable to load.',
  );
  assert.equal(
    getUserFacingError({ response: { status: 400, data: { message: 'MongoDB CastError' } } }, 'Unable to save.'),
    'Unable to save.',
  );
  assert.equal(getUserFacingError({ response: { status: 429 } }, 'Try again.'), 'Too many requests. Please wait a moment and try again.');
  assert.equal(getUserFacingError({ code: 'ETIMEDOUT' }, 'Try again.'), 'The request took too long. Please try again.');
});
