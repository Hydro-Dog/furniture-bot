import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { TechnicalBriefService } from './technical-brief.service';

@Module({
  imports: [LlmModule],
  providers: [TechnicalBriefService],
  exports: [TechnicalBriefService]
})
export class TechnicalBriefModule {}

