import OpenAI from 'openai';
import { COACH_SYSTEM_PROMPT } from './coachPrompt.js';
import { coachToolDefinitions, executeCoachTool } from './coachTools.js';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_TOOL_ROUNDS = 5;
const OPENAI_TIMEOUT_MS = 60000;

let openAIClient;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OpenAI API key is not configured');
    error.statusCode = 503;
    throw error;
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openAIClient;
};

const createCoachError = (message, statusCode = 502) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = true;
  return error;
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
        {
          model,
          instructions: COACH_SYSTEM_PROMPT,
          input: [
            {
              role: 'user',
              content: message,
            },
          ],
          tools: coachToolDefinitions,
        },
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
          {
            model,
            instructions: COACH_SYSTEM_PROMPT,
            previous_response_id: response.id,
            input: toolOutputs,
            tools: coachToolDefinitions,
          },
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

      if (error.statusCode) {
        throw error;
      }

      if (error.status === 429 || error.code === 'rate_limit_exceeded') {
        throw createCoachError('The coach is receiving too many requests. Please try again shortly.', 429);
      }

      if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
        throw createCoachError('The coach took too long to respond. Please try again.', 504);
      }

      throw createCoachError('The AI coach is unavailable right now. Please try again shortly.');
    }
  };
};

export const runCoachAgent = async (params) => createCoachAgent()(params);
