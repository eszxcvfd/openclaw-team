import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { OnboardingInternalController } from './onboarding.internal.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [AuthModule],
  controllers: [OnboardingInternalController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
