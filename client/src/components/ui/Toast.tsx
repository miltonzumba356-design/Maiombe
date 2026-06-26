import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { toastStore, Toast } from '@/lib/toast';

const COLORS: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: 'rgba(38,184,112,.12)',  border: 'rgba(38,184,112,.35)',  icon: '#26B870', text: '#26B870' },
  error:   { bg: 'rgba(212,51,82,.12)',   border: 'rgba(212,51,82,.35)',   icon: '#D43352', text: '#D43352' },
  warning: { bg: 'rgba(224,144,32,.1)',   border: 'rgba(224,144,32,.3)',   icon: '#E09020', text: '#E09020' },
  info:    { bg: 'rgba(91,156,246,.1)',   border: 'rgba(91,156,246,.3)',   icon: '#5B9CF6', text: '#5B9CF6' },
};

const ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle size={15} />,
  error:   <XCircle size={15} />,
  warning: <AlertTriangle size={15} />,
  info:    <Info size={15} />,
};

function ToastItem({ toast }: { toast: Toast }) {
  const [visible, setVisible] = useState(false);
  const c = COLORS[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 14px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,.35)',
        minWidth: 280, maxWidth: 380,
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform .28s ease, opacity .28s ease',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ color: c.icon, flexShrink: 0, marginTop: 1 }}>{ICONS[toast.type]}</span>
      <span style={{ fontSize: 12, color: '#E5EBF2', flex: 1, lineHeight: 1.5 }}>{toast.message}</span>
      <button
        onClick={() => toastStore.dismiss(toast.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7888A0', padding: 0, flexShrink: 0, marginTop: 1 }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = toastStore.subscribe(setToasts);
    return () => { unsub(); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999,
    }}>
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
