import { describe, expect, it } from 'vitest';
import {
  ExpenseValidationError,
  extractJsonObject,
  parseAndValidateExpense,
  validateAndNormalizeExpense,
} from './expense-parser.validation.js';

const REF = '2026-09-03';

describe('extractJsonObject', () => {
  it('aceita JSON limpo', () => {
    const parsed = extractJsonObject('{"descricao":"almeo"}');
    expect(parsed).toEqual({ descricao: 'almeo' });
  });

  it('remove cercas de codigo ```json', () => {
    const raw = '```json\n{"descricao":"almeo","valor":25}\n```';
    const parsed = extractJsonObject(raw);
    expect(parsed).toEqual({ descricao: 'almeo', valor: 25 });
  });

  it('extrai JSON cercado de texto', () => {
    const raw = 'Aqui esta: {"descricao":"uber","valor":20} fim';
    const parsed = extractJsonObject(raw);
    expect(parsed).toEqual({ descricao: 'uber', valor: 20 });
  });

  it('lancar unparseable para texto sem JSON', () => {
    expect(() => extractJsonObject('sem json aqui')).toThrowError(
      ExpenseValidationError,
    );
  });
});

describe('validateAndNormalizeExpense', () => {
  it('normaliza despesa valida', () => {
    const input = {
      descricao: 'almoco restaurante',
      categoria: 'Alimentação',
      data: '2026-09-01',
      valor: 25.5,
    };
    const expense = validateAndNormalizeExpense(input, REF);
    expect(expense).toEqual({
      descricao: 'Almoco restaurante',
      categoria: 'Alimentação',
      data: '2026-09-01',
      valor: 25.5,
    });
  });

  it('capitaliza e colapsa espacos da descricao', () => {
    const input = {
      descricao: '  uber   trabalho  ',
      categoria: 'Outros',
      data: '2026-09-01',
      valor: 12,
    };
    const expense = validateAndNormalizeExpense(input, REF);
    expect(expense.descricao).toBe('Uber trabalho');
  });

  it('lancar unparseable com descricao vazia', () => {
    const input = {
      descricao: '   ',
      categoria: 'Outros',
      data: '2026-09-01',
      valor: 10,
    };
    expect(() => validateAndNormalizeExpense(input, REF)).toThrowError(
      ExpenseValidationError,
    );
  });

  it('fallback para Outros com categoria fora da lista', () => {
    const input = {
      descricao: 'corte',
      categoria: 'Beleza',
      data: '2026-09-01',
      valor: 35,
    };
    const expense = validateAndNormalizeExpense(input, REF);
    expect(expense.categoria).toBe('Outros');
  });

  it('mantem Despesa Fixa sem cair no fallback', () => {
    const input = {
      descricao: 'aluguel apartamento',
      categoria: 'Despesa Fixa',
      data: '2026-09-01',
      valor: 1200,
    };
    const expense = validateAndNormalizeExpense(input, REF);
    expect(expense.categoria).toBe('Despesa Fixa');
  });

  it('usa a data de referencia quando a data vem invalida', () => {
    const input = {
      descricao: 'cinema',
      categoria: 'Lazer',
      data: '2026-13-40',
      valor: 30,
    };
    const expense = validateAndNormalizeExpense(input, REF);
    expect(expense.data).toBe(REF);
  });

  it('usa a data de referencia quando a data nao vem', () => {
    const input = { descricao: 'cinema', categoria: 'Lazer', valor: 30 };
    const expense = validateAndNormalizeExpense(input, REF);
    expect(expense.data).toBe(REF);
  });

  it('rejeita datas irreais mesmo com formato valido', () => {
    const input = {
      descricao: 'x',
      categoria: 'Outros',
      data: '2026-02-30',
      valor: 9,
    };
    const expense = validateAndNormalizeExpense(input, REF);
    expect(expense.data).toBe(REF);
  });
});

describe('valor', () => {
  const base = {
    descricao: 'livro',
    categoria: 'Educação',
    data: '2026-09-01',
  };

  it('aceita numero positivo', () => {
    const expense = validateAndNormalizeExpense({ ...base, valor: 45 }, REF);
    expect(expense.valor).toBe(45);
  });

  it('coage string numerica com virgula', () => {
    const expense = validateAndNormalizeExpense(
      { ...base, valor: '25,50' },
      REF,
    );
    expect(expense.valor).toBe(25.5);
  });

  it('valor null lanca missing_value', () => {
    const action = () =>
      validateAndNormalizeExpense({ ...base, valor: null }, REF);
    expect(action).toThrowError(
      expect.objectContaining({ reason: 'missing_value' }),
    );
  });

  it('valor 0 lanca missing_value', () => {
    const action = () =>
      validateAndNormalizeExpense({ ...base, valor: 0 }, REF);
    expect(action).toThrowError(
      expect.objectContaining({ reason: 'missing_value' }),
    );
  });

  it('valor negativo lanca missing_value', () => {
    const action = () =>
      validateAndNormalizeExpense({ ...base, valor: -5 }, REF);
    expect(action).toThrowError(
      expect.objectContaining({ reason: 'missing_value' }),
    );
  });

  it('valor ausente lanca missing_value', () => {
    const action = () => validateAndNormalizeExpense(base, REF);
    expect(action).toThrowError(
      expect.objectContaining({ reason: 'missing_value' }),
    );
  });

  it('pipeline completo: resposta cercada + sem valor resulta missing_value', () => {
    const raw =
      '```json\n{"descricao":"corte","categoria":"Outros","data":"2026-09-01","valor":null}\n```';
    const action = () => parseAndValidateExpense(raw, REF);
    expect(action).toThrowError(ExpenseValidationError);
  });
});
