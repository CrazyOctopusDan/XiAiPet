export interface ErrorResponse {
  ok: false;
  code: string;
  message: string;
}

export interface ErrorHttpResponse {
  statusCode: number;
  body: ErrorResponse;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

function getHttpStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) {
    return undefined;
  }
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === 'number' && statusCode >= 400 && statusCode <= 599 ? statusCode : undefined;
}

export function toErrorResponse(error: unknown): ErrorHttpResponse {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      body: {
        ok: false,
        code: error.code,
        message: error.message
      }
    };
  }

  const statusCode = getHttpStatusCode(error);
  if (statusCode && statusCode < 500) {
    return {
      statusCode,
      body: {
        ok: false,
        code: `HTTP_${statusCode}`,
        message: 'Bad request'
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  };
}
