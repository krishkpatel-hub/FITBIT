import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoachToolExecutor, normalizeLiftName } from '../src/services/coachTools.js';

const userA = 'user-a';
const userB = 'user-b';

const createQuery = (items) => {
  let rows = Array.isArray(items) ? [...items] : items;

  return {
    sort(sortSpec = {}) {
      if (Array.isArray(rows)) {
        const [[key, direction]] = Object.entries(sortSpec);
        if (key) {
          rows = [...rows].sort((a, b) => {
            const left = new Date(a[key] || a.updatedAt || a.createdAt).getTime() || a[key];
            const right = new Date(b[key] || b.updatedAt || b.createdAt).getTime() || b[key];
            return direction < 0 ? right - left : left - right;
          });
        }
      }
      return this;
    },
    limit(limitValue) {
      if (Array.isArray(rows)) {
        rows = rows.slice(0, limitValue);
      }
      return this;
    },
    populate() {
      return this;
    },
    async lean() {
      return rows;
    },
  };
};

const matchesFilter = (item, filter) =>
  Object.entries(filter).every(([key, value]) => {
    if (key === '_id') return String(item._id) === String(value);
    return item[key] === value;
  });

const createModel = (items) => ({
  find(filter) {
    return createQuery(items.filter((item) => matchesFilter(item, filter)));
  },
  findOne(filter) {
    return createQuery(items.find((item) => matchesFilter(item, filter)) || null);
  },
});

const createMockModels = () => ({
  TrainingMax: createModel([
    {
      user: userA,
      liftName: 'bench',
      oneRepMax: 225,
      trainingMax: 205,
      currentWeek: 1,
      lastUpdated: '2026-07-14T00:00:00.000Z',
      history: [{ week: 1, oneRepMax: 225, trainingMax: 205, date: '2026-07-14T00:00:00.000Z' }],
    },
    {
      user: userB,
      liftName: 'bench',
      oneRepMax: 405,
      trainingMax: 365,
      currentWeek: 1,
      history: [],
    },
  ]),
  Workout: createModel([
    {
      user: userA,
      title: 'Week 1 - Bench Press Day',
      date: new Date().toISOString(),
      status: 'completed',
      liftName: 'bench',
      totalVolume: 1500,
      exercises: [
        {
          exerciseName: 'Bench Press',
          muscleGroup: 'chest',
          sets: [{ setNumber: 1, reps: 5, weight: 135, targetReps: 5, completed: true, isPlusSet: false }],
        },
      ],
    },
    {
      user: userB,
      title: 'Secret User B Workout',
      date: new Date().toISOString(),
      status: 'completed',
      liftName: 'bench',
      totalVolume: 9999,
      exercises: [{ exerciseName: 'Bench Press', sets: [] }],
    },
  ]),
  PRRecord: createModel([
    {
      user: userA,
      exerciseName: 'Bench Press',
      date: new Date().toISOString(),
      oneRepMax: 225,
      estimatedOneRepMax: 235,
      weight: 205,
      reps: 5,
    },
    {
      user: userB,
      exerciseName: 'Secret Bench',
      date: new Date().toISOString(),
      oneRepMax: 405,
      estimatedOneRepMax: 415,
      weight: 365,
      reps: 5,
    },
  ]),
  Progress: createModel([
    {
      user: userA,
      date: new Date().toISOString(),
      bodyWeight: 175,
      bodyFatPercentage: 12,
      measurements: {},
    },
    {
      user: userB,
      date: new Date().toISOString(),
      bodyWeight: 240,
      bodyFatPercentage: 8,
      measurements: {},
    },
  ]),
  ProgramWeek: createModel([
    {
      user: userA,
      week: 1,
      weekNumber: 1,
      status: 'current',
      daysCompleted: 1,
      maxesEntered: true,
      generatedAt: new Date().toISOString(),
      maxes: { bench: { oneRepMax: 225, trainingMax: 205 } },
      workouts: [
        {
          title: 'Week 1 - Bench Press Day',
          date: new Date().toISOString(),
          status: 'completed',
          liftName: 'bench',
          totalVolume: 1500,
          exercises: [],
        },
      ],
    },
    {
      user: userB,
      week: 1,
      weekNumber: 1,
      status: 'current',
      daysCompleted: 4,
      maxesEntered: true,
      maxes: { bench: { oneRepMax: 405, trainingMax: 365 } },
      workouts: [{ title: 'Secret User B Program', status: 'completed', exercises: [] }],
    },
  ]),
});

test('normalizeLiftName accepts app lift aliases', () => {
  assert.equal(normalizeLiftName('Bench Press').key, 'bench');
  assert.equal(normalizeLiftName('OHP').key, 'overhead_press');
  assert.equal(normalizeLiftName('Back Squat').key, 'squat');
  assert.equal(normalizeLiftName('curl'), null);
});

test('Coach tools reject unauthenticated requests, unknown tools, malformed args, and invalid lift parameters', async () => {
  const executeTool = createCoachToolExecutor(createMockModels());

  await assert.rejects(
    () => executeTool({ name: 'get_training_maxes', args: {}, authenticatedUserId: '' }),
    /authentication is required/i,
  );
  await assert.rejects(
    () => executeTool({ name: 'drop_database', args: {}, authenticatedUserId: userA }),
    /unknown coach tool/i,
  );
  await assert.rejects(
    () => executeTool({ name: 'get_lift_history', args: '{bad-json', authenticatedUserId: userA }),
    /malformed arguments/i,
  );
  await assert.rejects(
    () => executeTool({ name: 'get_lift_history', args: { lift: 'curl', weeks: 4 }, authenticatedUserId: userA }),
    /lift must be/i,
  );
  await assert.rejects(
    () => executeTool({ name: 'get_lift_history', args: { lift: 'bench', weeks: 25 }, authenticatedUserId: userA }),
    /weeks must be/i,
  );
  await assert.rejects(
    () =>
      executeTool({
        name: 'get_training_maxes',
        args: { userId: userB },
        authenticatedUserId: userA,
      }),
    /unsupported argument/i,
  );
});

test('Coach tools only return data for the authenticated user', async () => {
  const executeTool = createCoachToolExecutor(createMockModels());
  const toolCalls = [
    { name: 'get_training_maxes', args: {} },
    { name: 'get_recent_workouts', args: { limit: 5 } },
    { name: 'get_lift_history', args: { lift: 'bench', weeks: 4 } },
    { name: 'get_current_program', args: {} },
    { name: 'get_progress_summary', args: {} },
  ];

  for (const toolCall of toolCalls) {
    const output = await executeTool({ ...toolCall, authenticatedUserId: userA });
    const serialized = JSON.stringify(output.result);

    assert.match(serialized, /Bench|bench|175|205|225/);
    assert.doesNotMatch(serialized, /user-b|Secret|405|365|9999|240/);
  }
});

test('Coach tools return empty results safely when history is missing', async () => {
  const executeTool = createCoachToolExecutor({
    TrainingMax: createModel([]),
    Workout: createModel([]),
    PRRecord: createModel([]),
    Progress: createModel([]),
    ProgramWeek: createModel([]),
  });

  const output = await executeTool({
    name: 'get_lift_history',
    args: { lift: 'bench', weeks: 4 },
    authenticatedUserId: userA,
  });

  assert.equal(output.result.currentTrainingMax, null);
  assert.deepEqual(output.result.sessions, []);
  assert.deepEqual(output.result.prHistory, []);
});
