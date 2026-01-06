/**
 * TickTick SDK Error Classes
 *
 * Custom error classes for handling TickTick API errors.
 */

import type { ApiErrorResponse } from "./types.js";

/**
 * Base error class for all TickTick SDK errors.
 */
export class TickTickError extends Error {
  /** Error name for instanceof checks */
  override name = "TickTickError";

  constructor(message: string) {
    super(message);
    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when an API request fails.
 * Contains HTTP status code and response details.
 */
export class TickTickApiError extends TickTickError {
  override name = "TickTickApiError";

  /** HTTP status code */
  readonly statusCode: number;

  /** Error code from the API response */
  readonly errorCode?: string;

  /** Raw response body */
  readonly responseBody?: ApiErrorResponse;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    responseBody?: ApiErrorResponse
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.responseBody = responseBody;
  }

  /**
   * Create an error from an HTTP response.
   */
  static async fromResponse(response: Response): Promise<TickTickApiError> {
    let body: ApiErrorResponse | undefined;
    let message = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode: string | undefined;

    try {
      const text = await response.text();
      if (text) {
        body = JSON.parse(text) as ApiErrorResponse;
        if (body.error_description) {
          message = body.error_description;
        } else if (body.message) {
          message = body.message;
        } else if (body.error) {
          message = body.error;
        }
        errorCode = body.error;
      }
    } catch {
      // Failed to parse response body - use default message
    }

    return new TickTickApiError(message, response.status, errorCode, body);
  }
}

/**
 * Error thrown when authentication fails or the token is invalid/expired.
 */
export class TickTickAuthError extends TickTickApiError {
  override name = "TickTickAuthError";

  constructor(message: string, responseBody?: ApiErrorResponse) {
    super(message, 401, "unauthorized", responseBody);
  }
}

/**
 * Error thrown when the user doesn't have permission to access a resource.
 */
export class TickTickForbiddenError extends TickTickApiError {
  override name = "TickTickForbiddenError";

  constructor(message: string, responseBody?: ApiErrorResponse) {
    super(message, 403, "forbidden", responseBody);
  }
}

/**
 * Error thrown when a requested resource is not found.
 */
export class TickTickNotFoundError extends TickTickApiError {
  override name = "TickTickNotFoundError";

  constructor(message: string, responseBody?: ApiErrorResponse) {
    super(message, 404, "not_found", responseBody);
  }
}

/**
 * Error thrown when rate limits are exceeded.
 */
export class TickTickRateLimitError extends TickTickApiError {
  override name = "TickTickRateLimitError";

  /** Time to wait before retrying (in seconds), if provided by the API */
  readonly retryAfter?: number;

  constructor(
    message: string,
    retryAfter?: number,
    responseBody?: ApiErrorResponse
  ) {
    super(message, 429, "rate_limited", responseBody);
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when the request is invalid (bad parameters, etc.).
 */
export class TickTickBadRequestError extends TickTickApiError {
  override name = "TickTickBadRequestError";

  constructor(message: string, responseBody?: ApiErrorResponse) {
    super(message, 400, "bad_request", responseBody);
  }
}

/**
 * Error thrown when a request times out.
 */
export class TickTickTimeoutError extends TickTickError {
  override name = "TickTickTimeoutError";

  /** The timeout duration that was exceeded (in milliseconds) */
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when there's a network connectivity issue.
 */
export class TickTickNetworkError extends TickTickError {
  override name = "TickTickNetworkError";

  /** The underlying error that caused the network failure */
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}

/**
 * Create the appropriate error class based on HTTP status code.
 */
export async function createErrorFromResponse(
  response: Response
): Promise<TickTickApiError> {
  let body: ApiErrorResponse | undefined;
  let message = `HTTP ${response.status}: ${response.statusText}`;
  let retryAfter: number | undefined;

  try {
    const text = await response.text();
    if (text) {
      body = JSON.parse(text) as ApiErrorResponse;
      if (body.error_description) {
        message = body.error_description;
      } else if (body.message) {
        message = body.message;
      } else if (body.error) {
        message = body.error;
      }
    }
  } catch {
    // Failed to parse response body - use default message
  }

  // Try to get retry-after header for rate limit errors
  const retryAfterHeader = response.headers.get("retry-after");
  if (retryAfterHeader) {
    retryAfter = parseInt(retryAfterHeader, 10);
    if (isNaN(retryAfter)) {
      retryAfter = undefined;
    }
  }

  switch (response.status) {
    case 400:
      return new TickTickBadRequestError(message, body);
    case 401:
      return new TickTickAuthError(message, body);
    case 403:
      return new TickTickForbiddenError(message, body);
    case 404:
      return new TickTickNotFoundError(message, body);
    case 429:
      return new TickTickRateLimitError(message, retryAfter, body);
    default:
      return new TickTickApiError(message, response.status, body?.error, body);
  }
}
