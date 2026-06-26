import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaType?: 'up' | 'dn' | 'nt';
  variant?: 'gold' | 'em' | 'cr' | 'am' | 'bl';
  className?: string;
  small?: boolean;
  sub?: string;
}

export default function KpiCard({ label, value, unit, delta, deltaType = 'nt', variant = 'gold', className, small, sub }: KpiCardProps) {
  const variantClass = `kpi-${variant}`;

  return (
    <div className={cn('kpi-card', variantClass, className)} style={small ? { padding: 12 } : {}}>
      <div style={{ fontSize: small ? 8 : 8.5, textTransform: 'uppercase', letterSpacing: 1.4, color: '#7888A0', marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: small ? 17 : 24, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 6, letterSpacing: -1 }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 500, color: '#7888A0', marginLeft: 3 }}>{unit}</span>}
      </div>
      {delta && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 600,
          padding: '2px 6px', borderRadius: 14,
          background: deltaType === 'up' ? 'rgba(38,184,112,.14)' : deltaType === 'dn' ? 'rgba(212,51,82,.14)' : 'rgba(224,144,32,.14)',
          color: deltaType === 'up' ? '#26B870' : deltaType === 'dn' ? '#D43352' : '#E09020',
        }}>
          {delta}
        </span>
      )}
      {sub && <div style={{ fontSize: 8.5, color: '#7888A0', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
