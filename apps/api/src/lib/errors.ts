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

  return {
    statusCode: 500,
    body: {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  };
}
