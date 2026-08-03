import { Injectable } from '@nestjs/common';
import { OpenAiClientService } from '../llm/openai-client.service';
import type { ChatMessage } from '../dialogs/dialog.types';
import { PromptConfigService } from '../prompts/prompt-config.service';

@Injectable()
export class ChatIntakeService {
  constructor(
    private readonly openAiClientService: OpenAiClientService,
    private readonly promptConfigService: PromptConfigService
  ) {}

  async reply(messages: ChatMessage[]): Promise<string> {
    const mainPrompt = await this.promptConfigService.getMainChatIntakePromptContent();

    return this.openAiClientService.createTextResponse({
      messages: [
        {
          role: 'system',
          content: mainPrompt
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ],
      temperature: 0.7,
      maxOutputTokens: 700
    });
  }
}
