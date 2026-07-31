import { Injectable } from '@nestjs/common';
import { OpenAiClientService } from '../llm/openai-client.service';
import type { DialogContext, TechnicalBriefContext } from '../dialogs/dialog.types';
import { parseAiJsonAndSummary } from '../workflow/json-extract.utils';

export const TECHNICAL_BRIEF_PROMPT = `
Ты — бот-дизайнер/технолог салона корпусной мебели.
На входе есть диалог и первичный профайл клиента.
Составь техническое ТЗ для менеджера и дизайнера. Не выдумывай точные материалы, если их нет во вводных.
При составлении ТЗ обязательно извлекай конкретику из диалога, даже если профиль заполнен не полностью.
Переноси в JSON все явно названные параметры: размеры, тип дверей, особенности стен, щиток, роутер, коммуникации, цвет, сроки.
Не заменяй конкретные данные общими фразами и не оставляй поля пустыми, если нужная информация есть в истории сообщений.
Если в диалоге упомянуты трубы, провода, щиток, роутер, счетчики или необходимость доступа к ним, обязательно перенеси это в appliances_or_communications и/или installation_constraints. Не оставляй эти поля пустыми, если ограничение явно названо.
Если упомянуты трубы, провода, щиток, роутер, счетчики или иные коммуникации, формулируй это как проектное ограничение: что нельзя перекрывать, где нужен доступ, что требуется обойти. Не ограничивайся простым перечислением объекта.
Верни строго JSON без markdown:
{
  "product_type": null,
  "room": null,
  "dimensions": null,
  "functional_requirements": [],
  "materials_preferences": [],
  "appliances_or_communications": [],
  "installation_constraints": [],
  "questions_for_manager": [],
  "assumptions": [],
  "readiness": "draft"
}
`.trim();

@Injectable()
export class TechnicalBriefService {
  constructor(private readonly openAiClientService: OpenAiClientService) {}

  async buildTechnicalBrief(context: DialogContext): Promise<TechnicalBriefContext> {
    const raw = await this.openAiClientService.createTextResponse({
      messages: [
        {
          role: 'system',
          content: TECHNICAL_BRIEF_PROMPT
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
      maxOutputTokens: 1600
    });

    return {
      json: parseAiJsonAndSummary(raw).json,
      raw,
      generatedAt: new Date().toISOString()
    };
  }
}
