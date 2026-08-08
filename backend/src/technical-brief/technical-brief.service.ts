import { Injectable } from '@nestjs/common';
import { OpenAiClientService } from '../llm/openai-client.service';
import type { DialogContext, TechnicalBriefContext } from '../dialogs/dialog.types';
import { PromptConfigService } from '../prompts/prompt-config.service';
import { parseAiJsonAndSummary } from '../workflow/json-extract.utils';

@Injectable()
export class TechnicalBriefService {
  constructor(
    private readonly openAiClientService: OpenAiClientService,
    private readonly promptConfigService: PromptConfigService
  ) {}

  async buildTechnicalBrief(context: DialogContext): Promise<TechnicalBriefContext> {
    const raw = await this.openAiClientService.createTextResponse({
      messages: [
        {
          role: 'system',
          content: await this.promptConfigService.getTechnicalBriefPromptContent()
        },
        {
          role: 'user',
          content: JSON.stringify({
            messages: context.messages,
            profile: context.profile?.json ?? context.profile?.raw ?? null
          })
        }
      ],
      temperature: 0.2,
      maxOutputTokens: 2200
    });

    return {
      json: parseAiJsonAndSummary(raw).json,
      raw,
      generatedAt: new Date().toISOString()
    };
  }
}
