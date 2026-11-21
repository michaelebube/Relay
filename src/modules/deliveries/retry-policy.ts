export const MAX_DELIVERY_ATTEMPTS = 5;
export const BASE_RETRY_DELAY_MS = 30000; // 30 seconds
export const MAX_RETRY_DELAY_MS = 15 * 60 * 1000; // 1 hour

export interface RetryDecision {
    shouldRetry: boolean;
    delayMs: number | null;
    nextAttemptAt: Date | null;
    exhausted: boolean;
}

export function isRetryableStatus(httpStatus: number | null): boolean {
  // Network error or timeout (no HTTP response received)
  if (httpStatus === null) {
    return true;
  }

  // 429 Too Many Requests, 408 Request Timeout, or any 5xx Server Error
  if (httpStatus === 429 || httpStatus === 408 || (httpStatus >= 500 && httpStatus < 600)) {
    return true;
  }

  return false;
}

export function calculateBackoffDelayMs(attemptNumber: number): number {
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attemptNumber - 1);
  return Math.min(exponentialDelay, MAX_RETRY_DELAY_MS);
}

export function evaluateRetryPolicy(attemptCount: number, httpStatus: number | null): RetryDecision {
    const exhausted = attemptCount >= MAX_DELIVERY_ATTEMPTS;
    const retryable = isRetryableStatus(httpStatus);

    if (exhausted || !retryable) {
        return {
            shouldRetry: false,
            delayMs: null,
            nextAttemptAt: null,
            exhausted,
        };
    }

    const delayMs = calculateBackoffDelayMs(attemptCount);
    const nextAttemptAt = new Date(Date.now() + delayMs);

    return {
        shouldRetry: true,
        delayMs,
        nextAttemptAt,
        exhausted: false,
    };
}