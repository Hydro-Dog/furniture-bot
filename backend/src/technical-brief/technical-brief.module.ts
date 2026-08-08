import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { PromptsModule } from '../prompts/prompts.module';
import { TechnicalBriefService } from './technical-brief.service';

@Module({
  imports: [LlmModule, PromptsModule],
  providers: [TechnicalBriefService],
  exports: [TechnicalBriefService]
})
export class TechnicalBriefModule {}
