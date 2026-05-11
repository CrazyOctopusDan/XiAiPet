import { describe, expect, it } from 'vitest';

import { ApiError, toErrorResponse } from './errors';

describe('toErrorResponse', () => {
  it('preserves safe API errors', () => {
    expect(toErrorResponse(new ApiError('BAD_REQUEST', 'Invalid input', 422))).toEqual({
      statusCode: 422,
      body: {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Invalid input'
      }
    });
  });

  it('hides unknown error details', () => {
    const result = toErrorResponse(new Error('database password leaked'));

    expect(result).toEqual({
      statusCode: 500,
      body: {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
    expect(JSON.stringify(result)).not.toContain('database password leaked');
  });
});
