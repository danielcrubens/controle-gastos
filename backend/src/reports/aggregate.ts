import { NotionExpenseRow } from '../notion/notion.service.js';
import { CategoryTotal, MonthlyReport } from './reports.types.js';

/** Agrupa despesas por categoria, soma o total e ordena do maior para o menor. */
export function aggregateByCategory(rows: NotionExpenseRow[]): MonthlyReport {
  const totals = new Map<string, number>();
  let total = 0;

  for (const row of rows) {
    const valor = Number.isFinite(row.valor) ? row.valor : 0;
    total += valor;
    totals.set(row.categoria, (totals.get(row.categoria) ?? 0) + valor);
  }

  const porCategoria: CategoryTotal[] = [...totals.entries()]
    .map(([categoria, catTotal]) => ({ categoria, total: catTotal }))
    .sort(
      (a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria),
    );

  return { total, quantidade: rows.length, porCategoria };
}
