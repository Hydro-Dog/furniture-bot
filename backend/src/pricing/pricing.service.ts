import { Injectable } from '@nestjs/common';
import type { EstimateContext, SpecificationRow } from '../dialogs/dialog.types';

const DEFAULT_RATES: Record<string, number> = {
  service: 5000,
  measurement: 1500,
  delivery: 2500
};

@Injectable()
export class PricingService {
  calculate(rows: SpecificationRow[]): EstimateContext {
    const lines = rows.map((row) => {
      const unitPrice = this.resolveUnitPrice(row);
      const total = unitPrice === null ? null : Math.round(unitPrice * row.quantity);

      return {
        rowId: row.id,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        unitPrice,
        total,
        status: unitPrice === null ? 'needs_price' as const : 'priced' as const
      };
    });
    const subtotal = lines.reduce((sum, line) => sum + (line.total ?? 0), 0);
    const missingPrices = lines
      .filter((line) => line.status === 'needs_price')
      .map((line) => line.name);

    return {
      currency: 'RUB',
      subtotal,
      total: subtotal,
      isComplete: missingPrices.length === 0,
      lines,
      missingPrices,
      calculatedAt: new Date().toISOString(),
      notes: missingPrices.length
        ? ['Предварительный расчет неполный: часть позиций требует реального прайса.']
        : ['Предварительный расчет выполнен по PoC-ставкам.']
    };
  }

  private resolveUnitPrice(row: SpecificationRow): number | null {
    const key = (row.itemType || '').toLowerCase();
    return DEFAULT_RATES[key] ?? null;
  }
}

