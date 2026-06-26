import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toastStore } from '@/lib/toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export function useRealtimeEvents() {
  const qc = useQueryClient();

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;
    let active = true;

    function connect() {
      if (!active) return;
      const token = localStorage.getItem('access_token');
      if (!token) { retryTimer = setTimeout(connect, 3000); return; }

      es = new EventSource(`${API_BASE}/events?token=${encodeURIComponent(token)}`);

      es.addEventListener('signature.signed', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        qc.invalidateQueries({ queryKey: ['signatures-latest'] });
        qc.invalidateQueries({ queryKey: ['contracts-manage'] });
        qc.invalidateQueries({ queryKey: ['automation-last-sent'] });
        toastStore.success(`${d.signerName} assinou "${d.documentTitle}"`);
      });

      es.addEventListener('signature.refused', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        qc.invalidateQueries({ queryKey: ['signatures-latest'] });
        toastStore.warning(`${d.signerName} recusou assinar "${d.documentTitle}"`);
      });

      es.addEventListener('notification.sent', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        qc.invalidateQueries({ queryKey: ['automation-last-sent'] });
        if (d.channel === 'assinatura') return;
        toastStore.info(`Notificação enviada a ${d.recipientName}`);
      });

      es.addEventListener('automation.ran', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        qc.invalidateQueries({ queryKey: ['automation-last-sent'] });
        toastStore.success(`Automação concluída — ${d.sent} enviada(s), ${d.errors} erro(s)`);
      });

      es.addEventListener('contract.updated', () => {
        qc.invalidateQueries({ queryKey: ['contracts-manage'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      });

      es.addEventListener('payment.registered', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        qc.invalidateQueries({ queryKey: ['contracts-manage'] });
        qc.invalidateQueries({ queryKey: ['collection'] });
        qc.invalidateQueries({ queryKey: ['schedule', d.contractId] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        toastStore.success(`Pagamento de ${d.amount} Kz registado — ${d.reference}`);
      });

      es.addEventListener('alert.new', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        qc.invalidateQueries({ queryKey: ['alerts'] });
        qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
        toastStore.warning(d.message);
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (active) retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      active = false;
      clearTimeout(retryTimer);
      es?.close();
    };
  }, [qc]);
}
