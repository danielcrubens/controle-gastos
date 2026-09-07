import { ExpenseCategory } from '../common/categories.js';

export interface ParsedExpense {
  /** 2–5 palavras, inicial maiúscula (regra herdada do n8n). */
  descricao: string;
  /** Fora da lista permitida → 'Outros' (nunca rejeita a despesa por causa de categoria). */
  categoria: ExpenseCategory;
  /** 'YYYY-MM-DD'; "hoje"/"ontem" resolvidos contra a data da mensagem. */
  data: string;
  /** Sempre > 0: valor ausente/zero/negativo lança missing_value na validação. */
  valor: number;
}
