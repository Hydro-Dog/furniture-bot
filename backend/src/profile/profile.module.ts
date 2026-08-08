import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { PromptsModule } from '../prompts/prompts.module';
import { ProfileService } from './profile.service';

@Module({
  imports: [LlmModule, PromptsModule],
  providers: [ProfileService],
  exports: [ProfileService]
})
export class ProfileModule {}
