import { cn } from '@/lib/utils';
import { getStatusBadgeClass, getStatusLabel, getRiskBadgeClass } from '@/lib/utils';

interface BadgeProps {
  value: string;
  type?: 'status' | 'risk' | 'custom';
  className?: string;
  customClass?: string;
}

export function Badge({ value, type = 'status', className, customClass }: BadgeProps) {
  let badgeClass = '';
  let label = value;

  if (type === 'risk') {
    badgeClass = getRiskBadgeClass(value);
    const labels: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' };
    label = labels[value] || value;
  } else if (type === 'status') {
    badgeClass = getStatusBadgeClass(value);
    label = getStatusLabel(value);
  } else if (customClass) {
    badgeClass = customClass;
  }

  return <span className={cn('badge', badgeClass, className)}>{label}</span>;
}

export function RepaymentTag({ methods }: { methods: string }) {
  let parsed: string[] = [];
  try {
    parsed = JSON.parse(methods);
  } catch {
    parsed = methods ? [methods] : [];
  }

  if (parsed.includes('ot') && parsed.includes('numerario')) {
    return <span className="tag-mix">OT+Cash</span>;
  }
  if (parsed.includes('ot')) return <span className="tag-ot">OT 5a</span>;
  if (parsed.includes('bt')) return <span className="tag-bt">BT 91d</span>;
  return <span className="tag-cash">Cash</span>;
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const isRisk = value >= 85;
  return (
    <div className="progress-bar" style={{ width: 65 }}>
      <div
        className="progress-fill"
        style={{
          width: `${Math.min(100, value)}%`,
          background: color || (isRisk ? '#D43352' : undefined),
        }}
      />
    </div>
  );
}
