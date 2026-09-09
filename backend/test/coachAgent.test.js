import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoachAgent } from '../src/services/coachAgent.js';

const createFakeClient = (responses) => {
  const calls = [];

  return {
    calls,
    responses: {
      create: async (payload) => {
        calls.push(payload);
        const next = responses.shift();

        if (next instanceof Error) {
          throw next;
        }

        return next;
      },
    },
  };
};

const functionCall = (name, args = {}) => ({
  id: `fc_${name}`,
  type: 'function_call',
  call_id: `call_${name}`,
  name,
  arguments: JSON.stringify(args),
});

test('Coach agent can answer general training information without a tool call', async () => {
  const client = createFakeClient([
    {
      id: 'resp_1',
      output_text: 'A plus set is the final prescribed set where you perform extra clean reps when available.',
      output: [],
    },
  ]);
  const executedTools = [];
  const agent = createCoachAgent({
    client,
    executeTool: async ({ name }) => {
      executedTools.push(name);
      return { name, result: {} };
    },
  });

  const response = await agent({ authenticatedUserId: 'user-a', message: 'What is a plus set?' });

  assert.match(response.answer, /plus set/i);
  assert.deepEqual(response.sources, []);
  assert.deepEqual(executedTools, []);
});

test('Coach agent uses get_training_maxes for current training max questions', async () => {
  const client = createFakeClient([
    {
      id: 'resp_1',
      output: [functionCall('get_training_maxes')],
    },
    {
      id: 'resp_2',
      output_text: 'Your bench training max is 205 lb.',
      output: [],
    },
  ]);
  const executedTools = [];
  const agent = createCoachAgent({
    client,
    executeTool: async ({ name }) => {
      executedTools.push(name);
      return {
        name,
        result: { trainingMaxes: [{ liftName: 'bench', trainingMax: 205, oneRepMax: 225 }] },
      };
    },
  });

  const response = await agent({ authenticatedUserId: 'user-a', message: 'What is my bench training max?' });

  assert.equal(response.answer, 'Your bench training max is 205 lb.');
  assert.deepEqual(response.sources, ['get_training_maxes']);
  assert.deepEqual(executedTools, ['get_training_maxes']);
});

test('Coach agent exposes lift history, current program, and recent workout tools through the loop', async () => {
  const scenarios = [
    ['How has my bench changed recently?', 'get_lift_history', { lift: 'bench', weeks: 4 }],
    ['What should I train next?', 'get_current_program', {}],
    ['Summarize my recent training.', 'get_recent_workouts', { limit: 5 }],
  ];

  for (const [message, toolName, args] of scenarios) {
    const client = createFakeClient([
      {
        id: `resp_${toolName}_1`,
        output: [functionCall(toolName, args)],
      },
      {
        id: `resp_${toolName}_2`,
        output_text: `Answered with ${toolName}.`,
        output: [],
      },
    ]);
    const executedTools = [];
    const agent = createCoachAgent({
      client,
      executeTool: async ({ name }) => {
        executedTools.push(name);
        return { name, result: { ok: true } };
      },
    });

    const response = await agent({ authenticatedUserId: 'user-a', message });

    assert.equal(response.answer, `Answered with ${toolName}.`);
    assert.deepEqual(response.sources, [toolName]);
    assert.deepEqual(executedTools, [toolName]);
  }
});

test('Coach agent rejects excessive tool rounds', async () => {
  const responses = Array.from({ length: 6 }, (_, index) => ({
    id: `resp_${index}`,
    output: [functionCall('get_training_maxes')],
  }));
  const client = createFakeClient(responses);
  const agent = createCoachAgent({
    client,
    executeTool: async ({ name }) => ({ name, result: { ok: true } }),
  });

  await assert.rejects(
    () => agent({ authenticatedUserId: 'user-a', message: 'Keep checking my maxes.' }),
    /too many tool calls/i,
  );
});

test('Coach agent returns a controlled error when OpenAI fails', async () => {
  const client = createFakeClient([new Error('network unavailable')]);
  const agent = createCoachAgent({
    client,
    executeTool: async ({ name }) => ({ name, result: {} }),
  });

  await assert.rejects(
    () => agent({ authenticatedUserId: 'user-a', message: 'Summarize training.' }),
    /coach is unavailable/i,
  );
});
