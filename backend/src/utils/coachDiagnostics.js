import { randomUUID } from 'node:crypto';

// Log operational metadata only. Provider messages can contain prompts or data.
export const createCoachDiagnostics = (model) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  let stage = 'initialization';
  const log = (event, metadata = {}) => console.info('Coach', {
    requestId, model, stage, event, durationMs: Date.now() - startedAt, ...metadata,
  });

  return {
    stage(nextStage, metadata) {
      stage = nextStage;
      log('started', metadata);
    },
    complete(metadata) { log('completed', metadata); },
    fail(error) {
      const knownCodes = new Set([
        'invalid_api_key', 'insufficient_quota', 'rate_limit_exceeded', 'model_not_found',
        'invalid_function_parameters', 'invalid_request_error', 'server_error',
        'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'missing_api_key',
      ]);
      const knownClasses = new Set([
        'Error', 'ReferenceError', 'TypeError', 'SyntaxError', 'AbortError', 'TimeoutError',
        'APIUserAbortError', 'APIConnectionTimeoutError', 'APIConnectionError',
        'BadRequestError', 'AuthenticationError', 'PermissionDeniedError',
        'NotFoundError', 'RateLimitError', 'InternalServerError',
        'MongooseError', 'MongoServerError', 'MongoNetworkError', 'CastError',
      ]);
      log('failed', {
        errorClass: knownClasses.has(error?.name) ? error.name : 'Error',
        code: knownCodes.has(error?.code) ? error.code : 'request_failed',
        status: Number(error?.status || error?.statusCode) || undefined,
      });
    },
  };
};
