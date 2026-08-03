import { BadRequestException, Injectable } from '@nestjs/common';
import { CLIENT_PROFILE_PROMPT } from '../chat-intake/prompts';
import { DialogsService } from '../dialogs/dialogs.service';
import { OpenAiClientService } from '../llm/openai-client.service';
import { PromptConfigService } from '../prompts/prompt-config.service';
import { SPECIFICATION_PROMPT } from '../specification/specification.service';
import { TECHNICAL_BRIEF_PROMPT } from '../technical-brief/technical-brief.service';
import { parseAiJsonAndSummary } from '../workflow/json-extract.utils';

const PROMPT_REVIEW_SYSTEM_PROMPT = `
Ты — senior prompt engineer и аналитик качества диалоговых ИИ-ботов.
Тебе передают реальные диалоги клиентов с мебельным ботом, структуру pipeline и исходные prompt'ы разных этапов.

Задача:
1. Найти повторяющиеся проблемы в поведении бота на основе диалогов.
2. Связать каждую проблему с конкретным prompt'ом или этапом.
3. Предложить точечные изменения prompt'ов.
4. Не предлагать переписывать всё целиком, если достаточно небольшой правки.
5. Отделять наблюдения по данным от гипотез.

Верни строго JSON без markdown:
{
  "summary": "краткий вывод по качеству",
  "suggestions": [
    {
      "id": "short-id",
      "targetPrompt": "chat_intake | client_profile | technical_brief | specification | workflow",
      "severity": "low | medium | high",
      "problem": "какая проблема видна в диалогах",
      "evidence": ["короткие ссылки на конкретные диалоги/фразы без длинных цитат"],
      "recommendation": "что изменить в prompt'е",
      "proposedPromptPatch": "готовый фрагмент текста для добавления или замены",
      "expectedEffect": "какое поведение должно улучшиться"
    }
  ],
  "nonPromptIssues": [
    {
      "area": "workflow | ui | pricing | data",
      "issue": "что не лечится prompt'ом"
    }
  ]
}
`.trim();

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
          content: PROMPT_REVIEW_SYSTEM_PROMPT
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
              client_profile: CLIENT_PROFILE_PROMPT,
              technical_brief: TECHNICAL_BRIEF_PROMPT,
              specification: SPECIFICATION_PROMPT
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
