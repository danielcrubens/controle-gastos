import { describe, expect, it } from 'vitest';
import { EXPENSE_CATEGORIES, isExpenseCategory } from './categories.js';

describe('EXPENSE_CATEGORIES', () => {
  it('inclui Despesa Fixa na lista', () => {
    expect(EXPENSE_CATEGORIES).toContain('Despesa Fixa');
  });

  it('nao possui categorias duplicadas', () => {
    expect(new Set(EXPENSE_CATEGORIES).size).toBe(EXPENSE_CATEGORIES.length);
  });
});

describe('isExpenseCategory', () => {
  it('aceita Despesa Fixa', () => {
    expect(isExpenseCategory('Despesa Fixa')).toBe(true);
  });

  it('aceita as demais categorias conhecidas', () => {
    for (const categoria of EXPENSE_CATEGORIES) {
      expect(isExpenseCategory(categoria)).toBe(true);
    }
  });

  it('rejeita categoria fora da lista', () => {
    expect(isExpenseCategory('Beleza')).toBe(false);
  });

  it('rejeita valores nao string', () => {
    expect(isExpenseCategory(null)).toBe(false);
    expect(isExpenseCategory(42)).toBe(false);
  });
});
