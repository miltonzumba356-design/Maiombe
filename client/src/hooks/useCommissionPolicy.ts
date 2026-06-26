import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface CommissionRow {
  id: string; name: string; calculation_base: string;
  rate_min: number; rate_max: number; periodicity: string;
  is_capitalizable: number; can_reinvest: number; description?: string;
}

interface RateRow {
  id: string; entity_type: string; min_rate: number; base_rate: number;
  max_rate: number; management_commission: number; opening_commission: number;
}

export interface PolicyViolation {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function useCommissionPolicy() {
  const { data } = useQuery({
    queryKey: ['rates'],
    queryFn: () => api.get('/rates').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const commissions: CommissionRow[] = data?.commissions || [];
  const rateTables: RateRow[]        = data?.rateTables  || [];

  // Lookup das regras por tipo
  const pol = {
    abertura:    commissions.find(c => c.name.toLowerCase().includes('abertura')),
    gestao:      commissions.find(c => c.name.toLowerCase().includes('gest')),
    imob:        commissions.find(c => c.name.toLowerCase().includes('imobiliza')),
    mora:        commissions.find(c => c.name.toLowerCase().includes('mora')),
    reestrutura: commissions.find(c => c.name.toLowerCase().includes('reestrutura')),
    prePag:      commissions.find(c => c.name.toLowerCase().includes('pré-pag') || c.name.toLowerCase().includes('pre-pag') || c.name.toLowerCase().includes('penalidade')),
  };

  const globalMinRate = rateTables.length ? Math.min(...rateTables.map(r => r.min_rate)) : null;
  const globalMaxRate = rateTables.length ? Math.max(...rateTables.map(r => r.max_rate)) : null;

  /** Valida a taxa de juro de um contrato contra a política global de taxas */
  function checkRate(value: number): PolicyViolation | null {
    if (globalMinRate === null || globalMaxRate === null || value === 0) return null;
    if (value < globalMinRate)
      return { field: 'interest_rate', message: `Taxa ${value}% abaixo do mínimo da política (${globalMinRate}%)`, severity: 'warning' };
    if (value > globalMaxRate)
      return { field: 'interest_rate', message: `Taxa ${value}% acima do máximo da política (${globalMaxRate}%)`, severity: 'error' };
    return null;
  }

  /** Valida a taxa de mora contra a política de Juros de Mora */
  function checkMoraRate(value: number): PolicyViolation | null {
    const p = pol.mora;
    if (!p || value === 0) return null;
    if (value > p.rate_max)
      return { field: 'mora_rate', message: `Taxa de mora ${value}%/dia acima do limite da política (${p.rate_max}%/dia)`, severity: 'error' };
    if (value < p.rate_min)
      return { field: 'mora_rate', message: `Taxa de mora ${value}%/dia abaixo do mínimo da política (${p.rate_min}%/dia)`, severity: 'warning' };
    return null;
  }

  /** Valida a comissão de abertura */
  function checkAbertura(value: number): PolicyViolation | null {
    const p = pol.abertura;
    if (!p || value === 0) return null;
    if (value < p.rate_min || value > p.rate_max)
      return { field: 'opening_commission', message: `Comissão de Abertura ${value}% fora do intervalo da política (${p.rate_min}%–${p.rate_max}%)`, severity: 'warning' };
    return null;
  }

  /** Valida a comissão de gestão anual */
  function checkGestao(value: number): PolicyViolation | null {
    const p = pol.gestao;
    if (!p || value === 0) return null;
    if (value < p.rate_min || value > p.rate_max)
      return { field: 'management_commission', message: `Comissão de Gestão ${value}% fora do intervalo da política (${p.rate_min}%–${p.rate_max}%)`, severity: 'warning' };
    return null;
  }

  /** Calcula juro de mora acumulado: capital × (rate%/dia) × dias */
  function calcMora(capital: number, diasAtraso: number): number {
    const rate = pol.mora?.rate_min ?? 0.05;
    return capital * (rate / 100) * diasAtraso;
  }

  return {
    pol,
    rateTables,
    commissions,
    globalMinRate,
    globalMaxRate,
    checkRate,
    checkMoraRate,
    checkAbertura,
    checkGestao,
    calcMora,
    loaded: !!data,
  };
}
