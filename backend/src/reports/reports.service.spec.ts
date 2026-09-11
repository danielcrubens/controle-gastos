import { describe, expect, it } from 'vitest';
import { formatMonthlySummary } from './reports.service.js';

describe('formatMonthlySummary', () => {
  it('mostra barra e porcentagem por categoria', () => {
    const mensagem = formatMonthlySummary({
      total: 120,
      quantidade: 2,
      porCategoria: [
        { categoria: 'Transporte', total: 100 },
        { categoria: 'Alimentação', total: 20 },
      ],
    });

    // 83% de 20 blocos = 17 cheios; 17% = 3 cheios
    expect(mensagem).toContain('🚗 Transporte: █████████████████░░░ 83%');
    expect(mensagem).toContain('🍔 Alimentação: ███░░░░░░░░░░░░░░░░░ 17%');
    expect(mensagem).toContain('100,00');
    expect(mensagem).toContain('20,00');
  });

  it('categoria unica ocupa a barra inteira com 100%', () => {
    const mensagem = formatMonthlySummary({
      total: 50,
      quantidade: 1,
      porCategoria: [{ categoria: 'Lazer', total: 50 }],
    });

    expect(mensagem).toContain('🎮 Lazer: ████████████████████ 100%');
  });

  it('fatia pequena mostra <1% e ao menos um bloco', () => {
    const mensagem = formatMonthlySummary({
      total: 1000,
      quantidade: 2,
      porCategoria: [
        { categoria: 'Moradia', total: 999 },
        { categoria: 'Saúde', total: 1 },
      ],
    });

    expect(mensagem).toContain('<1%');
    expect(mensagem).toContain('█░░░░░░░░░░░░░░░░░░░');
  });

  it('mantem total e contagem de despesas', () => {
    const mensagem = formatMonthlySummary({
      total: 120,
      quantidade: 2,
      porCategoria: [{ categoria: 'Transporte', total: 120 }],
    });

    expect(mensagem).toContain('TOTAL');
    expect(mensagem).toContain('120,00');
    expect(mensagem).toContain('2 despesas registradas');
  });
});
