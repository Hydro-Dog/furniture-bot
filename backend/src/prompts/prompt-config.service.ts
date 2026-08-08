import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  CLIENT_PROFILE_PROMPT,
  FIRST_CONTACT_SYSTEM_PROMPT,
  PROMPT_REVIEW_PROMPT,
  SPECIFICATION_PROMPT,
  TECHNICAL_BRIEF_PROMPT
} from './prompt-samples';
import { AppPromptModel } from './app-prompt.model';
import {
  AppPromptEntity,
  AppPromptKey,
  AppPromptStepInfo,
  CLIENT_PROFILE_PROMPT_KEY,
  MAIN_CHAT_INTAKE_PROMPT_KEY,
  PROMPT_REVIEW_PROMPT_KEY,
  SPECIFICATION_PROMPT_KEY,
  TECHNICAL_BRIEF_PROMPT_KEY
} from './prompt.types';

export const APP_PROMPT_CATALOG: AppPromptStepInfo[] = [
  {
    key: MAIN_CHAT_INTAKE_PROMPT_KEY,
    title: 'Диалог первичного контакта',
    pipelineStep: '1. Чат с клиентом',
    usage: 'System prompt для ответа ассистента клиенту. Используется вместе с историей сообщений.',
    order: 10
  },
  {
    key: CLIENT_PROFILE_PROMPT_KEY,
    title: 'CRM-профиль клиента',
    pipelineStep: '2. Профайл',
    usage: 'System prompt для извлечения JSON-карточки и резюме из всего диалога.',
    order: 20
  },
  {
    key: TECHNICAL_BRIEF_PROMPT_KEY,
    title: 'Техническое ТЗ',
    pipelineStep: '3. ТЗ',
    usage: 'System prompt для формирования технического JSON по диалогу и профилю.',
    order: 30
  },
  {
    key: SPECIFICATION_PROMPT_KEY,
    title: 'Черновая спецификация',
    pipelineStep: '4. Спецификация',
    usage: 'System prompt для генерации строк спецификации по профилю и техническому ТЗ.',
    order: 40
  },
  {
    key: PROMPT_REVIEW_PROMPT_KEY,
    title: 'Анализ prompt’ов',
    pipelineStep: 'Debug. Prompt review',
    usage: 'System prompt админского debug-инструмента. Используется вместе с выбранными диалогами, структурой pipeline и текущими prompt’ами.',
    order: 90
  }
];

const DEFAULT_PROMPT_CONTENT: Record<AppPromptKey, string> = {
  [MAIN_CHAT_INTAKE_PROMPT_KEY]: FIRST_CONTACT_SYSTEM_PROMPT,
  [CLIENT_PROFILE_PROMPT_KEY]: CLIENT_PROFILE_PROMPT,
  [TECHNICAL_BRIEF_PROMPT_KEY]: TECHNICAL_BRIEF_PROMPT,
  [SPECIFICATION_PROMPT_KEY]: SPECIFICATION_PROMPT,
  [PROMPT_REVIEW_PROMPT_KEY]: PROMPT_REVIEW_PROMPT
};

const APP_PROMPT_BY_KEY = new Map(APP_PROMPT_CATALOG.map((item) => [item.key, item]));

@Injectable()
export class PromptConfigService {
  constructor(
    @InjectModel(AppPromptModel)
    private readonly appPromptModel: typeof AppPromptModel
  ) {}

  async getMainChatIntakePrompt(): Promise<AppPromptEntity> {
    return this.getPrompt(MAIN_CHAT_INTAKE_PROMPT_KEY);
  }

  async getMainChatIntakePromptContent(): Promise<string> {
    return this.getPromptContent(MAIN_CHAT_INTAKE_PROMPT_KEY);
  }

  async updateMainChatIntakePrompt(content: string, updatedBy: string | null): Promise<AppPromptEntity> {
    return this.updatePrompt(MAIN_CHAT_INTAKE_PROMPT_KEY, content, updatedBy);
  }

  async listPrompts(): Promise<AppPromptEntity[]> {
    const prompts = await Promise.all(
      APP_PROMPT_CATALOG
        .sort((left, right) => left.order - right.order)
        .map((item) => this.findOrCreatePrompt(item.key))
    );

    return prompts.map((prompt) => this.toEntity(prompt));
  }

  async getPrompt(key: AppPromptKey): Promise<AppPromptEntity> {
    const prompt = await this.findOrCreatePrompt(this.assertPromptKey(key));
    return this.toEntity(prompt);
  }

  async getPromptContent(key: AppPromptKey): Promise<string> {
    const prompt = await this.findOrCreatePrompt(this.assertPromptKey(key));
    return prompt.content;
  }

  async getClientProfilePromptContent(): Promise<string> {
    return this.getPromptContent(CLIENT_PROFILE_PROMPT_KEY);
  }

  async getTechnicalBriefPromptContent(): Promise<string> {
    return this.getPromptContent(TECHNICAL_BRIEF_PROMPT_KEY);
  }

  async getSpecificationPromptContent(): Promise<string> {
    return this.getPromptContent(SPECIFICATION_PROMPT_KEY);
  }

  async getPromptReviewPromptContent(): Promise<string> {
    return this.getPromptContent(PROMPT_REVIEW_PROMPT_KEY);
  }

  async updatePrompt(
    key: AppPromptKey,
    content: string,
    updatedBy: string | null
  ): Promise<AppPromptEntity> {
    const prompt = await this.findOrCreatePrompt(this.assertPromptKey(key));
    prompt.content = content.trim();
    prompt.updatedBy = updatedBy;
    await prompt.save();

    return this.toEntity(prompt);
  }

  private async findOrCreatePrompt(key: AppPromptKey): Promise<AppPromptModel> {
    const [prompt] = await this.appPromptModel.findOrCreate({
      where: { key },
      defaults: {
        key,
        content: DEFAULT_PROMPT_CONTENT[key],
        updatedBy: 'system'
      }
    });

    return prompt;
  }

  private assertPromptKey(key: string): AppPromptKey {
    if (!APP_PROMPT_BY_KEY.has(key as AppPromptKey)) {
      throw new BadRequestException(`Unknown prompt key: ${key}`);
    }

    return key as AppPromptKey;
  }

  private toEntity(prompt: AppPromptModel): AppPromptEntity {
    const metadata = APP_PROMPT_BY_KEY.get(prompt.key as AppPromptKey);

    return {
      key: prompt.key,
      title: metadata?.title,
      pipelineStep: metadata?.pipelineStep,
      usage: metadata?.usage,
      order: metadata?.order,
      content: prompt.content,
      updatedBy: prompt.updatedBy ?? null,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString()
    };
  }
}
