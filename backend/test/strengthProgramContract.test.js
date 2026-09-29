import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTrainingMax,
  generateWeeklyProgram,
  getIncreaseAmount,
} from '../src/services/adaptiveFitnessService.js';

const maxes = [
  { liftName: 'squat', oneRepMax: 275, trainingMax: 250, currentWeek: 1 },
  { liftName: 'bench', oneRepMax: 225, trainingMax: 205, currentWeek: 1 },
  { liftName: 'deadlift', oneRepMax: 315, trainingMax: 285, currentWeek: 1 },
  { liftName: 'overhead_press', oneRepMax: 135, trainingMax: 120, currentWeek: 1 },
];

test('Program UX retains the existing 90 percent, nearest-five training max contract', () => {
  for (const lift of maxes) {
    assert.equal(calculateTrainingMax(lift.oneRepMax), lift.trainingMax);
  }
  assert.equal(calculateTrainingMax(240), 215);
  assert.equal(calculateTrainingMax(245), 220);
});

test('Program UX consumes four lift-specific days with unchanged prescriptions and deload', () => {
  const prescriptions = [
    { percentages: [65, 75, 85, 75, 70, 65], reps: [5, 5, 5, 5, 5, 5] },
    { percentages: [70, 80, 90, 80, 75, 70], reps: [3, 3, 3, 3, 3, 3] },
    { percentages: [75, 85, 95, 85, 80, 75], reps: [5, 3, 1, 3, 3, 3] },
    { percentages: [40, 50, 60], reps: [5, 5, 5] },
  ];
  const before = structuredClone(maxes);

  for (let week = 1; week <= 4; week += 1) {
    const workouts = generateWeeklyProgram(maxes, week);
    assert.deepEqual(workouts.map((workout) => workout.liftName), ['bench', 'deadlift', 'squat', 'overhead_press']);
    assert.deepEqual(workouts.map((workout) => workout.programDay), [1, 2, 3, 4]);

    for (const workout of workouts) {
      const lift = maxes.find((entry) => entry.liftName === workout.liftName);
      const sets = workout.exercises[0].sets;
      const expected = prescriptions[week - 1];
      assert.equal(workout.programWeek, week);
      assert.equal(workout.status, 'planned');
      assert.deepEqual(sets.map((set) => set.percent), expected.percentages);
      assert.deepEqual(sets.map((set) => set.targetReps), expected.reps);
      assert.deepEqual(sets.map((set) => set.weight), expected.percentages.map((percent) => Math.round(lift.trainingMax * percent / 500) * 5));
      assert.deepEqual(sets.filter((set) => set.isPlusSet).map((set) => set.setNumber), week === 4 ? [] : [3]);
      assert.ok(sets.every((set) => set.completed === false && set.reps === 0));
    }
  }

  assert.deepEqual(maxes, before);
  const bench = generateWeeklyProgram(maxes, 1)[0];
  assert.equal(bench.exercises[0].sets.reduce((volume, set) => volume + set.weight * set.targetReps, 0), 4500);
});

test('new week prescriptions use newly entered maxes without modifying previous workouts', () => {
  const previous = generateWeeklyProgram(maxes, 1);
  previous[0].exercises[0].sets[0].completed = true;
  const savedPrevious = structuredClone(previous);
  const nextMaxes = maxes.map((lift) => ({ ...lift, currentWeek: 2, ...(lift.liftName === 'bench' ? { oneRepMax: 245, trainingMax: 220 } : {}) }));
  const next = generateWeeklyProgram(nextMaxes, 2);

  assert.deepEqual(next[0].exercises[0].sets.map((set) => set.weight), [155, 175, 200, 175, 165, 155]);
  assert.ok(next.every((workout) => workout.exercises.every((exercise) => exercise.sets.every((set) => !set.completed))));
  assert.deepEqual(previous, savedPrevious);
});

test('progression controls retain existing plus-set increase thresholds', () => {
  for (const [reps, increase] of [[0, 0], [1, 0], [2, 5], [3, 5], [4, 0], [5, 10], [6, 15], [10, 15]]) {
    assert.equal(getIncreaseAmount(reps), increase);
  }
});
