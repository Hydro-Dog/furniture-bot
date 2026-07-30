import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ChatIntakeService } from './chat-intake.service';

@Module({
  imports: [LlmModule],
  providers: [ChatIntakeService],
  exports: [ChatIntakeService]
})
export class ChatIntakeModule {}

