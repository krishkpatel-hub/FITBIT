import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStrengthProgression, buildWeeklyWorkoutVolume } from '../src/services/analyticsService.js';
import { pickPRFields } from '../src/services/prService.js';
import { pickProgressFields } from '../src/services/progressService.js';
import { buildProgramWeekSnapshot } from '../src/services/programService.js';
import { pickWorkoutFields } from '../src/services/workoutService.js';

test('shared analytics service preserves weekly volume shape', () => {
  const weeklyVolume = buildWeeklyWorkoutVolume([
    { date: '2026-07-13T12:00:00.000Z', totalVolume: 1000 },
    { date: '2026-07-15T12:00:00.000Z', totalVolume: 500 },
    { date: '2026-07-22T12:00:00.000Z', totalVolume: 750 },
  ]);

  assert.deepEqual(weeklyVolume, [
    { week: '2026-07-13', totalVolume: 1500 },
    { week: '2026-07-20', totalVolume: 750 },
  ]);
});

test('shared analytics service preserves strength progression shape', () => {
  const progression = buildStrengthProgression([
    {
      liftName: 'bench',
      history: [
        {
          week: 1,
          oneRepMax: 225,
          trainingMax: 205,
          increaseAmount: 0,
          plusSetReps: 0,
          date: '2026-07-14T00:00:00.000Z',
        },
      ],
    },
  ]);

  assert.deepEqual(progression, [
    {
      liftName: 'bench',
      liftLabel: 'Bench Press',
      week: 1,
      oneRepMax: 225,
      trainingMax: 205,
      increaseAmount: 0,
      plusSetReps: 0,
      date: '2026-07-14T00:00:00.000Z',
    },
  ]);
});

test('shared service field pickers prevent mass assignment', () => {
  assert.deepEqual(pickWorkoutFields({ title: 'Bench', user: 'other-user', status: 'completed' }), {
    title: 'Bench',
    status: 'completed',
  });
  assert.deepEqual(pickProgressFields({ bodyWeight: 180, user: 'other-user', admin: true }), {
    bodyWeight: 180,
  });
  assert.deepEqual(pickPRFields({ exerciseName: 'Bench Press', weight: 225, user: 'other-user' }), {
    exerciseName: 'Bench Press',
    weight: 225,
  });
});

test('program snapshot uses the existing supported lift structure', () => {
  const snapshot = buildProgramWeekSnapshot([
    { liftName: 'squat', oneRepMax: 275, trainingMax: 250 },
    { liftName: 'bench', oneRepMax: 225, trainingMax: 205 },
    { liftName: 'deadlift', oneRepMax: 315, trainingMax: 285 },
    { liftName: 'overhead_press', oneRepMax: 135, trainingMax: 120 },
  ]);

  assert.deepEqual(snapshot, {
    squat: { oneRepMax: 275, trainingMax: 250 },
    bench: { oneRepMax: 225, trainingMax: 205 },
    deadlift: { oneRepMax: 315, trainingMax: 285 },
    overhead_press: { oneRepMax: 135, trainingMax: 120 },
  });
});
