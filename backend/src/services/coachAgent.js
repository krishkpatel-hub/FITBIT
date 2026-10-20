import OpenAI from 'openai';
import { COACH_SYSTEM_PROMPT } from './coachPrompt.js';
import { coachToolDefinitions, executeCoachTool } from './coachTools.js';
import { createCoachDiagnostics } from '../utils/coachDiagnostics.js';

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
    createCoachDiagnostics(process.env.OPENAI_MODEL || DEFAULT_MODEL).fail({ code: 'missing_api_key', statusCode: 503 });
    throw createCoachError("I couldn't generate a coaching response right now. Please try again.", 503);
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
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

  if (error.name === 'TimeoutError' || error.name === 'APIConnectionTimeoutError' || error.code === 'ETIMEDOUT') {
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

    if (event.type === 'response.failed' || event.type === 'response.incomplete' || event.type === 'error') {
      const error = createCoachError('The coach could not complete the response.');
      error.code = event.response?.error?.code || event.code;
      throw error;
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

  return async ({ authenticatedUserId, message, signal = AbortSignal.timeout(65000) }) => {
    const diagnostics = createCoachDiagnostics(model);
    const sources = new Set();
    let response;

    diagnostics.stage('provider_initial');

    try {
      signal.throwIfAborted();
      response = await openai.responses.create(
        buildInitialResponsePayload({ model, message }),
        { timeout: OPENAI_TIMEOUT_MS, signal },
      );

      for (let round = 1; round <= MAX_TOOL_ROUNDS + 1; round += 1) {
        signal.throwIfAborted();
        const toolCalls = getFunctionCalls(response);

        if (toolCalls.length === 0) {
          const answer = normalizeAnswer(response);

          if (!answer) {
            throw createCoachError('The coach returned an empty response.');
          }

          diagnostics.complete({ rounds: round - 1 });

          return {
            answer,
            sources: [...sources],
          };
        }

        if (round > MAX_TOOL_ROUNDS) break;
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          signal.throwIfAborted();
          diagnostics.stage('tool', { tool: coachToolDefinitions.find((tool) => tool.name === toolCall.name)?.name || 'unknown' });
          const toolResult = await executeTool({
            name: toolCall.name,
            args: toolCall.arguments || '{}',
            authenticatedUserId,
          });

          sources.add(toolCall.name);
          diagnostics.complete();

          toolOutputs.push({
            type: 'function_call_output',
            call_id: toolCall.call_id,
            output: JSON.stringify(toolResult.result),
          });
        }

        diagnostics.stage('provider_followup');
        response = await openai.responses.create(
          buildToolResponsePayload({ model, previousResponseId: response.id, toolOutputs }),
          { timeout: OPENAI_TIMEOUT_MS, signal },
        );
      }

      throw createCoachError('The coach needed too many tool calls to answer safely.', 422);
    } catch (error) {
      diagnostics.fail(error);

      throw normalizeCoachFailure(signal.aborted ? signal.reason : error);
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
    const diagnostics = createCoachDiagnostics(model);
    const sources = new Set();
    let response;

    diagnostics.stage('stream');

    try {
      await onEvent({ type: 'status', message: 'Reviewing your training...' });

      for (let round = 1; round <= MAX_TOOL_ROUNDS + 1; round += 1) {
        signal?.throwIfAborted();
        diagnostics.stage(response ? 'provider_followup' : 'provider_initial');
        const stream = await openai.responses.create(
          response
            ? buildToolResponsePayload({
                model,
                previousResponseId: response.id,
                toolOutputs: response.toolOutputs,
                stream: true,
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
          diagnostics.complete({ rounds: round - 1 });
          return {
            answer: streamResult.streamedText,
            sources: [...sources],
          };
        }

        if (round > MAX_TOOL_ROUNDS) break;
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          signal?.throwIfAborted();
          diagnostics.stage('tool', { tool: coachToolDefinitions.find((tool) => tool.name === toolCall.name)?.name || 'unknown' });
          await onEvent({ type: 'status', message: friendlyStatusForTool(toolCall.name) });

          const toolResult = await executeTool({
            name: toolCall.name,
            args: toolCall.arguments || '{}',
            authenticatedUserId,
          });

          sources.add(toolCall.name);
          diagnostics.complete();

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
      diagnostics.fail(error);

      if (signal?.reason?.name === 'TimeoutError') {
        throw createCoachError('The coach took too long to respond. Please try again.', 504);
      }
      if (signal?.aborted || error.name === 'AbortError' || error.name === 'APIUserAbortError') {
        throw createCoachError('Coach response was cancelled.', 499);
      }

      throw normalizeCoachFailure(error);
    }
  };
};

export const streamCoachAgent = async (params) => createStreamingCoachAgent()(params);
