import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AnalyticsInternalController } from './analytics.internal.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsInternalController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
