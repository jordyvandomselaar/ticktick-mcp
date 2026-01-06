import { describe, it, expect } from 'vitest';
import {
  TickTickError,
  TickTickApiError,
  TickTickAuthError,
  TickTickForbiddenError,
  TickTickNotFoundError,
  TickTickRateLimitError,
  TickTickBadRequestError,
  TickTickTimeoutError,
  TickTickNetworkError,
  createErrorFromResponse,
} from '../errors.js';

describe('Error Classes', () => {
  describe('TickTickError', () => {
    it('should create base error with message', () => {
      const error = new TickTickError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('TickTickError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('TickTickApiError', () => {
    it('should create API error with status code', () => {
      const error = new TickTickApiError('API error', 500);
      expect(error.message).toBe('API error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('TickTickApiError');
    });

    it('should include error code and response body', () => {
      const body = { error: 'invalid_request', message: 'Bad data' };
      const error = new TickTickApiError('API error', 400, 'invalid_request', body);
      expect(error.errorCode).toBe('invalid_request');
      expect(error.responseBody).toEqual(body);
    });
  });

  describe('TickTickAuthError', () => {
    it('should create auth error', () => {
      const error = new TickTickAuthError('Unauthorized');
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('TickTickAuthError');
    });
  });

  describe('TickTickForbiddenError', () => {
    it('should create forbidden error', () => {
      const error = new TickTickForbiddenError('Forbidden');
      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('TickTickForbiddenError');
    });
  });

  describe('TickTickNotFoundError', () => {
    it('should create not found error', () => {
      const error = new TickTickNotFoundError('Not found');
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('TickTickNotFoundError');
    });
  });

  describe('TickTickRateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new TickTickRateLimitError('Too many requests');
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('TickTickRateLimitError');
    });
  });

  describe('TickTickBadRequestError', () => {
    it('should create bad request error', () => {
      const error = new TickTickBadRequestError('Bad request');
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('TickTickBadRequestError');
    });
  });

  describe('TickTickTimeoutError', () => {
    it('should create timeout error with timeout value', () => {
      const error = new TickTickTimeoutError('Request timed out', 30000);
      expect(error.message).toBe('Request timed out');
      expect(error.timeoutMs).toBe(30000);
      expect(error.name).toBe('TickTickTimeoutError');
    });
  });

  describe('TickTickNetworkError', () => {
    it('should create network error', () => {
      const originalError = new Error('Network failure');
      const error = new TickTickNetworkError('Network error', originalError);
      expect(error.message).toBe('Network error');
      expect(error.cause).toBe(originalError);
      expect(error.name).toBe('TickTickNetworkError');
    });
  });

  describe('createErrorFromResponse', () => {
    it('should create auth error for 401', async () => {
      const response = new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
      });
      const error = await createErrorFromResponse(response);
      expect(error).toBeInstanceOf(TickTickAuthError);
      expect(error.statusCode).toBe(401);
    });

    it('should create forbidden error for 403', async () => {
      const response = new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        statusText: 'Forbidden',
      });
      const error = await createErrorFromResponse(response);
      expect(error).toBeInstanceOf(TickTickForbiddenError);
      expect(error.statusCode).toBe(403);
    });

    it('should create not found error for 404', async () => {
      const response = new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        statusText: 'Not Found',
      });
      const error = await createErrorFromResponse(response);
      expect(error).toBeInstanceOf(TickTickNotFoundError);
      expect(error.statusCode).toBe(404);
    });

    it('should create rate limit error for 429', async () => {
      const response = new Response(JSON.stringify({ error: 'rate_limit' }), {
        status: 429,
        statusText: 'Too Many Requests',
      });
      const error = await createErrorFromResponse(response);
      expect(error).toBeInstanceOf(TickTickRateLimitError);
      expect(error.statusCode).toBe(429);
    });

    it('should create bad request error for 400', async () => {
      const response = new Response(
        JSON.stringify({
          error: 'invalid_request',
          message: 'Invalid data',
        }),
        {
          status: 400,
          statusText: 'Bad Request',
        }
      );
      const error = await createErrorFromResponse(response);
      expect(error).toBeInstanceOf(TickTickBadRequestError);
      expect(error.statusCode).toBe(400);
    });

    it('should create generic API error for other status codes', async () => {
      const response = new Response(JSON.stringify({ error: 'server_error' }), {
        status: 500,
        statusText: 'Internal Server Error',
      });
      const error = await createErrorFromResponse(response);
      expect(error).toBeInstanceOf(TickTickApiError);
      expect(error).not.toBeInstanceOf(TickTickAuthError);
      expect(error.statusCode).toBe(500);
    });

    it('should handle empty response body', async () => {
      const response = new Response('', {
        status: 500,
        statusText: 'Internal Server Error',
      });
      const error = await createErrorFromResponse(response);
      expect(error).toBeInstanceOf(TickTickApiError);
      expect(error.message).toContain('500');
    });

    it('should include error description in message', async () => {
      const response = new Response(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'The access token is invalid',
        }),
        {
          status: 401,
          statusText: 'Unauthorized',
        }
      );
      const error = await createErrorFromResponse(response);
      expect(error.message).toContain('The access token is invalid');
    });
  });
});
