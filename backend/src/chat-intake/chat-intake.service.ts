import { Injectable } from '@nestjs/common';
import { OpenAiClientService } from '../llm/openai-client.service';
import type { ChatMessage } from '../dialogs/dialog.types';
import { FIRST_CONTACT_SYSTEM_PROMPT } from './prompts';

@Injectable()
export class ChatIntakeService {
  constructor(private readonly openAiClientService: OpenAiClientService) {}

  async reply(messages: ChatMessage[]): Promise<string> {
    return this.openAiClientService.createTextResponse({
      messages: [
        {
          role: 'system',
          content: FIRST_CONTACT_SYSTEM_PROMPT
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
