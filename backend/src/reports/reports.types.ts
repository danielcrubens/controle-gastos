export interface CategoryTotal {
  categoria: string;
  total: number;
}

export interface MonthlyReport {
  total: number;
  quantidade: number;
  /** Ordenado por valor, maior primeiro. */
  porCategoria: CategoryTotal[];
}

export interface BudgetRuleResult {
  base: number;
  /** 70% — gastos fixos. */
  gastosFixos: number;
  /** 20% — investimentos. */
  investimentos: number;
  /** 10% — lazer (calculado como resíduo, para a soma fechar com a base). */
  lazer: number;
}
