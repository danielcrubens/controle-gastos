import { describe, expect, it } from 'vitest';
import { aggregateByCategory } from './aggregate.js';

describe('aggregateByCategory', () => {
  it('retorna relatorio vazio sem despesas', () => {
    expect(aggregateByCategory([])).toEqual({
      total: 0,
      quantidade: 0,
      porCategoria: [],
    });
  });

  it('agrupa por categoria e soma o total', () => {
    const report = aggregateByCategory([
      { valor: 25, categoria: 'Alimentação' },
      { valor: 12.5, categoria: 'Transporte' },
      { valor: 40, categoria: 'Alimentação' },
    ]);
    expect(report.total).toBe(77.5);
    expect(report.quantidade).toBe(3);
    expect(report.porCategoria).toEqual([
      { categoria: 'Alimentação', total: 65 },
      { categoria: 'Transporte', total: 12.5 },
    ]);
  });

  it('ordena categorias do maior para o menor gasto', () => {
    const report = aggregateByCategory([
      { valor: 10, categoria: 'Lazer' },
      { valor: 100, categoria: 'Moradia' },
      { valor: 50, categoria: 'Saúde' },
    ]);
    expect(report.porCategoria.map((c) => c.categoria)).toEqual([
      'Moradia',
      'Saúde',
      'Lazer',
    ]);
  });

  it('desempata alfabeticamente com valores iguais', () => {
    const report = aggregateByCategory([
      { valor: 10, categoria: 'Lazer' },
      { valor: 10, categoria: 'Alimentação' },
    ]);
    expect(report.porCategoria.map((c) => c.categoria)).toEqual([
      'Alimentação',
      'Lazer',
    ]);
  });

  it('trata valor nao numerico como zero', () => {
    const report = aggregateByCategory([
      { valor: Number.NaN, categoria: 'Outros' },
    ]);
    expect(report.total).toBe(0);
    expect(report.quantidade).toBe(1);
  });
});
