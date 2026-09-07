import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRecord } from '../auth/auth.types.js';
import {
  currentMonthRange,
  formatBRL,
  previousMonthRange,
} from '../common/format.js';
import { getAppConfig } from '../config/configuration.js';
import { NotionService } from '../notion/notion.service.js';
import { BudgetRuleService } from './budget-rule.service.js';
import { aggregateByCategory } from './aggregate.js';
import { BudgetRuleResult } from './reports.types.js';

const CATEGORY_EMOJI: Record<string, string> = {
  Alimentação: '🍔',
  Transporte: '🚗',
  Moradia: '🏠',
  Saúde: '💊',
  Lazer: '🎮',
  Compras: '🛍️',
  Educação: '📚',
  Serviços: '🧰',
  Outros: '📦',
};

@Injectable()
export class ReportsService {
  private readonly timezone: string;

  constructor(
    private readonly notion: NotionService,
    private readonly budgetRule: BudgetRuleService,
    configService: ConfigService,
  ) {
    this.timezone = getAppConfig(configService).timezone;
  }

  async monthlySummaryMessage(
    user: UserRecord,
    period: 'current' | 'previous',
  ): Promise<string> {
    const range =
      period === 'current'
        ? currentMonthRange(this.timezone)
        : previousMonthRange(this.timezone);

    const report = aggregateByCategory(
      await this.notion.listExpensesBetween(user, range.start, range.end),
    );

    if (report.quantidade === 0) {
      return (
        `📊 *Resumo de ${range.label}*\n\n` +
        `❌ Ainda não há resumo por aqui.\n\n` +
        `_Você não registrou nenhuma despesa neste período._`
      );
    }

    let mensagem = `📊 *Resumo de ${range.label}*\n\n`;
    for (const { categoria, total } of report.porCategoria) {
      const emoji = CATEGORY_EMOJI[categoria] ?? '📦';
      mensagem += `${emoji} ${categoria}: ${formatBRL(total)}\n`;
    }
    mensagem +=
      `\n💰 *TOTAL: ${formatBRL(report.total)}*\n` +
      `📝 _${report.quantidade} despesa${report.quantidade !== 1 ? 's' : ''} registrada${report.quantidade !== 1 ? 's' : ''}_`;

    return mensagem;
  }

  /** /regra — paridade com o n8n: exige o valor como argumento. */
  budgetRuleMessage(rawArgument: string | undefined): string {
    if (!rawArgument?.trim()) {
      return `❌ *Formato inválido!*\n\nUse: \`/regra [valor]\`\nExemplo: \`/regra 5000\``;
    }

    const base = this.budgetRule.parseBaseArgument(rawArgument);
    if (base === null) {
      return `❌ *Valor inválido!*\n\nPor favor, informe um valor numérico positivo.`;
    }

    return this.formatBudgetRule(this.budgetRule.calculate(base));
  }

  private formatBudgetRule(result: BudgetRuleResult): string {
    return (
      `💰 *Regra 70/20/10 - Planejamento Financeiro*\n\n` +
      `📊 Base informada: ${formatBRL(result.base)}\n\n` +
      `🏠 *Gastos Fixos (70%)*\n${formatBRL(result.gastosFixos)}\n\n` +
      `📈 *Investimentos (20%)*\n${formatBRL(result.investimentos)}\n\n` +
      `🎉 *Lazer (10%)*\n${formatBRL(result.lazer)}\n\n` +
      `💡 *Dica:* Esta é uma sugestão de distribuição. Adapte conforme sua realidade!`
    );
  }
}
