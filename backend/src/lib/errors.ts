import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}

export class ToolExecutionError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode);
  }
}

export function createErrorResponse(error: unknown): NextResponse<ApiError> {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.constructor.name,
        message: error.message,
        statusCode: error.statusCode,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: error.message,
        statusCode: 500,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: 'UnknownError',
      message: 'An unknown error occurred',
      statusCode: 500,
    },
    { status: 500 }
  );
}

export function handleAsyncRoute(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}