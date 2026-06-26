import { AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import type { PolicyViolation } from '@/hooks/useCommissionPolicy';

interface Props {
  violations?: (PolicyViolation | null)[];
  info?: string;
  compact?: boolean;
}

/**
 * Exibe notificações de violação da Política Interna de Comissões.
 * Usar em qualquer módulo que valide taxas ou comissões.
 */
export function PolicyAlert({ violations = [], info, compact = false }: Props) {
  const active = violations.filter(Boolean) as PolicyViolation[];

  if (active.length === 0 && !info) return null;

  const hasError   = active.some(v => v.severity === 'error');
  const borderColor = hasError ? 'rgba(212,51,82,.35)' : 'rgba(224,144,32,.3)';
  const bgColor     = hasError ? 'rgba(212,51,82,.07)' : 'rgba(224,144,32,.06)';
  const textColor   = hasError ? '#D43352' : '#E09020';

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      background: bgColor,
      borderRadius: compact ? 4 : 6,
      padding: compact ? '4px 8px' : '8px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? 3 : 5,
    }}>
      {active.map((v, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: compact ? 9 : 9.5, color: v.severity === 'error' ? '#D43352' : '#E09020' }}>
          <AlertTriangle size={compact ? 9 : 11} />
          <span><strong>Política:</strong> {v.message}</span>
        </div>
      ))}
      {info && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: compact ? 9 : 9.5, color: '#26B870' }}>
          <Info size={compact ? 9 : 11} />
          <span>{info}</span>
        </div>
      )}
    </div>
  );
}

/** Badge inline compacto para tabelas — mostra aviso ao lado de um valor */
export function PolicyBadge({ violation }: { violation: PolicyViolation | null }) {
  if (!violation) return null;
  const isError = violation.severity === 'error';
  return (
    <span
      title={violation.message}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        marginLeft: 5, padding: '1px 5px', borderRadius: 3, fontSize: 8, fontWeight: 700, cursor: 'help',
        background: isError ? 'rgba(212,51,82,.12)' : 'rgba(224,144,32,.1)',
        color: isError ? '#D43352' : '#E09020',
        border: `1px solid ${isError ? 'rgba(212,51,82,.25)' : 'rgba(224,144,32,.2)'}`,
      }}
    >
      <AlertTriangle size={7} /> {isError ? 'Viola política' : 'Atenção'}
    </span>
  );
}

/** Banner informativo de política activa (sem violação) */
export function PolicyInfoBanner({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '7px 14px', background: 'rgba(38,184,112,.06)',
      borderBottom: '1px solid rgba(38,184,112,.12)',
      fontSize: 9.5, color: '#26B870',
    }}>
      <ShieldCheck size={12} />
      <span>{text}</span>
    </div>
  );
}
