import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { OpenAiClientService } from '../llm/openai-client.service';
import type {
  DialogContext,
  SpecificationContext,
  SpecificationRow
} from '../dialogs/dialog.types';
import { PromptConfigService } from '../prompts/prompt-config.service';
import { parseAiJsonAndSummary } from '../workflow/json-extract.utils';

@Injectable()
export class SpecificationService {
  constructor(
    private readonly openAiClientService: OpenAiClientService,
    private readonly promptConfigService: PromptConfigService
  ) {}

  async generateSpecification(context: DialogContext): Promise<SpecificationContext> {
    const raw = await this.openAiClientService.createTextResponse({
      messages: [
        {
          role: 'system',
          content: await this.promptConfigService.getSpecificationPromptContent()
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
