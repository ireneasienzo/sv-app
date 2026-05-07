/**
 * Centralized error handling utility for Smart Design Vault
 */

export enum ErrorType {
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  PERMISSION = 'permission',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown'
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  shouldShow: boolean;
  shouldLog: boolean;
  originalError?: any;
}

/**
 * Classifies and handles errors gracefully
 */
export function handleError(error: any): ErrorInfo {
  // Handle null/undefined errors
  if (!error) {
    return {
      type: ErrorType.UNKNOWN,
      message: 'An unexpected error occurred',
      shouldShow: false,
      shouldLog: true
    };
  }

  // Appwrite specific errors
  if (error?.type === 'general_unauthorized' ||
    error?.code === 401 ||
    error?.message?.includes('not authorized')) {
    return {
      type: ErrorType.AUTHORIZATION,
      message: 'Authentication required',
      shouldShow: false, // Silent handling for auth errors
      shouldLog: true,
      originalError: error
    };
  }

  // Network errors
  if (error?.code === 'ENOTFOUND' ||
    error?.code === 'ECONNREFUSED' ||
    error?.message?.includes('network') ||
    error?.message?.includes('fetch failed')) {
    return {
      type: ErrorType.NETWORK,
      message: 'Connection issue detected',
      shouldShow: false, // Silent network errors
      shouldLog: true,
      originalError: error
    };
  }

  // Permission errors
  if (error?.code === 403 ||
    error?.message?.includes('permission') ||
    error?.message?.includes('forbidden')) {
    return {
      type: ErrorType.PERMISSION,
      message: 'Access denied',
      shouldShow: false, // Silent permission errors
      shouldLog: true,
      originalError: error
    };
  }

  // Rate limiting
  if (error?.code === 429 ||
    error?.message?.includes('rate limit') ||
    error?.message?.includes('too many requests')) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: 'Too many requests',
      shouldShow: false, // Silent rate limit errors
      shouldLog: true,
      originalError: error
    };
  }

  // Not found errors
  if (error?.code === 404 ||
    error?.message?.includes('not found') ||
    error?.type === 'document_not_found') {
    return {
      type: ErrorType.NOT_FOUND,
      message: 'Resource not found',
      shouldShow: false, // Silent not found errors
      shouldLog: false, // Don't log 404s
      originalError: error
    };
  }

  // Server errors (5xx)
  if (error?.code >= 500 && error?.code < 600) {
    return {
      type: ErrorType.SERVER_ERROR,
      message: 'Server error occurred',
      shouldShow: false, // Silent server errors
      shouldLog: true,
      originalError: error
    };
  }

  // Validation errors
  if (error?.message?.includes('validation') ||
    error?.message?.includes('invalid') ||
    error?.type === 'validation_exception') {
    return {
      type: ErrorType.VALIDATION,
      message: 'Invalid input provided',
      shouldShow: true, // Show validation errors to user
      shouldLog: false,
      originalError: error
    };
  }

  // Default unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: error?.message || 'An unexpected error occurred',
    shouldShow: false, // Silent unknown errors
    shouldLog: true,
    originalError: error
  };
}

/**
 * Logs errors to console with context
 */
export function logError(errorInfo: ErrorInfo, context?: string): void {
  if (!errorInfo.shouldLog) return;

  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';

  console.error(`${timestamp} ${contextStr}${errorInfo.type.toUpperCase()}: ${errorInfo.message}`, errorInfo.originalError);
}

/**
 * Shows user-friendly error message when appropriate
 */
export function showError(errorInfo: ErrorInfo, showToast?: (toast: any) => void): void {
  if (!errorInfo.shouldShow) return;

  if (showToast) {
    showToast({
      title: 'Error',
      description: errorInfo.message,
      variant: 'destructive',
      duration: 5000
    });
  }
}

/**
 * Handles error with logging and optional user notification
 */
export function handleAppwriteError(error: any, context?: string, showToast?: (toast: any) => void): void {
  const errorInfo = handleError(error);
  logError(errorInfo, context);
  showError(errorInfo, showToast);
}
