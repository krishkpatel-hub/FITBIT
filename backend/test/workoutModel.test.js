import test from 'node:test';
import assert from 'node:assert/strict';
import Workout from '../src/models/Workout.js';

test('workout volume counts completed sets only', () => {
  const workout = new Workout({
    user: '507f1f77bcf86cd799439011',
    title: 'Bench Day',
    exercises: [{
      exerciseName: 'Bench Press',
      sets: [
        { setNumber: 1, reps: 5, weight: 100, completed: true },
        { setNumber: 2, reps: 5, weight: 110, completed: false },
        { setNumber: 3, reps: 3, weight: 120, completed: true },
      ],
    }],
  });

  assert.equal(workout.calculateTotalVolume(), 860);
});

test('workout model requires an owner and validates status', () => {
  const workout = new Workout({ title: 'Unowned Day', status: 'unknown' });
  const validationError = workout.validateSync();

  assert.ok(validationError.errors.user);
  assert.ok(validationError.errors.status);
});
