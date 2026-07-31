import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { OpenAiClientService } from '../llm/openai-client.service';
import type {
  DialogContext,
  SpecificationContext,
  SpecificationRow
} from '../dialogs/dialog.types';
import { parseAiJsonAndSummary } from '../workflow/json-extract.utils';

export const SPECIFICATION_PROMPT = `
Ты — технолог корпусной мебели.
На основе профайла и технического ТЗ составь черновую спецификацию в формате JSON.
Не делай раскрой и не выдумывай точные детали, если данных мало. Лучше добавь укрупненные позиции.
Если в данных уже есть тип дверей, наполнение или особенности монтажа, включай их в черновую спецификацию отдельными строками.
Для шкафа в коридор с распашными дверями добавляй хотя бы базовые элементы: корпус, двери, штанга, полки, ящики, крепеж/фурнитура, отдельные позиции под особенности монтажа.
При недостатке данных можно оставлять укрупненные позиции, но нельзя игнорировать уже известные элементы.
Не добавляй конкретные элементы наполнения, если клиент их не называл, кроме минимально необходимого каркаса. Если известны коммуникации или доступ к ним, добавь отдельную строку/заметку в спецификацию как монтажное ограничение.
Если клиент не называл наполнение, не добавляй конкретные элементы хранения как будто они согласованы. Разрешен только минимальный каркас: корпус, фасады, базовая фурнитура, монтажные ограничения.
Дополнительные элементы помечай как optional или assumption в notes/source и снижай confidence.
Верни строго JSON без markdown:
{
  "rows": [
    {
      "section": "Корпус",
      "itemType": "panel",
      "name": "Боковина шкафа",
      "material": "ЛДСП 16 мм",
      "lengthMm": null,
      "widthMm": null,
      "thicknessMm": 16,
      "quantity": 1,
      "edgeBanding": null,
      "unit": "pcs",
      "notes": null,
      "source": "ai_draft",
      "confidence": 0.4
    }
  ]
}
`.trim();

@Injectable()
export class SpecificationService {
  constructor(private readonly openAiClientService: OpenAiClientService) {}

  async generateSpecification(context: DialogContext): Promise<SpecificationContext> {
    const raw = await this.openAiClientService.createTextResponse({
      messages: [
        {
          role: 'system',
          content: SPECIFICATION_PROMPT
        },
        {
          role: 'user',
          content: JSON.stringify({
            profile: context.profile?.json ?? context.profile?.raw ?? null,
            technicalBrief: context.technicalBrief?.json ?? context.technicalBrief?.raw ?? null
          })
        }
      ],
      temperature: 0.2,
      maxOutputTokens: 2200
    });

    const parsed = parseAiJsonAndSummary(raw).json;
    const rowsInput = Array.isArray(parsed?.rows) ? parsed.rows : [];

    return {
      rows: rowsInput.map((row) => this.normalizeRow(row)),
      raw,
      generatedAt: new Date().toISOString(),
      updatedAt: null
    };
  }

  normalizeRows(rows: SpecificationRow[]): SpecificationRow[] {
    return rows.map((row) => this.normalizeRow(row));
  }

  private normalizeRow(row: unknown): SpecificationRow {
    const data = typeof row === 'object' && row !== null
      ? row as Partial<SpecificationRow>
      : {};

    return {
      id: typeof data.id === 'string' && data.id ? data.id : randomUUID(),
      section: this.nullableString(data.section),
      itemType: this.nullableString(data.itemType),
      name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Позиция',
      material: this.nullableString(data.material),
      lengthMm: this.nullableNumber(data.lengthMm),
      widthMm: this.nullableNumber(data.widthMm),
      thicknessMm: this.nullableNumber(data.thicknessMm),
      quantity: typeof data.quantity === 'number' && Number.isFinite(data.quantity)
        ? Math.max(0, data.quantity)
        : 1,
      edgeBanding: this.nullableString(data.edgeBanding),
      unit: typeof data.unit === 'string' && data.unit.trim() ? data.unit.trim() : 'pcs',
      notes: this.nullableString(data.notes),
      source: this.nullableString(data.source) || 'manager',
      confidence: this.nullableNumber(data.confidence)
    };
  }

  private nullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private nullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  }
}
