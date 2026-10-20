import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canApplyProgression,
  getActiveProgramWeekNumber,
  getCompletedSetCount,
  getNextWorkoutIndex,
  getProgramStage,
  getWeekViewStatus,
  isProgramWeekComplete,
} from '../../frontend/src/utils/programWorkspace.ts';

const maxes = ['squat', 'bench', 'deadlift', 'overhead_press'].map((liftName) => ({ liftName, oneRepMax: 200, currentWeek: 1 }));
const workouts = ['bench', 'deadlift', 'squat', 'overhead_press'].map((liftName, index) => ({
  _id: `workout-${index}`,
  liftName,
  status: index === 0 ? 'completed' : 'planned',
}));

test('setup and saved-max states do not require an empty workout workspace', () => {
  assert.equal(getProgramStage([], null, 1), 'setup');
  assert.equal(getProgramStage(maxes, null, 1), 'ready');
  assert.equal(getProgramStage(maxes, null, 2), 'maxes-needed');
  assert.equal(getProgramStage(maxes, { week: 1, workouts }, 1), 'workout');
});

test('the first unfinished workout opens, while an explicit day survives refresh', () => {
  assert.equal(getNextWorkoutIndex(workouts), 1);
  assert.equal(getNextWorkoutIndex(workouts, 'workout-3'), 3);
  assert.equal(getNextWorkoutIndex([...workouts], 'workout-3'), 3);
  assert.equal(getNextWorkoutIndex(workouts, 'removed-workout'), 1);
});

test('selected, current, completed, and locked week states stay distinct', () => {
  const weeks = [{ week: 1, workouts: workouts.map((workout) => ({ ...workout, status: 'completed' })) }, { week: 2, workouts }];
  assert.equal(isProgramWeekComplete(weeks[0]), true);
  assert.equal(getActiveProgramWeekNumber(weeks), 2);
  assert.equal(getWeekViewStatus(1, 2, weeks), 'completed');
  assert.equal(getWeekViewStatus(2, 2, weeks), 'current');
  assert.equal(getWeekViewStatus(3, 2, weeks), 'locked');
  assert.equal(getWeekViewStatus(4, 4, weeks), 'current');
});

test('set progress counts only persisted completion flags', () => {
  assert.deepEqual(getCompletedSetCount({ exercises: [{ sets: [{ completed: true }, { completed: false, weight: 225 }] }] }), { completed: 1, total: 2 });
  assert.deepEqual(getCompletedSetCount(), { completed: 0, total: 0 });
});

test('the final completed workout can record its plus set until fresh maxes are saved', () => {
  const currentWeek = { week: 1, activeWeek: 2, generated: true, hasPlusSet: true };
  assert.equal(canApplyProgression({ ...currentWeek, trainingMaxWeek: 1 }), true);
  assert.equal(canApplyProgression({ ...currentWeek, trainingMaxWeek: 2 }), false);
  assert.equal(canApplyProgression({ ...currentWeek, week: 3, trainingMaxWeek: 3 }), false);
  assert.equal(canApplyProgression({ ...currentWeek, hasPlusSet: false, trainingMaxWeek: 1 }), false);
});
