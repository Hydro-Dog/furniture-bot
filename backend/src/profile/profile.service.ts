import { Injectable } from '@nestjs/common';
import { OpenAiClientService } from '../llm/openai-client.service';
import type { ChatMessage, ProfileContext } from '../dialogs/dialog.types';
import { CLIENT_PROFILE_PROMPT } from '../chat-intake/prompts';
import { parseAiJsonAndSummary } from '../workflow/json-extract.utils';

@Injectable()
export class ProfileService {
  constructor(private readonly openAiClientService: OpenAiClientService) {}

  async buildProfile(messages: ChatMessage[]): Promise<ProfileContext> {
    const transcript = messages
      .map((message) => `${message.role === 'user' ? 'Клиент' : 'Ассистент'}: ${message.content}`)
      .join('\n\n');

    const raw = await this.openAiClientService.createTextResponse({
      messages: [
        {
          role: 'system',
          content: CLIENT_PROFILE_PROMPT
        },
        {
          role: 'user',
          content: `Диалог:\n\n${transcript}`
        }
      ],
      temperature: 0.2,
      maxOutputTokens: 1800
    });

    const parsed = parseAiJsonAndSummary(raw);

    return {
      json: parsed.json,
      summary: parsed.summary,
      raw,
      generatedAt: new Date().toISOString()
    };
  }
}
