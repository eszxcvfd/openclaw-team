import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { resolveTraceId } from '../utils/trace-id';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const traceId = resolveTraceId(request, response);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.buildErrorPayload(exception, status);

    response.status(status).json({
      success: false,
      error: payload,
      meta: {
        traceId,
      },
    });
  }

  private buildErrorPayload(exception: unknown, status: number) {
    if (!(exception instanceof HttpException)) {
      return {
        code: 'INTERNAL_ERROR',
        message: 'Da xay ra loi noi bo.',
        details: {},
      };
    }

    const response = exception.getResponse();
    const defaultCode = this.mapStatusToCode(status);

    if (typeof response === 'string') {
      return {
        code: defaultCode,
        message: response,
        details: {},
      };
    }

    if (typeof response === 'object' && response !== null) {
      const errorResponse = response as Record<string, unknown>;
      const message = errorResponse.message;

      return {
        code:
          typeof errorResponse.code === 'string'
            ? errorResponse.code
            : defaultCode,
        message: Array.isArray(message)
          ? message.join(', ')
          : typeof message === 'string'
            ? message
            : exception.message,
        details:
          errorResponse.details ??
          (Array.isArray(message) ? { messages: message } : {}),
      };
    }

    return {
      code: defaultCode,
      message: exception.message,
      details: {},
    };
  }

  private mapStatusToCode(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
