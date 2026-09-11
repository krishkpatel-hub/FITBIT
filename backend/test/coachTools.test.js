import test from 'node:test';
import assert from 'node:assert/strict';
import { coachToolDefinitions, createCoachToolExecutor, normalizeLiftName } from '../src/services/coachTools.js';

const userA = 'user-a';
const userB = 'user-b';

const data = {
  trainingMaxes: [
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
  ],
  workouts: [
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
  ],
  prs: [
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
  ],
  progressLogs: [
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
  ],
  programs: [
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
  ],
};

const byUser = (items, userId) => items.filter((item) => item.user === userId);

const createMockDataServices = () => ({
  getTrainingMaxes: async (userId) => byUser(data.trainingMaxes, userId),
  getTrainingMaxByLift: async (userId, liftName) =>
    byUser(data.trainingMaxes, userId).find((item) => item.liftName === liftName) || null,
  getRecentCompletedWorkouts: async (userId, limit) =>
    byUser(data.workouts, userId)
      .filter((item) => item.status === 'completed')
      .slice(0, limit),
  getCompletedLiftWorkouts: async (userId, liftName, limit) =>
    byUser(data.workouts, userId)
      .filter((item) => item.status === 'completed' && item.liftName === liftName)
      .slice(0, limit),
  getRecentPRRecords: async (userId, limit) => byUser(data.prs, userId).slice(0, limit),
  getCurrentProgram: async (userId) => byUser(data.programs, userId).find((item) => item.status === 'current') || null,
  getProgressSummary: async (userId) => {
    const workouts = byUser(data.workouts, userId);
    const prs = byUser(data.prs, userId);
    const progressLogs = byUser(data.progressLogs, userId);

    return {
      completedWorkouts: workouts.filter((item) => item.status === 'completed').length,
      plannedWorkouts: workouts.filter((item) => item.status === 'planned').length,
      totalCompletedVolume: workouts.reduce((sum, item) => sum + Number(item.totalVolume || 0), 0),
      latestProgress: progressLogs[0] || null,
      latestPR: prs[0] || null,
      insights: [],
    };
  },
});

test('normalizeLiftName accepts app lift aliases', () => {
  assert.equal(normalizeLiftName('Bench Press').key, 'bench');
  assert.equal(normalizeLiftName('OHP').key, 'overhead_press');
  assert.equal(normalizeLiftName('Back Squat').key, 'squat');
  assert.equal(normalizeLiftName('curl'), null);
});

test('Coach strict tool schemas make nullable optional arguments explicit', () => {
  const recentWorkoutsTool = coachToolDefinitions.find((tool) => tool.name === 'get_recent_workouts');
  const liftHistoryTool = coachToolDefinitions.find((tool) => tool.name === 'get_lift_history');

  assert.deepEqual(recentWorkoutsTool.parameters.required, ['limit', 'exercise']);
  assert.deepEqual(recentWorkoutsTool.parameters.properties.limit.type, ['integer', 'null']);
  assert.deepEqual(recentWorkoutsTool.parameters.properties.exercise.type, ['string', 'null']);
  assert.deepEqual(liftHistoryTool.parameters.properties.weeks.type, ['integer', 'null']);
});

test('Coach tools default nullable optional arguments safely', async () => {
  const executeTool = createCoachToolExecutor(createMockDataServices());

  const recent = await executeTool({
    name: 'get_recent_workouts',
    args: { limit: null, exercise: null },
    authenticatedUserId: userA,
  });
  const history = await executeTool({
    name: 'get_lift_history',
    args: { lift: 'bench', weeks: null },
    authenticatedUserId: userA,
  });

  assert.equal(recent.result.workouts.length, 1);
  assert.equal(history.result.weeks, 8);
});

test('Coach tools reject unauthenticated requests, unknown tools, malformed args, and invalid lift parameters', async () => {
  const executeTool = createCoachToolExecutor(createMockDataServices());

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
  const executeTool = createCoachToolExecutor(createMockDataServices());
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
    getTrainingMaxes: async () => [],
    getTrainingMaxByLift: async () => null,
    getRecentCompletedWorkouts: async () => [],
    getCompletedLiftWorkouts: async () => [],
    getRecentPRRecords: async () => [],
    getCurrentProgram: async () => null,
    getProgressSummary: async () => ({
      completedWorkouts: 0,
      plannedWorkouts: 0,
      totalCompletedVolume: 0,
      latestProgress: null,
      latestPR: null,
      insights: [],
    }),
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
