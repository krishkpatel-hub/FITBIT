import dotenv from 'dotenv';
import { createCoachAgent, createStreamingCoachAgent } from '../src/services/coachAgent.js';
import { createCoachToolExecutor } from '../src/services/coachTools.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });
const configured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key');
console.info({ node: process.version, apiKeyConfigured: configured, model: process.env.OPENAI_MODEL || 'gpt-4.1-mini' });
if (!configured) {
  console.error('Live provider verification blocked: configure OPENAI_API_KEY in the backend environment. No request was sent.');
  process.exit(1);
}

// Explicit opt-in script: real provider, synthetic data, no database or app users.
const date = new Date().toISOString();
const max = { liftName: 'bench', oneRepMax: 225, trainingMax: 205, currentWeek: 1, history: [
  { trainingMax: 195, date: new Date(Date.now() - 14 * 86400000).toISOString() }, { trainingMax: 205, date },
] };
const workout = { title: 'Bench Press', date, status: 'completed', liftName: 'bench', totalVolume: 3375,
  exercises: [{ exerciseName: 'Bench Press', sets: [{ setNumber: 1, weight: 175, reps: 8, completed: true, isPlusSet: true }] }],
};
const executeTool = createCoachToolExecutor({
  getTrainingMaxes: async () => [max],
  getTrainingMaxByLift: async () => max,
  getCompletedLiftWorkouts: async () => [workout],
  getRecentCompletedWorkouts: async () => [workout],
  getRecentPRRecords: async () => [],
  getCurrentProgram: async () => ({ weekNumber: 1, status: 'current', workouts: [{ ...workout, status: 'planned' }] }),
  getProgressSummary: async () => ({ completedWorkouts: 1, totalCompletedVolume: 3375, latestPR: null, latestProgress: null, insights: [] }),
});
const scenarios = [
  ['What should I train next?', 'get_current_program'],
  ['How has my bench changed recently?', 'get_lift_history'],
  ['Summarize my recent training.', 'get_recent_workouts'],
  ['What is a plus set?', null],
];
let failures = 0;
for (const streaming of [false, true]) {
  const agent = streaming ? createStreamingCoachAgent({ executeTool }) : createCoachAgent({ executeTool });
  for (const [message, expectedTool] of scenarios) {
    try {
      const events = [];
      const result = await agent({ authenticatedUserId: 'synthetic-provider-check', message,
        signal: AbortSignal.timeout(65000), onEvent: async (event) => events.push(event.type) });
      const passed = Boolean(result.answer.trim()) &&
        (expectedTool ? result.sources.includes(expectedTool) : result.sources.length === 0) &&
        (!streaming || events.at(-1) === 'complete');
      if (!passed) failures += 1;
      console.info({ streaming, message, passed, sources: result.sources, answer: result.answer });
    } catch (error) {
      failures += 1;
      console.error({ streaming, message, passed: false, status: error.statusCode || 502 });
    }
  }
}
process.exitCode = failures ? 1 : 0;
