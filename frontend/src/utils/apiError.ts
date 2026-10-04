interface ApiError {
  code?: string;
  response?: {
    status?: number;
    data?: { message?: unknown };
  };
}

export function getUserFacingError(error: ApiError, fallback: string): string {
  const status = error?.response?.status;

  if (status === 401) return 'Your session expired. Please log in again.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'The request took too long. Please try again.';
  }
  if (!error?.response) return 'Unable to connect. Check your connection and try again.';
  if (!status || status >= 500) return fallback;

  const message = error.response.data?.message;
  if (
    typeof message === 'string' &&
    message.length > 0 &&
    message.length <= 160 &&
    !/[\r\n<>\[\]{}]/.test(message) &&
    !/\b(?:CastError|Mongoose|MongoDB|stack trace|Internal server error)\b/i.test(message)
  ) {
    return message;
  }

  return fallback;
}
