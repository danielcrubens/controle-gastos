/** Categorias permitidas — fonte de verdade para o schema do Gemini e para o Notion. */
export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Compras',
  'Educação',
  'Serviços',
  'Outros',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (
    typeof value === 'string' &&
    (EXPENSE_CATEGORIES as readonly string[]).includes(value)
  );
}
