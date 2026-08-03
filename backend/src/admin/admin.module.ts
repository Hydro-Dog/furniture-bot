import { Module } from '@nestjs/common';
import { DialogsModule } from '../dialogs/dialogs.module';
import { LlmModule } from '../llm/llm.module';
import { PromptsModule } from '../prompts/prompts.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PromptDebugService } from './prompt-debug.service';

@Module({
  imports: [DialogsModule, LlmModule, PromptsModule],
  controllers: [AdminController],
  providers: [AdminService, PromptDebugService]
})
export class AdminModule {}
