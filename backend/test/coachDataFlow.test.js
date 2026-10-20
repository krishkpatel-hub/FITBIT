import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { executeCoachTool } from '../src/services/coachTools.js';

test('real Coach services isolate all reads and serialize summaries including body metrics', async (t) => {
  const fixtures = {
    Workout: [{ user: 'A', title: 'Bench', status: 'completed', date: new Date(), liftName: 'bench', totalVolume: 1000, exercises: [] }, { user: 'B', title: 'PRIVATE B', status: 'completed', date: new Date(), totalVolume: 99999 }],
    TrainingMax: [{ user: 'A', liftName: 'bench', trainingMax: 205, history: [] }, { user: 'B', liftName: 'bench', trainingMax: 99999, history: [] }],
    PRRecord: [{ user: 'A', exerciseName: 'Bench Press', date: new Date(), weight: 225 }, { user: 'B', exerciseName: 'PRIVATE B', weight: 99999 }],
    Progress: [{ user: 'A', bodyWeight: 175, date: new Date(), measurements: { waist: 32 } }, { user: 'B', bodyWeight: 99999 }],
    ProgramWeek: [{ user: 'A', status: 'current', weekNumber: 1, workouts: [] }, { user: 'B', status: 'current', weekNumber: 4, workouts: [{ title: 'PRIVATE B' }] }],
  };
  const queries = [];
  // Mock only the database boundary; run the actual dispatcher and shared services.
  t.mock.method(mongoose.Query.prototype, 'exec', async function () {
    const filter = this.getFilter();
    queries.push(filter);
    assert.equal(filter.user, 'A');
    const rows = (fixtures[this.model.modelName] || []).filter((row) => Object.entries(filter).every(([key, value]) => row[key] === value));
    return this.op === 'findOne' ? rows[0] || null : rows;
  });
  for (const [name, args] of [
    ['get_training_maxes', {}], ['get_recent_workouts', { limit: null, exercise: null }],
    ['get_lift_history', { lift: 'bench', weeks: null }], ['get_current_program', {}], ['get_progress_summary', {}],
  ]) {
    const output = await executeCoachTool({ name, args, authenticatedUserId: 'A' });
    const json = JSON.stringify(output.result);
    assert.doesNotMatch(json, /PRIVATE B|99999|"user"|password|token/);
    if (name === 'get_progress_summary') {
      assert.equal(output.result.latestProgress.bodyWeight, 175);
      assert.equal(output.result.totalCompletedVolume, 1000);
    }
  }
  assert.ok(queries.length >= 10);
});

test('real progress summary service accepts an empty database history', async (t) => {
  t.mock.method(mongoose.Query.prototype, 'exec', async () => []);
  const { result } = await executeCoachTool({ name: 'get_progress_summary', args: {}, authenticatedUserId: 'new-user' });
  assert.equal(result.completedWorkouts, 0);
  assert.equal(result.latestProgress, null);
  assert.equal(result.latestPR, null);
});
