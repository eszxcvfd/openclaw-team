import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TrainingController } from './training.controller';
import { TrainingInternalController } from './training.internal.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [AuthModule],
  controllers: [TrainingInternalController, TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
