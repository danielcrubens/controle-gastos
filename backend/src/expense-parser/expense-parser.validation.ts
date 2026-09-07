import { isExpenseCategory } from '../common/categories.js';
import { ParsedExpense } from './expense-parser.types.js';

export type ExpenseValidationFailure = 'unparseable' | 'missing_value';

export class ExpenseValidationError extends Error {
  constructor(
    readonly reason: ExpenseValidationFailure,
    message: string,
  ) {
    super(message);
    this.name = 'ExpenseValidationError';
  }
}

/**
 * Extrai o objeto JSON da resposta do Gemini de forma defensiva: aceita a
 * resposta limpa, cercada por ```json ou com texto ao redor (herdado do n8n,
 * mesmo com responseSchema o conteúdo pode vir com ruído).
 */
export function extractJsonObject(raw: string): unknown {
  const attempt = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };

  const direct = attempt(raw.trim());
  if (direct !== undefined) return direct;

  const cleaned = raw.replace(/```json|```/g, '').trim();
  const cleanedResult = attempt(cleaned);
  if (cleanedResult !== undefined) return cleanedResult;

  const bracesMatch = cleaned.match(/\{[\s\S]*\}/);
  if (bracesMatch) {
    const bracesResult = attempt(bracesMatch[0]);
    if (bracesResult !== undefined) return bracesResult;
  }

  throw new ExpenseValidationError(
    'unparseable',
    `Resposta do Gemini não é JSON válido: ${raw.slice(0, 200)}`,
  );
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Aceita 25, 25.5, "25", "25,50" — o schema pede NUMBER, mas o modelo às vezes responde string. */
function normalizeValor(rawValor: unknown): number | null {
  if (rawValor === null || rawValor === undefined) return null;

  let value: number | null = null;
  if (typeof rawValor === 'number' && Number.isFinite(rawValor)) {
    value = rawValor;
  } else if (typeof rawValor === 'string') {
    const parsed = Number.parseFloat(
      rawValor.replace(/\s/g, '').replace(',', '.'),
    );
    if (Number.isFinite(parsed)) value = parsed;
  }

  // 0, negativo ou não numérico = valor não identificado (o n8n rejeitava;
  // aqui vira pedido de confirmação ao usuário).
  if (value === null || value <= 0) return null;
  return value;
}

/**
 * Valida e normaliza o JSON retornado pelo Gemini contra as regras de produto:
 * - descrição vazia → erro 'unparseable' (não há o que gravar);
 * - categoria fora da lista → 'Outros';
 * - data ausente/inválida → data de referência (mensagem do Telegram);
 * - valor nulo/zero/inválido → erro 'missing_value' (bot pede o valor ao usuário).
 */
export function validateAndNormalizeExpense(
  raw: unknown,
  referenceDateISO: string,
): ParsedExpense {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ExpenseValidationError(
      'unparseable',
      'Resposta do Gemini não é um objeto',
    );
  }

  const record = raw as Record<string, unknown>;

  const descricao =
    typeof record.descricao === 'string'
      ? record.descricao.trim().replace(/\s+/g, ' ')
      : '';
  if (!descricao) {
    throw new ExpenseValidationError(
      'unparseable',
      'Descrição vazia na resposta do Gemini',
    );
  }
  const descricaoCapitalizada =
    descricao.charAt(0).toUpperCase() + descricao.slice(1);

  const categoria = isExpenseCategory(record.categoria)
    ? record.categoria
    : 'Outros';

  const data =
    typeof record.data === 'string' && isValidISODate(record.data)
      ? record.data
      : referenceDateISO;

  const valor = normalizeValor(record.valor);
  if (valor === null) {
    throw new ExpenseValidationError(
      'missing_value',
      'Valor não identificado na resposta do Gemini',
    );
  }

  return { descricao: descricaoCapitalizada, categoria, data, valor };
}

/** Pipeline completo: string bruta do Gemini → despesa normalizada. */
export function parseAndValidateExpense(
  raw: string,
  referenceDateISO: string,
): ParsedExpense {
  return validateAndNormalizeExpense(extractJsonObject(raw), referenceDateISO);
}
