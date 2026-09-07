import { describe, expect, it } from 'vitest';
import {
  currentMonthRange,
  dateFromUnixSeconds,
  formatBRL,
  formatDateBR,
  previousMonthRange,
} from './format.js';

const TZ = 'America/Sao_Paulo';

describe('datas por fuso', () => {
  // 02:30 UTC = 23:30 do dia anterior em São Paulo
  const noiteDeSp = new Date('2026-09-04T02:30:00Z');

  it('todayInTz: usa o dia do fuso, nao o UTC', () => {
    expect(
      dateFromUnixSeconds(Math.floor(noiteDeSp.getTime() / 1000), TZ),
    ).toBe('2026-09-03');
  });

  it('currentMonthRange: mes corrente no fuso informado', () => {
    const range = currentMonthRange(TZ, noiteDeSp);
    expect(range.start).toBe('2026-09-01');
    expect(range.end).toBe('2026-09-30');
    expect(range.label).toBe('Setembro de 2026');
  });

  it('previousMonthRange: mes anterior', () => {
    const range = previousMonthRange(TZ, noiteDeSp);
    expect(range.start).toBe('2026-08-01');
    expect(range.end).toBe('2026-08-31');
    expect(range.label).toBe('Agosto de 2026');
  });

  it('previousMonthRange: janeiro volta para dezembro do ano anterior', () => {
    const janeiro = new Date('2026-01-15T12:00:00Z');
    const range = previousMonthRange(TZ, janeiro);
    expect(range.start).toBe('2025-12-01');
    expect(range.end).toBe('2025-12-31');
    expect(range.label).toBe('Dezembro de 2025');
  });
});

describe('formatacao', () => {
  it('formatBRL em pt-BR', () => {
    expect(formatBRL(1234.5).replace(/ /g, ' ')).toBe('R$ 1.234,50');
  });

  it('formatDateBR converte ISO para dd/mm/aaaa', () => {
    expect(formatDateBR('2026-09-03')).toBe('03/09/2026');
  });
});
