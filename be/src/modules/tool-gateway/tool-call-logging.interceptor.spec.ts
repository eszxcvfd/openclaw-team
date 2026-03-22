import { CallHandler, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { ToolCallLoggingInterceptor } from './tool-call-logging.interceptor';
import { ToolCallLoggerService } from './tool-call-logger.service';

describe('ToolCallLoggingInterceptor', () => {
  const toolCallLogger = {
    logExecutionResult: jest.fn().mockResolvedValue(undefined),
  } as unknown as ToolCallLoggerService;

  const interceptor = new ToolCallLoggingInterceptor(toolCallLogger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs successful internal tool executions', async () => {
    const request = {
      originalUrl: '/internal/tools/onboarding/faq',
      internalAgent: {
        agent: 'onboarding',
        userId: 'user-1',
        conversationId: 'conv-1',
        scope: ['read:onboarding'],
        jti: 'jti-1',
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
    const next = {
      handle: () => of({ ok: true }),
    } as CallHandler;

    await new Promise<void>((resolve, reject) => {
      interceptor.intercept(context, next).subscribe({
        next: (value) => {
          expect(value).toEqual({ ok: true });
        },
        error: reject,
        complete: resolve,
      });
    });

    expect(toolCallLogger.logExecutionResult).toHaveBeenCalledTimes(1);
    expect(toolCallLogger.logExecutionResult).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        responsePayload: { ok: true },
      }),
    );
  });

  it('logs failures after guard and rethrows the error', async () => {
    const request = {
      originalUrl: '/internal/tools/onboarding/faq',
      internalAgent: {
        agent: 'onboarding',
        userId: 'user-1',
        conversationId: 'conv-1',
        scope: ['read:onboarding'],
        jti: 'jti-1',
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
    const next = {
      handle: () =>
        throwError(
          () =>
            new ForbiddenException({
              code: 'FORBIDDEN',
              message: 'No access.',
            }),
        ),
    } as CallHandler;

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, next).subscribe({
        next: () => resolve(),
        error: (error) => {
          expect(error).toBeInstanceOf(ForbiddenException);
          resolve();
        },
      });
    });

    expect(toolCallLogger.logExecutionResult).toHaveBeenCalledTimes(1);
    expect(toolCallLogger.logExecutionResult).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        error: expect.any(ForbiddenException),
      }),
    );
  });

  it('ignores non internal-tool routes', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          originalUrl: '/auth/login',
        }),
      }),
    } as ExecutionContext;
    const next = {
      handle: () => of({ ok: true }),
    } as CallHandler;

    await new Promise<void>((resolve, reject) => {
      interceptor.intercept(context, next).subscribe({
        error: reject,
        complete: resolve,
      });
    });

    expect(toolCallLogger.logExecutionResult).not.toHaveBeenCalled();
  });
});
