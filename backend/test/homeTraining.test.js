import assert from 'node:assert/strict';
import test from 'node:test';
import { formatHomeDate, getHomeTrainingState, getHomeWorkoutSummary } from '../../frontend/src/utils/homeTraining.ts';

const lifts = ['squat', 'bench', 'deadlift', 'overhead_press'];
const maxes = (week = 1) => lifts.map((liftName) => ({ liftName, oneRepMax: 200, currentWeek: week }));
const workout = (id, status = 'planned') => ({
  _id: id, title: 'Week 2 - Deadlift Day', liftName: 'deadlift', status, date: '2026-09-29T00:00:00.000Z',
  exercises: [{ exerciseName: 'Deadlift', sets: [] }, { exerciseName: 'Row', sets: [] }],
});
const week = (number, status = 'current', workouts = [workout('next')]) => ({ week: number, weekNumber: number, status, workouts });

test('Home onboarding counts only unique configured lifts with valid positive maxes', () => {
  assert.equal(getHomeTrainingState([], []).configuredLiftCount, 0);
  const entries = [
    ...maxes().slice(0, 2), maxes()[0],
    { liftName: 'deadlift', oneRepMax: 0 },
    { liftName: 'overhead_press', oneRepMax: Infinity },
    { liftName: 'curl', oneRepMax: 100 },
  ];
  const state = getHomeTrainingState(entries, []);
  assert.equal(state.configuredLiftCount, 2);
  assert.equal(state.strengthReady, false);
  assert.equal(state.currentWeek, undefined);
});

test('four configured lifts without a generated week keep the user at Generate Program', () => {
  const state = getHomeTrainingState(maxes(), [week(1, 'current', [])]);
  assert.equal(state.configuredLiftCount, 4);
  assert.equal(state.strengthReady, true);
  assert.equal(state.currentWeek, undefined);
  assert.equal(state.nextWorkout, undefined);
});

test('Home selects the next planned session from the current week, skipping completed and skipped sessions', () => {
  const next = workout('deadlift');
  const state = getHomeTrainingState(maxes(2), [
    week(3, 'locked'), week(2, 'current', [workout('bench', 'completed'), workout('skip', 'skipped'), next]), week(1, 'completed'),
  ]);
  assert.equal(state.weekNumber, 2);
  assert.equal(state.nextWorkout, next);
  assert.equal(state.weekComplete, false);
  assert.deepEqual(getHomeWorkoutSummary(next), { title: 'Deadlift Day', mainLift: 'Deadlift', exerciseCount: 2 });
});

test('a completed week prompts fresh maxes rather than returning a future planned session', () => {
  const state = getHomeTrainingState(maxes(), [week(1, 'completed'), week(2, 'locked')]);
  assert.equal(state.weekNumber, 1);
  assert.equal(state.nextWorkout, undefined);
  assert.equal(state.weekComplete, true);
  assert.equal(state.nextWeekNumber, 2);
  assert.equal(state.nextWeekMaxesReady, false);
});

test('saved next-week maxes do not pretend that a new week has already been generated', () => {
  const state = getHomeTrainingState(maxes(2), [week(1, 'completed'), week(2, 'current', [])]);
  assert.equal(state.weekNumber, 1);
  assert.equal(state.nextWeekNumber, 2);
  assert.equal(state.nextWeekMaxesReady, true);
  assert.equal(state.nextWorkout, undefined);
});

test('completed final block does not invent Week 5 and skipped sessions do not complete a week', () => {
  const completed = getHomeTrainingState(maxes(4), [week(4, 'completed')]);
  assert.equal(completed.weekComplete, true);
  assert.equal(completed.nextWeekNumber, null);
  const skipped = getHomeTrainingState(maxes(), [week(1, 'current', [workout('skipped', 'skipped')])]);
  assert.equal(skipped.nextWorkout, undefined);
  assert.equal(skipped.weekComplete, false);
});

test('Home derives display-only metadata without changing workout or program data', () => {
  const weeks = [week(2), week(1, 'completed')];
  const before = structuredClone(weeks);
  const trainingMaxes = maxes(2);
  getHomeTrainingState(trainingMaxes, weeks);
  getHomeWorkoutSummary(weeks[0].workouts[0]);
  assert.deepEqual(weeks, before);
  assert.deepEqual(trainingMaxes, maxes(2));
  assert.equal(getHomeTrainingState([], [week(1, 'locked')]).currentWeek, undefined);
  assert.equal(getHomeTrainingState([], [week(1, 'current', ['unpopulated-id'])]).nextWorkout, undefined);
});

test('workout summaries and dates remain readable with missing optional values', () => {
  assert.deepEqual(getHomeWorkoutSummary({ title: 'Upper Body', exercises: [{ exerciseName: 'Bench Press' }] }), {
    title: 'Upper Body', mainLift: 'Bench Press', exerciseCount: 1,
  });
  assert.deepEqual(getHomeWorkoutSummary({}), { title: 'Planned workout', mainLift: null, exerciseCount: 0 });
  assert.equal(formatHomeDate('2026-09-29T00:00:00.000Z'), 'Tue, Sep 29');
  assert.equal(formatHomeDate('invalid'), 'Date not recorded');
  assert.equal(formatHomeDate(), 'Date not recorded');
});
