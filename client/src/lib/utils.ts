import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKz(value: number | null | undefined, compact = false): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (compact) {
    if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)} Bil M Kz`;
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Mil M Kz`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M Kz`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K Kz`;
    return `${value.toFixed(0)} Kz`;
  }
  return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0 }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(decimals)}%`;
}

export function getRiskBadgeClass(level: string): string {
  switch (level) {
    case 'baixo': return 'badge-low';
    case 'medio': return 'badge-med';
    case 'alto': return 'badge-hi';
    case 'critico': return 'badge-crit';
    default: return 'badge-ok';
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'recebidos': return 'badge-low';
    case 'elaboracao': return 'badge-warn';
    case 'em_vigor': return 'badge-low';
    case 'em_formalizacao': return 'badge-warn';
    case 'em_risco': return 'badge-hi';
    case 'vencido': return 'badge-crit';
    case 'liquidado': return 'badge-ok';
    case 'activa': return 'badge-ok';
    case 'pago': return 'badge-ok';
    case 'pendente': return 'badge-warn';
    case 'futuro': return 'badge-ft';
    case 'aceite': return 'badge-ok';
    case 'analise': return 'badge-warn';
    case 'negociacao': return 'badge-am';
    case 'urgente': return 'badge-crit';
    case 'atencao': return 'badge-med';
    case 'informativo': return 'badge-ft';
    default: return 'badge-ft';
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    recebidos: 'Recebidos',
    elaboracao: 'Elaboração',
    em_vigor: 'Em Vigor',
    em_formalizacao: 'Em Formalização',
    em_risco: 'Em Risco',
    vencido: 'Vencido',
    liquidado: 'Liquidado',
    cancelado: 'Cancelado',
    activa: 'Activa',
    expirada: 'Expirada',
    em_execucao: 'Em Execução',
    renovacao_pendente: 'Renovação Pendente',
    pago: 'Pago',
    pendente: 'Pendente',
    futuro: 'Futuro',
    aceite: 'Aceite',
    analise: 'Análise',
    negociacao: 'Negociação',
    rejeitado: 'Rejeitado',
    normal: 'Normal',
    em_atraso: 'Em Atraso',
    em_litigio: 'Em Litígio',
    arranque: 'Em Arranque',
    concluido: 'Concluído',
    suspenso: 'Suspenso',
    desvio: 'Desvio',
    urgente: 'Urgente',
    atencao: 'Atenção',
    informativo: 'Informativo',
  };
  return labels[status] || status;
}

export function getContractTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    modelo_a: 'Modelo A — Financiamento Público',
    modelo_b: 'Modelo B — Empréstimo a Privado',
    modelo_c: 'Modelo C — Financiamento de Projecto',
  };
  return labels[type] || type;
}

export function getEntityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    governo_central: 'Governo Central',
    ministerio: 'Ministério',
    governo_provincial: 'Governo Provincial',
    administracao_municipal: 'Adm. Municipal',
    empresa_publica: 'Empresa Pública',
    empresa_dominio_publico: 'Empresa Dom. Público',
    empresa_privada: 'Empresa Privada',
    particular: 'Particular',
    entidade_mista: 'Entidade Mista',
  };
  return labels[type] || type;
}

export function getPaymentMethodTag(method: string): string {
  const methods = method?.split(',') || [];
  if (methods.includes('ot') && methods.includes('numerario')) return 'mix';
  if (methods.includes('ot')) return 'ot';
  if (methods.includes('bt')) return 'bt';
  return 'cash';
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
