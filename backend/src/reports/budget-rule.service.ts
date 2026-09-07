import { Injectable } from '@nestjs/common';
import { BudgetRuleResult } from './reports.types.js';

// Normaliza -0 para 0 (Math.round de resíduos negativos produz -0).
const round2 = (value: number): number => Math.round(value * 100) / 100 || 0;

@Injectable()
export class BudgetRuleService {
  /**
   * Regra 70/20/10 sobre uma base (salário informado). O lazer é o resíduo
   * das outras duas fatias para a soma fechar em centavos com a base.
   */
  calculate(base: number): BudgetRuleResult {
    const gastosFixos = round2(base * 0.7);
    const investimentos = round2(base * 0.2);
    const lazer = round2(base - gastosFixos - investimentos);
    return { base, gastosFixos, investimentos, lazer };
  }

  /**
   * Converte o argumento do /regra para número. Aceita pt-BR: "5000",
   * "5.000", "1.234,56", "5000,50", "R$ 2.500,00". Retorna null quando não
   * há valor positivo válido (comando sem argumento ou lixo).
   */
  parseBaseArgument(raw: string | undefined): number | null {
    if (!raw) return null;

    const cleaned = raw
      .trim()
      .replace(/^R\$\s*/i, '')
      .replace(/\s/g, '');
    if (!cleaned) return null;

    let normalized: string;
    if (cleaned.includes(',')) {
      // Vírgula é decimal; ponto é milhar (padrão pt-BR): "1.234,56" → 1234.56
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      // Só pontos em grupos de 3: "5.000" / "1.234.567" → milhar
      normalized = cleaned.replace(/\./g, '');
    } else {
      // "5000", "5000.50" — ponto como decimal (ou lixo que o parseFloat rejeita)
      normalized = cleaned;
    }

    const value = Number.parseFloat(normalized);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  }
}
