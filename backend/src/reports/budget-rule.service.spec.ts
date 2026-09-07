import { describe, expect, it } from 'vitest';
import { BudgetRuleService } from './budget-rule.service.js';

describe('BudgetRuleService', () => {
  const service = new BudgetRuleService();

  describe('calculate', () => {
    it('distribui 70/20/10 sobre valores redondos', () => {
      expect(service.calculate(5000)).toEqual({
        base: 5000,
        gastosFixos: 3500,
        investimentos: 1000,
        lazer: 500,
      });
    });

    it('fecha a soma em centavos com bases quebradas (lazer como residuo)', () => {
      const result = service.calculate(100.01);
      expect(result.gastosFixos).toBe(70.01);
      expect(result.investimentos).toBe(20);
      expect(result.lazer).toBe(10);
      expect(
        result.gastosFixos + result.investimentos + result.lazer,
      ).toBeCloseTo(100.01);
    });

    it('nao perde centavos com bases minusculas', () => {
      const result = service.calculate(0.03);
      expect(result.gastosFixos).toBe(0.02);
      expect(result.investimentos).toBe(0.01);
      expect(result.lazer).toBe(0);
      expect(
        result.gastosFixos + result.investimentos + result.lazer,
      ).toBeCloseTo(0.03);
    });
  });

  describe('parseBaseArgument', () => {
    it('aceita inteiro simples', () => {
      expect(service.parseBaseArgument('5000')).toBe(5000);
    });

    it('aceita ponto de milhar pt-BR', () => {
      expect(service.parseBaseArgument('5.000')).toBe(5000);
    });

    it('aceita milhar + virgula decimal', () => {
      expect(service.parseBaseArgument('1.234,56')).toBe(1234.56);
    });

    it('aceita virgula decimal simples', () => {
      expect(service.parseBaseArgument('5000,50')).toBe(5000.5);
    });

    it('aceita ponto decimal', () => {
      expect(service.parseBaseArgument('5000.50')).toBe(5000.5);
    });

    it('aceita prefixo R$', () => {
      expect(service.parseBaseArgument('R$ 2.500,00')).toBe(2500);
    });

    it('rejeita lixo', () => {
      expect(service.parseBaseArgument('abc')).toBeNull();
    });

    it('rejeita argumento vazio ou ausente', () => {
      expect(service.parseBaseArgument(undefined)).toBeNull();
      expect(service.parseBaseArgument('')).toBeNull();
      expect(service.parseBaseArgument('   ')).toBeNull();
    });

    it('rejeita zero e negativos', () => {
      expect(service.parseBaseArgument('0')).toBeNull();
      expect(service.parseBaseArgument('-10')).toBeNull();
    });
  });
});
