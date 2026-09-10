import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoachAgent, createStreamingCoachAgent } from '../src/services/coachAgent.js';

const createFakeClient = (responses) => {
  const calls = [];

  return {
    calls,
    responses: {
      create: async (payload, options = {}) => {
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

const createFakeClientWithOptions = (responses) => {
  const calls = [];
  const options = [];

  return {
    calls,
    options,
    responses: {
      create: async (payload, requestOptions = {}) => {
        calls.push(payload);
        options.push(requestOptions);
        const next = responses.shift();

        if (next instanceof Error) {
          throw next;
        }

        return next;
      },
    },
  };
};

async function* streamFromEvents(events) {
  for (const event of events) {
    yield event;
  }
}

const completedStream = ({ id = 'resp_stream', output = [], text = '' } = {}) =>
  streamFromEvents([
    ...(text ? [{ type: 'response.output_text.delta', delta: text }] : []),
    {
      type: 'response.completed',
      response: {
        id,
        output,
      },
    },
  ]);

const failedStream = () =>
  streamFromEvents([
    {
      type: 'response.failed',
      response: {
        id: 'resp_failed',
      },
    },
  ]);

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
    ['How am I progressing overall?', 'get_progress_summary', {}],
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

test('Coach agent returns a controlled error when OpenAI configuration is missing', () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    assert.throws(
      () => createCoachAgent(),
      (error) =>
        error.statusCode === 503 &&
        error.expose === true &&
        /couldn't generate a coaching response/i.test(error.message),
    );

    assert.throws(
      () => createStreamingCoachAgent(),
      (error) =>
        error.statusCode === 503 &&
        error.expose === true &&
        /couldn't generate a coaching response/i.test(error.message),
    );
  } finally {
    if (previousApiKey) {
      process.env.OPENAI_API_KEY = previousApiKey;
    }
  }
});

test('Streaming Coach agent answers general questions without personal-data tools', async () => {
  const client = createFakeClientWithOptions([
    completedStream({
      text: 'A plus set is the final prescribed set where you perform extra clean reps when available.',
    }),
  ]);
  const events = [];
  const executedTools = [];
  const agent = createStreamingCoachAgent({
    client,
    executeTool: async ({ name }) => {
      executedTools.push(name);
      return { name, result: {} };
    },
  });

  const response = await agent({
    authenticatedUserId: 'user-a',
    message: 'What is a plus set?',
    onEvent: async (event) => events.push(event),
  });

  assert.match(response.answer, /plus set/i);
  assert.deepEqual(response.sources, []);
  assert.deepEqual(executedTools, []);
  assert.equal(client.calls[0].stream, true);
  assert.deepEqual(
    events.map((event) => event.type),
    ['status', 'text_delta', 'complete'],
  );
});

test('Streaming Coach agent uses the training max tool for current max questions', async () => {
  const client = createFakeClientWithOptions([
    completedStream({
      id: 'resp_tool_request',
      output: [functionCall('get_training_maxes')],
    }),
    completedStream({
      id: 'resp_tool_answer',
      text: 'Your bench training max is 205 lb.',
    }),
  ]);
  const events = [];
  const executedTools = [];
  const agent = createStreamingCoachAgent({
    client,
    executeTool: async ({ name, authenticatedUserId }) => {
      executedTools.push({ name, authenticatedUserId });
      return {
        name,
        result: { trainingMaxes: [{ liftName: 'bench', trainingMax: 205, oneRepMax: 225 }] },
      };
    },
  });

  const response = await agent({
    authenticatedUserId: 'user-a',
    message: 'What is my bench training max?',
    onEvent: async (event) => events.push(event),
  });

  assert.equal(response.answer, 'Your bench training max is 205 lb.');
  assert.deepEqual(response.sources, ['get_training_maxes']);
  assert.deepEqual(executedTools, [{ name: 'get_training_maxes', authenticatedUserId: 'user-a' }]);
  assert.equal(client.calls.length, 2);
  assert.equal(client.calls[1].previous_response_id, 'resp_tool_request');
  assert.equal(client.calls[1].input[0].type, 'function_call_output');
  assert.deepEqual(
    events.map((event) => event.type),
    ['status', 'status', 'status', 'text_delta', 'complete'],
  );
  assert.equal(events[1].message, 'Checking your strength numbers...');
});

test('Streaming Coach agent supports multiple tool calls before the final answer', async () => {
  const client = createFakeClientWithOptions([
    completedStream({
      id: 'resp_multi_tool_request',
      output: [functionCall('get_lift_history', { lift: 'bench' }), functionCall('get_recent_workouts', { limit: 5 })],
    }),
    completedStream({
      id: 'resp_multi_tool_answer',
      text: 'Bench has been stable recently, and your last sessions were planned workouts.',
    }),
  ]);
  const executedTools = [];
  const agent = createStreamingCoachAgent({
    client,
    executeTool: async ({ name }) => {
      executedTools.push(name);
      return { name, result: { ok: true } };
    },
  });

  const response = await agent({
    authenticatedUserId: 'user-a',
    message: 'How has my bench progressed and what have I trained recently?',
    onEvent: async () => {},
  });

  assert.match(response.answer, /bench/i);
  assert.deepEqual(response.sources, ['get_lift_history', 'get_recent_workouts']);
  assert.deepEqual(executedTools, ['get_lift_history', 'get_recent_workouts']);
  assert.equal(client.calls[1].input.length, 2);
});

test('Streaming Coach agent uses current program and progress summary tools for matching questions', async () => {
  const scenarios = [
    ['What should I train next?', 'get_current_program'],
    ['How am I progressing overall?', 'get_progress_summary'],
  ];

  for (const [message, toolName] of scenarios) {
    const client = createFakeClientWithOptions([
      completedStream({
        id: `resp_${toolName}_request`,
        output: [functionCall(toolName)],
      }),
      completedStream({
        id: `resp_${toolName}_answer`,
        text: `Answered with ${toolName}.`,
      }),
    ]);
    const executedTools = [];
    const agent = createStreamingCoachAgent({
      client,
      executeTool: async ({ name }) => {
        executedTools.push(name);
        return { name, result: { ok: true } };
      },
    });

    const response = await agent({
      authenticatedUserId: 'user-a',
      message,
      onEvent: async () => {},
    });

    assert.equal(response.answer, `Answered with ${toolName}.`);
    assert.deepEqual(response.sources, [toolName]);
    assert.deepEqual(executedTools, [toolName]);
  }
});

test('Streaming Coach agent handles cancellation, OpenAI failures, and tool failures safely', async () => {
  const abortError = new Error('operation aborted');
  abortError.name = 'AbortError';

  await assert.rejects(
    () =>
      createStreamingCoachAgent({
        client: createFakeClientWithOptions([abortError]),
      })({
        authenticatedUserId: 'user-a',
        message: 'Cancel this.',
        onEvent: async () => {},
      }),
    /cancelled/i,
  );

  await assert.rejects(
    () =>
      createStreamingCoachAgent({
        client: createFakeClientWithOptions([failedStream()]),
      })({
        authenticatedUserId: 'user-a',
        message: 'Summarize training.',
        onEvent: async () => {},
      }),
    /could not complete/i,
  );

  await assert.rejects(
    () =>
      createStreamingCoachAgent({
        client: createFakeClientWithOptions([
          completedStream({
            id: 'resp_tool_request',
            output: [functionCall('get_training_maxes')],
          }),
        ]),
        executeTool: async () => {
          const error = new Error('Tool unavailable');
          error.statusCode = 503;
          throw error;
        },
      })({
        authenticatedUserId: 'user-a',
        message: 'What is my bench training max?',
        onEvent: async () => {},
      }),
    /couldn't generate a coaching response/i,
  );
});
