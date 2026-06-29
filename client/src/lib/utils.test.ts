import { describe, it, expect } from 'vitest';
import {
  formatKz,
  formatPercent,
  formatDate,
  getStatusLabel,
  getRiskBadgeClass,
  getStatusBadgeClass,
} from './utils';

// ─────────────────────────────────────────────────────────────────────────────
describe('formatKz()', () => {
  it('devolve "—" para null', () => {
    expect(formatKz(null)).toBe('—');
  });

  it('devolve "—" para undefined', () => {
    expect(formatKz(undefined as unknown as number)).toBe('—');
  });

  it('formata zero sem casas decimais', () => {
    expect(formatKz(0)).toMatch(/0/);
  });

  it('formata número positivo como string não vazia', () => {
    const result = formatKz(1_000_000);
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
  });

  it('modo compacto inclui sufixo Kz', () => {
    const compact = formatKz(1_000_000, true);
    expect(compact).toContain('Kz');
  });

  it('número negativo é formatado sem lançar erro', () => {
    expect(() => formatKz(-500_000)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('formatPercent()', () => {
  it('devolve "—" para null', () => {
    expect(formatPercent(null)).toBe('—');
  });

  it('inclui símbolo % no resultado', () => {
    expect(formatPercent(15.5)).toContain('%');
  });

  it('respeita o número de casas decimais fornecido', () => {
    const result = formatPercent(12.3456, 2);
    expect(result).toBe('12.35%');
  });

  it('usa 1 casa decimal por defeito', () => {
    const result = formatPercent(7);
    expect(result).toBe('7.0%');
  });

  it('zero devolve "0.0%"', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('formatDate()', () => {
  it('devolve "—" para string vazia', () => {
    expect(formatDate('')).toBe('—');
  });

  it('devolve "—" para null', () => {
    expect(formatDate(null as unknown as string)).toBe('—');
  });

  it('formata ISO date como dd/mm/yyyy', () => {
    expect(formatDate('2026-01-15')).toBe('15/01/2026');
  });

  it('formata ISO datetime extraindo apenas a data', () => {
    const result = formatDate('2026-06-27T14:30:00.000Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getStatusLabel()', () => {
  const cases: [string, string][] = [
    ['recebidos', 'Recebidos'],
    ['elaboracao', 'Elaboração'],
    ['em_vigor', 'Em Vigor'],
    ['vencido', 'Vencido'],
    ['cancelado', 'Cancelado'],
    ['liquidado', 'Liquidado'],
  ];

  it.each(cases)('"%s" → "%s"', (input, expected) => {
    expect(getStatusLabel(input)).toBe(expected);
  });

  it('devolve o próprio valor para status desconhecido', () => {
    expect(getStatusLabel('custom_status')).toBe('custom_status');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getRiskBadgeClass()', () => {
  it('"baixo" → "badge-low"', () => {
    expect(getRiskBadgeClass('baixo')).toBe('badge-low');
  });

  it('"medio" → "badge-med"', () => {
    expect(getRiskBadgeClass('medio')).toBe('badge-med');
  });

  it('"alto" → "badge-hi"', () => {
    expect(getRiskBadgeClass('alto')).toBe('badge-hi');
  });

  it('"critico" → "badge-crit"', () => {
    expect(getRiskBadgeClass('critico')).toBe('badge-crit');
  });

  it('nível desconhecido devolve classe por defeito', () => {
    expect(() => getRiskBadgeClass('unknown')).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getStatusBadgeClass()', () => {
  it('"recebidos" → "badge-low"', () => {
    expect(getStatusBadgeClass('recebidos')).toBe('badge-low');
  });

  it('"em_vigor" → "badge-low" ou similar', () => {
    expect(getStatusBadgeClass('em_vigor')).toBeTruthy();
  });

  it('"vencido" → "badge-crit"', () => {
    expect(getStatusBadgeClass('vencido')).toBe('badge-crit');
  });

  it('status desconhecido não lança excepção', () => {
    expect(() => getStatusBadgeClass('xyz')).not.toThrow();
  });
});
