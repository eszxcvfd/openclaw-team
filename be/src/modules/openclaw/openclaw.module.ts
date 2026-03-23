import { Module } from '@nestjs/common';

import { OpenclawService } from './openclaw.service';

@Module({
  providers: [OpenclawService],
  exports: [OpenclawService],
})
export class OpenclawModule {}
