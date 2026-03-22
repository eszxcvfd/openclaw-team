import { Module } from '@nestjs/common';

import { ToolCallLoggingInterceptor } from './tool-call-logging.interceptor';
import { ToolCallLoggerService } from './tool-call-logger.service';
import { ToolCallLogMetadataResolver } from './tool-call-log-metadata.resolver';

@Module({
  providers: [
    ToolCallLogMetadataResolver,
    ToolCallLoggerService,
    ToolCallLoggingInterceptor,
  ],
  exports: [
    ToolCallLogMetadataResolver,
    ToolCallLoggerService,
    ToolCallLoggingInterceptor,
  ],
})
export class ToolGatewayModule {}
