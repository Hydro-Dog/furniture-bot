import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { SpecificationService } from './specification.service';

@Module({
  imports: [LlmModule],
  providers: [SpecificationService],
  exports: [SpecificationService]
})
export class SpecificationModule {}

