import OpenAI from 'openai';
import { COACH_SYSTEM_PROMPT } from './coachPrompt.js';
import { coachToolDefinitions, executeCoachTool } from './coachTools.js';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_TOOL_ROUNDS = 5;
const OPENAI_TIMEOUT_MS = 60000;

let openAIClient;

const createCoachError = (message, statusCode = 502) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = true;
  return error;
};

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw createCoachError("I couldn't generate a coaching response right now. Please try again.", 503);
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openAIClient;
};

const normalizeCoachFailure = (error) => {
  if (error.statusCode) {
    if (error.expose) {
      return error;
    }

    return createCoachError("I couldn't generate a coaching response right now. Please try again.", error.statusCode >= 500 ? 502 : 422);
  }

  if (error.status === 429 || error.code === 'rate_limit_exceeded') {
    return createCoachError('The coach is receiving too many requests. Please try again shortly.', 429);
  }

  if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
    return createCoachError('The coach took too long to respond. Please try again.', 504);
  }

  return createCoachError('The AI coach is unavailable right now. Please try again shortly.');
};

const getFunctionCalls = (response) =>
  (response?.output || []).filter((item) => item.type === 'function_call' && item.name && item.call_id);

const normalizeAnswer = (response) => {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const messageText = (response?.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === 'output_text' && content.text)
    .map((content) => content.text)
    .join('\n')
    .trim();

  return messageText;
};

const logCoachEvent = (message, payload = {}) => {
  console.info(`Coach: ${message}`, payload);
};

const buildInitialResponsePayload = ({ model, message, stream = false }) => ({
  model,
  instructions: COACH_SYSTEM_PROMPT,
  input: [
    {
      role: 'user',
      content: message,
    },
  ],
  tools: coachToolDefinitions,
  ...(stream ? { stream: true } : {}),
});

const buildToolResponsePayload = ({ model, previousResponseId, toolOutputs, stream = false }) => ({
  model,
  instructions: COACH_SYSTEM_PROMPT,
  previous_response_id: previousResponseId,
  input: toolOutputs,
  tools: coachToolDefinitions,
  ...(stream ? { stream: true } : {}),
});

const friendlyStatusForTool = (toolName) => {
  const statuses = {
    get_training_maxes: 'Checking your strength numbers...',
    get_recent_workouts: 'Reviewing your recent workouts...',
    get_lift_history: 'Checking your strength progression...',
    get_current_program: 'Reviewing your current program...',
    get_progress_summary: 'Reviewing your progress summary...',
  };

  return statuses[toolName] || 'Reviewing your training...';
};

const consumeOpenAIStream = async (stream, onEvent) => {
  let completedResponse = null;
  let streamedText = '';
  const outputItems = [];

  for await (const event of stream) {
    if (event.type === 'response.output_text.delta' && event.delta) {
      streamedText += event.delta;
      await onEvent({ type: 'text_delta', delta: event.delta });
      continue;
    }

    if (event.type === 'response.completed') {
      completedResponse = event.response;
    }

    if (event.type === 'response.output_item.done' && event.item) {
      outputItems.push(event.item);
    }

    if (event.type === 'response.failed') {
      throw createCoachError('The coach could not complete the response.');
    }
  }

  return {
    response: completedResponse
      ? {
          ...completedResponse,
          output: completedResponse.output?.length ? completedResponse.output : outputItems,
        }
      : null,
    streamedText,
  };
};

export const createCoachAgent = ({
  client = null,
  executeTool = executeCoachTool,
  model = process.env.OPENAI_MODEL || DEFAULT_MODEL,
} = {}) => {
  const openai = client || getOpenAIClient();

  return async ({ authenticatedUserId, message }) => {
    const startedAt = Date.now();
    const sources = new Set();
    let response;

    logCoachEvent('request started', { userId: String(authenticatedUserId), model });

    try {
      response = await openai.responses.create(
        buildInitialResponsePayload({ model, message }),
        { timeout: OPENAI_TIMEOUT_MS },
      );

      for (let round = 1; round <= MAX_TOOL_ROUNDS; round += 1) {
        const toolCalls = getFunctionCalls(response);

        if (toolCalls.length === 0) {
          const answer = normalizeAnswer(response);

          if (!answer) {
            throw createCoachError('The coach returned an empty response.');
          }

          logCoachEvent('request completed', {
            userId: String(authenticatedUserId),
            rounds: round - 1,
            durationMs: Date.now() - startedAt,
          });

          return {
            answer,
            sources: [...sources],
          };
        }

        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          const toolStartedAt = Date.now();
          const toolResult = await executeTool({
            name: toolCall.name,
            args: toolCall.arguments || '{}',
            authenticatedUserId,
          });

          sources.add(toolCall.name);
          logCoachEvent('tool executed', {
            userId: String(authenticatedUserId),
            tool: toolCall.name,
            durationMs: Date.now() - toolStartedAt,
          });

          toolOutputs.push({
            type: 'function_call_output',
            call_id: toolCall.call_id,
            output: JSON.stringify(toolResult.result),
          });
        }

        response = await openai.responses.create(
          buildToolResponsePayload({ model, previousResponseId: response.id, toolOutputs }),
          { timeout: OPENAI_TIMEOUT_MS },
        );
      }

      throw createCoachError('The coach needed too many tool calls to answer safely.', 422);
    } catch (error) {
      logCoachEvent('request failed', {
        userId: String(authenticatedUserId),
        durationMs: Date.now() - startedAt,
        message: error.message,
      });

      throw normalizeCoachFailure(error);
    }
  };
};

export const runCoachAgent = async (params) => createCoachAgent()(params);

export const createStreamingCoachAgent = ({
  client = null,
  executeTool = executeCoachTool,
  model = process.env.OPENAI_MODEL || DEFAULT_MODEL,
} = {}) => {
  const openai = client || getOpenAIClient();

  return async ({ authenticatedUserId, message, onEvent, signal }) => {
    const startedAt = Date.now();
    const sources = new Set();
    let response;

    logCoachEvent('stream started', { userId: String(authenticatedUserId), model });

    try {
      await onEvent({ type: 'status', message: 'Reviewing your training...' });

      for (let round = 1; round <= MAX_TOOL_ROUNDS; round += 1) {
        const shouldStreamFinal = round === MAX_TOOL_ROUNDS || sources.size > 0;
        const stream = await openai.responses.create(
          response
            ? buildToolResponsePayload({
                model,
                previousResponseId: response.id,
                toolOutputs: response.toolOutputs,
                stream: shouldStreamFinal,
              })
            : buildInitialResponsePayload({ model, message, stream: true }),
          { timeout: OPENAI_TIMEOUT_MS, signal },
        );

        const streamResult = await consumeOpenAIStream(stream, onEvent);
        response = streamResult.response;

        if (!response) {
          throw createCoachError('The coach stream ended before the response completed.');
        }

        const toolCalls = getFunctionCalls(response);

        if (toolCalls.length === 0) {
          if (!streamResult.streamedText.trim()) {
            throw createCoachError('The coach returned an empty response.');
          }

          await onEvent({ type: 'complete', sources: [...sources] });
          logCoachEvent('stream completed', {
            userId: String(authenticatedUserId),
            rounds: round - 1,
            durationMs: Date.now() - startedAt,
          });
          return {
            answer: streamResult.streamedText,
            sources: [...sources],
          };
        }

        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          const toolStartedAt = Date.now();
          await onEvent({ type: 'status', message: friendlyStatusForTool(toolCall.name) });

          const toolResult = await executeTool({
            name: toolCall.name,
            args: toolCall.arguments || '{}',
            authenticatedUserId,
          });

          sources.add(toolCall.name);
          logCoachEvent('stream tool executed', {
            userId: String(authenticatedUserId),
            tool: toolCall.name,
            durationMs: Date.now() - toolStartedAt,
          });

          toolOutputs.push({
            type: 'function_call_output',
            call_id: toolCall.call_id,
            output: JSON.stringify(toolResult.result),
          });
        }

        await onEvent({ type: 'status', message: 'Preparing your answer...' });
        response = {
          ...response,
          toolOutputs,
        };
      }

      throw createCoachError('The coach needed too many tool calls to answer safely.', 422);
    } catch (error) {
      logCoachEvent('stream failed', {
        userId: String(authenticatedUserId),
        durationMs: Date.now() - startedAt,
        message: error.message,
      });

      if (error.name === 'AbortError') {
        throw createCoachError('Coach response was cancelled.', 499);
      }

      throw normalizeCoachFailure(error);
    }
  };
};

export const streamCoachAgent = async (params) => createStreamingCoachAgent()(params);
