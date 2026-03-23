import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, from, mergeMap, throwError } from 'rxjs';

import { InternalToolRequest } from './tool-call-log.types';
import { ToolCallLoggerService } from './tool-call-logger.service';

@Injectable()
export class ToolCallLoggingInterceptor implements NestInterceptor {
  constructor(private readonly toolCallLogger: ToolCallLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<InternalToolRequest>();

    if (!this.isInternalToolRequest(request)) {
      return next.handle();
    }

    const startedAt = new Date();

    return next.handle().pipe(
      mergeMap((data) =>
        from(
          this.toolCallLogger.logExecutionResult({
            request,
            responsePayload: data,
            startedAt,
            verifiedPayload: request.internalAgent,
          }),
        ).pipe(mergeMap(() => [data])),
      ),
      catchError((error: unknown) =>
        from(
          this.toolCallLogger.logExecutionResult({
            request,
            error,
            startedAt,
            verifiedPayload: request.internalAgent,
          }),
        ).pipe(mergeMap(() => throwError(() => error))),
      ),
    );
  }

  private isInternalToolRequest(request: InternalToolRequest) {
    const route = request.originalUrl ?? request.url ?? '';

    return (
      route.startsWith('/internal/tools/') ||
      route.startsWith('/api/quiz/submit') ||
      /\/api\/quiz\/[^/]+\/result(?:\?|$)/.test(route)
    );
  }
}
