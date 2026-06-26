import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  title: string;
  tag?: ReactNode;
  tagVariant?: 'default' | 'cr' | 'em' | 'bl' | 'am';
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Panel({ title, tag, tagVariant = 'default', actions, children, className, style }: PanelProps) {
  const tagClass = tagVariant === 'default' ? 'ptag' : `ptag-${tagVariant}`;
  return (
    <div className={cn('panel', className)} style={style}>
      <div className="panel-header">
        <span className="panel-title">{title}</span>
        {tag && <span className={tagClass}>{tag}</span>}
        {actions}
      </div>
      {children}
    </div>
  );
}
