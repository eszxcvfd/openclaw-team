import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { map, Observable } from 'rxjs';

import { resolveTraceId } from '../utils/trace-id';

@Injectable()
export class SuccessResponseInterceptor<T>
  implements NestInterceptor<T, { success: true; data: T; meta: { traceId: string } }>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<{ success: true; data: T; meta: { traceId: string } }> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const traceId = resolveTraceId(request, response);

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        meta: {
          traceId,
        },
      })),
    );
  }
}
