import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FIRST_CONTACT_SYSTEM_PROMPT } from '../chat-intake/prompts';
import { AppPromptModel } from './app-prompt.model';
import { AppPromptEntity, MAIN_CHAT_INTAKE_PROMPT_KEY } from './prompt.types';

@Injectable()
export class PromptConfigService {
  constructor(
    @InjectModel(AppPromptModel)
    private readonly appPromptModel: typeof AppPromptModel
  ) {}

  async getMainChatIntakePrompt(): Promise<AppPromptEntity> {
    const prompt = await this.findOrCreateMainPrompt();
    return this.toEntity(prompt);
  }

  async getMainChatIntakePromptContent(): Promise<string> {
    const prompt = await this.findOrCreateMainPrompt();
    return prompt.content;
  }

  async updateMainChatIntakePrompt(content: string, updatedBy: string | null): Promise<AppPromptEntity> {
    const prompt = await this.findOrCreateMainPrompt();
    prompt.content = content.trim();
    prompt.updatedBy = updatedBy;
    await prompt.save();

    return this.toEntity(prompt);
  }

  private async findOrCreateMainPrompt(): Promise<AppPromptModel> {
    const [prompt] = await this.appPromptModel.findOrCreate({
      where: { key: MAIN_CHAT_INTAKE_PROMPT_KEY },
      defaults: {
        key: MAIN_CHAT_INTAKE_PROMPT_KEY,
        content: FIRST_CONTACT_SYSTEM_PROMPT,
        updatedBy: 'system'
      }
    });

    return prompt;
  }

  private toEntity(prompt: AppPromptModel): AppPromptEntity {
    return {
      key: prompt.key,
      content: prompt.content,
      updatedBy: prompt.updatedBy ?? null,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString()
    };
  }
}
