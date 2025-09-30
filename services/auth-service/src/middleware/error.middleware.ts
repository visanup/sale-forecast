import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/auth.types';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = (req as any).requestId || 'unknown';
  const timestamp = new Date().toISOString();

  // Log error
  console.error({
    error: error.message,
    stack: error.stack,
    requestId,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Determine error code and status
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An internal server error occurred';

  // Handle specific error types
  if (error.message === 'INVALID_CREDENTIALS') {
    statusCode = 401;
    errorCode = 'INVALID_CREDENTIALS';
    message = 'Invalid username or password';
  } else if (error.message === 'TOKEN_EXPIRED') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  } else if (error.message === 'INVALID_TOKEN') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid token';
  } else if (error.message === 'INVALID_REFRESH_TOKEN') {
    statusCode = 401;
    errorCode = 'INVALID_REFRESH_TOKEN';
    message = 'Invalid refresh token';
  } else if (error.message === 'TOKEN_REUSE_DETECTED') {
    statusCode = 401;
    errorCode = 'TOKEN_REUSE_DETECTED';
    message = 'Token reuse detected, all sessions revoked';
  } else if (error.message === 'EMAIL_ALREADY_EXISTS') {
    statusCode = 409;
    errorCode = 'EMAIL_ALREADY_EXISTS';
    message = 'Email already exists';
  } else if (error.message === 'USERNAME_ALREADY_EXISTS') {
    statusCode = 409;
    errorCode = 'USERNAME_ALREADY_EXISTS';
    message = 'Username already exists';
  } else if (error.message === 'USER_NOT_FOUND') {
    statusCode = 404;
    errorCode = 'USER_NOT_FOUND';
    message = 'User not found';
  } else if (error.message === 'INVALID_OR_EXPIRED_RESET_TOKEN') {
    statusCode = 400;
    errorCode = 'INVALID_OR_EXPIRED_RESET_TOKEN';
    message = 'Invalid or expired reset token';
  } else if (error.message === 'INVALID_OR_EXPIRED_VERIFICATION_TOKEN') {
    statusCode = 400;
    errorCode = 'INVALID_OR_EXPIRED_VERIFICATION_TOKEN';
    message = 'Invalid or expired verification token';
  } else if (error.message === 'PASSWORD_RESET_TOKEN_EXPIRED') {
    statusCode = 400;
    errorCode = 'PASSWORD_RESET_TOKEN_EXPIRED';
    message = 'Password reset token has expired';
  } else if (error.message === 'EMAIL_VERIFICATION_TOKEN_EXPIRED') {
    statusCode = 400;
    errorCode = 'EMAIL_VERIFICATION_TOKEN_EXPIRED';
    message = 'Email verification token has expired';
  } else if (error.message === 'INVALID_TOKEN_TYPE') {
    statusCode = 400;
    errorCode = 'INVALID_TOKEN_TYPE';
    message = 'Invalid token type';
  } else if (error.message === 'RATE_LIMIT_EXCEEDED') {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests';
  } else if (error.message === 'VALIDATION_ERROR') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation error';
  } else if (error.message === 'FORBIDDEN') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access forbidden';
  } else if (error.message === 'UNAUTHORIZED') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else if (error.statusCode) {
    statusCode = error.statusCode;
    errorCode = error.code || 'HTTP_ERROR';
    message = error.message;
  }

  // Handle Prisma errors
  if (error.message.includes('Unique constraint failed')) {
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    message = 'Resource already exists';
  } else if (error.message.includes('Record to update not found')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (error.message.includes('Foreign key constraint failed')) {
    statusCode = 400;
    errorCode = 'FOREIGN_KEY_CONSTRAINT';
    message = 'Invalid reference to related resource';
  }

  // Handle validation errors
  if (error.message.includes('Password validation failed')) {
    statusCode = 400;
    errorCode = 'PASSWORD_VALIDATION_FAILED';
    message = error.message;
  }

  // Prepare error response
  const errorResponse: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      requestId,
      timestamp
    }
  };

  // Add details for validation errors
  if (errorCode === 'VALIDATION_ERROR' || errorCode === 'PASSWORD_VALIDATION_FAILED') {
    errorResponse.error!.details = {
      originalMessage: error.message
    };
  }

  // Add rate limit details
  if (errorCode === 'RATE_LIMIT_EXCEEDED') {
    errorResponse.error!.details = {
      retryAfter: 60 // seconds
    };
  }

  res.status(statusCode).json(errorResponse);
};