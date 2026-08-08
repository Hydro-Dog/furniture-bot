import { BadRequestException, Injectable } from '@nestjs/common';
import { DialogsService } from '../dialogs/dialogs.service';
import { OpenAiClientService } from '../llm/openai-client.service';
import { PromptConfigService } from '../prompts/prompt-config.service';
import { parseAiJsonAndSummary } from '../workflow/json-extract.utils';

@Injectable()
export class PromptDebugService {
  constructor(
    private readonly dialogsService: DialogsService,
    private readonly openAiClientService: OpenAiClientService,
    private readonly promptConfigService: PromptConfigService
  ) {}

  async reviewPrompts(dialogIds: string[]) {
    const dialogs = await this.dialogsService.getByIds(dialogIds);
    if (dialogs.length === 0) {
      throw new BadRequestException('No selected dialogs were found');
    }

    const raw = await this.openAiClientService.createTextResponse({
      messages: [
        {
          role: 'system',
          content: await this.promptConfigService.getPromptReviewPromptContent()
        },
        {
          role: 'user',
          content: JSON.stringify({
            pipeline: {
              description:
                'CRM pipeline для салона корпусной мебели. Клиент общается с chat_intake. Затем profile собирает CRM-профайл, technical_brief делает технологическое ТЗ, specification генерирует черновую таблицу спецификации, pricing считает предварительную цену кодом.',
              stages: [
                {
                  key: 'chat_intake',
                  purpose: 'первичный клиентский диалог, сбор вводных, один вопрос за раз'
                },
                {
                  key: 'client_profile',
                  purpose: 'суммаризация диалога в CRM JSON и резюме менеджеру'
                },
                {
                  key: 'technical_brief',
                  purpose: 'перевод профайла в техническое ТЗ для дизайнера/технолога'
                },
                {
                  key: 'specification',
                  purpose: 'черновая спецификация в табличном формате'
                },
                {
                  key: 'pricing',
                  purpose: 'детерминированный прайс-движок, prompt не управляет ценой'
                }
              ]
            },
            prompts: {
              chat_intake: await this.promptConfigService.getMainChatIntakePromptContent(),
              client_profile: await this.promptConfigService.getClientProfilePromptContent(),
              technical_brief: await this.promptConfigService.getTechnicalBriefPromptContent(),
              specification: await this.promptConfigService.getSpecificationPromptContent()
            },
            dialogs: dialogs.map((dialog) => ({
              id: dialog.id,
              status: dialog.status,
              currentStep: dialog.currentStep,
              createdAt: dialog.createdAt,
              updatedAt: dialog.updatedAt,
              context: dialog.context
            }))
          })
        }
      ],
      temperature: 0.2,
      maxOutputTokens: 3000
    });
    const parsed = parseAiJsonAndSummary(raw);

    return {
      dialogCount: dialogs.length,
      promptKeys: ['chat_intake', 'client_profile', 'technical_brief', 'specification'],
      result: parsed.json,
      raw,
      generatedAt: new Date().toISOString()
    };
  }
}
