/**
 * Vote error handling utilities
 * Maps API errors to user-friendly messages
 */

export type VoteErrorCode =
  | 'RATE_LIMITED'
  | 'VOTE_LIMIT_EXCEEDED'
  | 'MATCH_ENDED'
  | 'MATCH_NOT_FOUND'
  | 'CAPTCHA_FAILED'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'LOCATION_ERROR'
  | 'UNKNOWN_ERROR';

export interface VoteError {
  code: VoteErrorCode;
  message: string;
  details?: unknown;
}

/**
 * User-friendly error messages for each error code
 */
const ERROR_MESSAGES: Record<VoteErrorCode, string> = {
  RATE_LIMITED: "You're voting too fast. Please wait a moment before trying again.",
  VOTE_LIMIT_EXCEEDED: "You've reached the maximum votes allowed for this match.",
  MATCH_ENDED: "This match has ended and is no longer accepting votes.",
  MATCH_NOT_FOUND: "This match could not be found.",
  CAPTCHA_FAILED: "Captcha verification failed. Please try again.",
  NETWORK_ERROR: "Connection error. Please check your internet and try again.",
  VALIDATION_ERROR: "Please check your submission and try again.",
  LOCATION_ERROR: "Unable to determine your location. Please enable location services.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
};

/**
 * Convert an error object into a user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  // Handle VoteError objects
  if (isVoteError(error)) {
    return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  // Handle API error responses
  if (isApiError(error)) {
    const code = mapApiErrorToCode(error.code);
    return ERROR_MESSAGES[code];
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    // Check for specific error messages
    if (error.message.toLowerCase().includes('rate limit')) {
      return ERROR_MESSAGES.RATE_LIMITED;
    }
    if (error.message.toLowerCase().includes('captcha')) {
      return ERROR_MESSAGES.CAPTCHA_FAILED;
    }
    if (error.message.toLowerCase().includes('location')) {
      return ERROR_MESSAGES.LOCATION_ERROR;
    }
  }

  // Default fallback
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Map API error codes to VoteErrorCode
 */
function mapApiErrorToCode(apiCode: string): VoteErrorCode {
  switch (apiCode.toUpperCase()) {
    case 'RATE_LIMITED':
    case 'TOO_MANY_REQUESTS':
      return 'RATE_LIMITED';
    case 'VOTE_LIMIT_EXCEEDED':
    case 'MAX_VOTES_REACHED':
      return 'VOTE_LIMIT_EXCEEDED';
    case 'MATCH_ENDED':
    case 'MATCH_CLOSED':
      return 'MATCH_ENDED';
    case 'MATCH_NOT_FOUND':
    case 'INVALID_MATCH':
      return 'MATCH_NOT_FOUND';
    case 'CAPTCHA_FAILED':
    case 'INVALID_CAPTCHA':
      return 'CAPTCHA_FAILED';
    case 'VALIDATION_ERROR':
    case 'INVALID_INPUT':
      return 'VALIDATION_ERROR';
    case 'LOCATION_ERROR':
    case 'GEOLOCATION_ERROR':
      return 'LOCATION_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Type guard for VoteError
 */
function isVoteError(error: unknown): error is VoteError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Type guard for API error response
 */
function isApiError(error: unknown): error is { code: string; error: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}

/**
 * Create a VoteError object
 */
export function createVoteError(
  code: VoteErrorCode,
  details?: unknown
): VoteError {
  return {
    code,
    message: ERROR_MESSAGES[code],
    details,
  };
}
