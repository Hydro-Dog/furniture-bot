import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { PromptsModule } from '../prompts/prompts.module';
import { SpecificationService } from './specification.service';

@Module({
  imports: [LlmModule, PromptsModule],
  providers: [SpecificationService],
  exports: [SpecificationService]
})
export class SpecificationModule {}
