import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { PromptsModule } from '../prompts/prompts.module';
import { ChatIntakeService } from './chat-intake.service';

@Module({
  imports: [LlmModule, PromptsModule],
  providers: [ChatIntakeService],
  exports: [ChatIntakeService]
})
export class ChatIntakeModule {}
