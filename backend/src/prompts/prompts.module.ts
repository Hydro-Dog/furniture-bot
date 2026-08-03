import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppPromptModel } from './app-prompt.model';
import { PromptConfigService } from './prompt-config.service';

@Module({
  imports: [SequelizeModule.forFeature([AppPromptModel])],
  providers: [PromptConfigService],
  exports: [PromptConfigService]
})
export class PromptsModule {}
