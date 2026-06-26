import { useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, X, Loader2, MessageSquare, Send, Smartphone, Mail, Check } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate, daysUntil } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';
import { useCommissionPolicy } from '@/hooks/useCommissionPolicy';
import { PolicyInfoBanner } from '@/components/ui/PolicyAlert';

interface ScheduleItem {
  id: string; contract_id: string; reference: string;
  client_name: string; client_phone: string | null; client_email: string | null;
  installment_number: number; due_date: string;
  amortization: number; interest: number; total_installment: number; status: string;
}

function RecoveryChart({ data }: { data: Array<{ month: string; value: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ctx = el.getContext('2d'); if (!ctx) return;
    const w = el.width, h = el.height;
    const pad = { t: 20, r: 16, b: 30, l: 50 };
    const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
    const months = data.map(d => d.month);
    const values = data.map(d => d.value);
    const max = Math.max(...values, 1) * 1.2;
    const bw = (gw / months.length) * 0.55;

    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (gh / 4) * i;
      ctx.strokeStyle = 'rgba(201,168,76,.05)';
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gw, y); ctx.stroke();
    }

    months.forEach((label, i) => {
      const x = pad.l + (i + 0.5) * (gw / months.length);
      const bh = values[i] > 0 ? (values[i] / max) * gh : 0;
      if (bh > 0) {
        ctx.fillStyle = 'rgba(38,184,112,.68)';
        const rx = 3, by = pad.t + gh - bh, bx = x - bw / 2;
        ctx.beginPath();
        ctx.moveTo(bx + rx, by); ctx.lineTo(bx + bw - rx, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + rx);
        ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx, by + rx); ctx.quadraticCurveTo(bx, by, bx + rx, by);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#C9A84C'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(values[i] + 'M', x, pad.t + gh - bh - 4);
      }
      ctx.fillStyle = '#7888A0'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(label, x, h - 8);
    });

    const step = Math.round(max / 4 / 50) * 50 || 1;
    ctx.fillStyle = '#7888A0'; ctx.textAlign = 'right'; ctx.font = '9px system-ui';
    [0, step, step * 2, step * 3].forEach(v => {
      const y = pad.t + gh * (1 - v / max);
      ctx.fillText(v + 'M', pad.l - 4, y + 3);
    });
  }, [data]);
  return <canvas ref={ref} width={700} height={180} style={{ width: '100%', height: 180 }} />;
}

function getPhase(item: ScheduleItem): { label: string; color: string; bg: string } {
  if (item.status === 'vencido') return { label: 'Coerciva', color: '#D43352', bg: 'rgba(212,51,82,.12)' };
  const days = daysUntil(item.due_date);
  if (days !== null && days <= 7) return { label: 'Amigável', color: '#E09020', bg: 'rgba(224,144,32,.1)' };
  if (days !== null && days <= 30) return { label: 'Regular', color: '#26B870', bg: 'rgba(38,184,112,.08)' };
  return { label: 'Preventiva', color: '#5B9CF6', bg: 'rgba(91,156,246,.08)' };
}

const PAYMENT_METHODS = [
  { key: 'numerario', label: 'Numerário (Kz)' },
  { key: 'ot', label: 'OT — Obrig. Tesouro' },
  { key: 'bt', label: 'BT — Bilhetes Tesouro' },
  { key: 'transferencia', label: 'Transferência Bancária' },
  { key: 'moeda_estrangeira', label: 'Moeda Estrangeira' },
  { key: 'dacao_activos', label: 'Dação em Activos' },
  { key: 'cessao_creditos', label: 'Cessão de Créditos' },
  { key: 'compensacao', label: 'Compensação de Dívidas' },
  { key: 'dacao_imoveis', label: 'Dação em Imóveis' },
  { key: 'receitas_futuras', label: 'Receitas Futuras' },
  { key: 'letra_cambio', label: 'Letra de Câmbio' },
];

export default function Collection() {
  const queryClient = useQueryClient();
  const { pol, calcMora } = useCommissionPolicy();
  const [notifItem, setNotifItem] = useState<ScheduleItem | null>(null);
  const [notifForm, setNotifForm] = useState({ phone: '', email: '', message: '' });
  const [notifResult, setNotifResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  const sendNotif = useMutation({
    mutationFn: async (f: typeof notifForm & { contractId: string }) => {
      const tasks = [];
      if (f.phone) tasks.push(api.post('/notifications/whatsapp', { phone: f.phone, message: f.message, contractId: f.contractId, channel: 'cobranca', recipientName: notifItem?.client_name }));
      if (f.email) tasks.push(api.post('/notifications/email', { to: f.email, subject: `Aviso de Cobrança — ${notifItem?.client_name}`, title: 'Aviso de Cobrança', body: f.message, contractId: f.contractId, channel: 'cobranca', recipientName: notifItem?.client_name }));
      return Promise.all(tasks);
    },
    onSuccess: () => setNotifResult({ ok: true }),
    onError: (e: any) => setNotifResult({ error: e.response?.data?.message || 'Erro ao enviar notificação.' }),
  });

  const [payingItem, setPayingItem] = useState<ScheduleItem | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_method: 'numerario',
    reference: '',
    notes: '',
    paid_at: new Date().toISOString().split('T')[0],
  });
  const [payError, setPayError] = useState('');

  const registerPayment = useMutation({
    mutationFn: ({ contractId, data }: { contractId: string; data: typeof payForm }) =>
      api.post(`/contracts/${contractId}/payments`, {
        schedule_id: payingItem?.id,
        amount: parseFloat(data.amount),
        payment_method: data.payment_method,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
        paid_at: data.paid_at,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      setPayingItem(null);
      setPayForm({ amount: '', payment_method: 'numerario', reference: '', notes: '', paid_at: new Date().toISOString().split('T')[0] });
      setPayError('');
    },
    onError: (err: any) => setPayError(err.response?.data?.message || 'Erro ao registar pagamento'),
  });

  const { data: colData, isLoading } = useQuery({
    queryKey: ['collection'],
    queryFn: () => api.get('/collections').then(r => r.data.data),
  });

  const schedule: ScheduleItem[] = colData?.calendar || [];
  const kpisData = colData?.kpis;

  const overdue = schedule.filter(s => s.status === 'vencido');
  const due30 = schedule.filter(s => {
    const d = daysUntil(s.due_date);
    return s.status === 'pendente' && d !== null && d >= 0 && d <= 30;
  });
  const amigavel = schedule.filter(s => s.status !== 'vencido' && getPhase(s).label === 'Amigável');

  const allItems = [
    ...overdue.map(s => ({ ...s, _sort: -1 })),
    ...schedule.filter(s => s.status !== 'vencido').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(s => ({ ...s, _sort: daysUntil(s.due_date) ?? 999 })),
  ].slice(0, 20);

  async function handleExport() {
    const allItems2 = (colData?.calendar || []) as Array<any>;
    const byPhase: Record<string, { count: number; total: number }> = {};
    allItems2.forEach((s: any) => {
      const p = getPhase(s).label;
      if (!byPhase[p]) byPhase[p] = { count: 0, total: 0 };
      byPhase[p].count++; byPhase[p].total += s.total_installment || 0;
    });
    const byStatus: Record<string, number> = {};
    allItems2.forEach((s: any) => { byStatus[s.status || 'outro'] = (byStatus[s.status || 'outro'] || 0) + 1; });
    const recovery = (colData?.recovery12 || []) as Array<{ month: string; value: number }>;
    await downloadExcel('MAIOMBE_Cobranca_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Prestacoes no Calendario', allItems2.length],
          ['Valor Total a Receber (Kz)', allItems2.reduce((a: number, s: any) => a + (s.total_installment || 0), 0)],
          ['A Vencer nos Proximos 30 dias', due30.length],
          ['Cobranca Amigavel (processos)', amigavel.length],
          ['Em Atraso (Coerciva)', overdue.length],
          ['Recuperado no Mes (Kz)', kpisData?.recuperadoMes ?? 0],
        ],
      },
      {
        title: 'PRESTACOES POR FASE DE COBRANCA',
        headers: ['fase', 'quantidade', 'valor_total_kz'],
        rows: Object.entries(byPhase).map(([f, v]) => [f, v.count, v.total]),
      },
      {
        title: 'PRESTACOES POR ESTADO',
        headers: ['estado', 'quantidade'],
        rows: Object.entries(byStatus).map(([s, n]) => [s, n]),
      },
      {
        title: 'HISTORICO DE RECUPERACAO MENSAL',
        headers: ['mes', 'valor_recuperado_kz'],
        rows: recovery.map(r => [r.month, r.value]),
      },
      {
        title: 'CALENDARIO DE VENCIMENTOS',
        headers: ['Data Venc', 'Contrato', 'Mutuario', 'Prestacao (Kz)', 'Amortizacao (Kz)', 'Juros (Kz)', 'Fase', 'Estado'],
        rows: allItems2.map((r: any) => [r.due_date, r.reference || r.contract_reference, r.client_name, r.total_installment, r.amortization, r.interest, getPhase(r).label, r.status]),
      },
    ]);
  }
  return (
    <>
      {payingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0D1117', border: '1px solid rgba(201,168,76,.25)', borderRadius: 12, padding: 22, width: 440, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C' }}>Registar Recebimento</div>
                <div style={{ fontSize: 9, color: '#7888A0' }}>{payingItem.reference} · {payingItem.client_name} · Prestação #{payingItem.installment_number}</div>
              </div>
              <button onClick={() => { setPayingItem(null); setPayError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7888A0' }}><X size={16} /></button>
            </div>
            {payError && <div style={{ color: '#D43352', fontSize: 10, marginBottom: 10 }}>{payError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Valor Recebido (Kz) *</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder={String(payingItem.total_installment)}
                  style={{ width: '100%', padding: '6px 9px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Data do Recebimento *</label>
                <input type="date" value={payForm.paid_at} onChange={e => setPayForm(p => ({ ...p, paid_at: e.target.value }))}
                  style={{ width: '100%', padding: '6px 9px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Meio de Pagamento *</label>
              <select value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}
                style={{ width: '100%', padding: '6px 9px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4 }}>
                {PAYMENT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Referência (opcional)</label>
                <input value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))}
                  placeholder="Nº cheque / transferência"
                  style={{ width: '100%', padding: '6px 9px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Notas (opcional)</label>
                <input value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Observações"
                  style={{ width: '100%', padding: '6px 9px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setPayingItem(null); setPayError(''); }} style={{ background: 'none', border: '1px solid rgba(120,136,160,.2)', borderRadius: 6, cursor: 'pointer', color: '#7888A0', padding: '7px 14px', fontSize: 10 }}>Cancelar</button>
              <button
                disabled={registerPayment.isPending || !payForm.amount || !payForm.paid_at}
                onClick={() => { if (!payForm.amount || !payForm.paid_at) { setPayError('Preencha valor e data.'); return; } registerPayment.mutate({ contractId: payingItem.contract_id, data: payForm }); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg,#C9A84C,#A07830)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#07090C', padding: '7px 14px', fontSize: 10, fontWeight: 700 }}>
                {registerPayment.isPending ? <Loader2 size={12} className="spin" /> : <CheckCircle size={12} />} Registar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}
      <TopBar title="Cobrança & Recuperação" breadcrumb="MAIOMBE / Cobrança" showNewButton={false} onExport={handleExport} />
      <div style={{ padding: '22px 26px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="A Vencer em 30 dias" value={due30.length} unit="contratos" delta={due30.length > 0 ? `${formatKz(due30.reduce((a, s) => a + s.total_installment, 0), true)} Kz` : '—'} deltaType="nt" variant="gold" />
          <KpiCard label="Cobrança Amigável" value={amigavel.length} unit="processos" delta={amigavel.length > 0 ? 'Em negociação' : 'Sem processos'} deltaType="nt" variant="am" />
          <KpiCard label="Cobrança Coerciva" value={kpisData?.emLitigio ?? 0} unit="processos" delta={kpisData?.emLitigio ? 'Acção em curso' : 'Sem processos'} deltaType="dn" variant="cr" />
          <KpiCard label="Recuperado (mês)" value={kpisData?.recuperadoMes != null ? formatKz(kpisData.recuperadoMes, true) : '—'} delta="recebimentos do mês" deltaType="up" variant="em" />
        </div>

        <Panel title="Calendário de Vencimentos — Junho / Julho 2026" style={{ marginBottom: 12 }}>
          {overdue.length > 0 && pol.mora && (
            <PolicyInfoBanner
              text={`Juros de mora de ${pol.mora.rate_min}%/dia aplicados automaticamente sobre ${overdue.length} prestação(ões) vencida(s) — Política Interna Maiombe`}
            />
          )}
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data Venc.</th><th>Contrato</th><th>Mutuário</th>
                    <th>Valor Prestação (Kz)</th><th>Capital</th><th>Juros</th>
                    <th>Fase Cobrança</th><th>Estado</th><th>Acção</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map(s => {
                    const isOverdue = s.status === 'vencido';
                    const days = daysUntil(s.due_date);
                    const diasAtraso = isOverdue && days !== null ? Math.abs(days) : 0;
                    const moraAcumulada = isOverdue ? calcMora(s.total_installment, diasAtraso) : 0;
                    const isUrgent = !isOverdue && days !== null && days <= 7;
                    const phase = getPhase(s);
                    const isPaid = s.status === 'pago';
                    return (
                      <tr key={s.id}>
                        <td className="td-mono" style={{ color: isOverdue ? '#D43352' : isUrgent ? '#E09020' : undefined, fontWeight: isOverdue ? 700 : undefined }}>
                          {isOverdue ? `VENCIDO (${diasAtraso}d)` : formatDate(s.due_date)}
                          {isUrgent && days !== null && <AlertTriangle size={9} style={{ marginLeft:3, verticalAlign:'middle' }} />}
                        </td>
                        <td className="td-mono td-bold">{s.reference}</td>
                        <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.client_name}</td>
                        <td className="td-mono">
                          {formatKz(s.total_installment)}
                          {moraAcumulada > 0 && (
                            <div style={{ fontSize: 8, color: '#D43352', marginTop: 2 }} title={`Juros de mora: ${pol.mora?.rate_min ?? 0.05}%/dia × ${diasAtraso} dias`}>
                              +{formatKz(moraAcumulada)} mora
                            </div>
                          )}
                        </td>
                        <td className="td-mono">{formatKz(s.amortization)}</td>
                        <td className="td-mono">{formatKz(s.interest)}</td>
                        <td>
                          <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, background: phase.bg, color: phase.color, border: `1px solid ${phase.color}33` }}>
                            {phase.label}
                          </span>
                        </td>
                        <td><Badge value={s.status} /></td>
                        <td>
                          {isPaid ? (
                            <span style={{ fontSize: 9, color: '#26B870', display: 'flex', alignItems: 'center', gap: 3 }}><Check size={9} /> Liquidado</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                              <button
                                onClick={() => { setPayingItem(s); setPayForm(p => ({ ...p, amount: String(s.total_installment) })); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 5, cursor: 'pointer', color: '#DEB96A', padding: '3px 8px', fontSize: 8.5 }}>
                                <CheckCircle size={9} /> Registar
                              </button>
                              {isOverdue && (
                                <button
                                  onClick={() => { setNotifItem(s); setNotifForm({ phone: s.client_phone || '', email: s.client_email || '', message: `Estimado/a ${s.client_name},\n\nVimos informar que a prestação nº ${s.installment_number} do contrato ${s.reference} se encontra vencida há ${diasAtraso} dias.\n\nValor em dívida: ${Intl.NumberFormat('pt-AO').format(s.total_installment + moraAcumulada)} Kz (inclui ${Intl.NumberFormat('pt-AO').format(moraAcumulada)} Kz em juros de mora).\n\nAgradecemos que regularize a sua situação o mais brevemente possível.\n\nMAIOMBE` }); setNotifResult(null); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(28,58,110,.2)', border: '1px solid rgba(122,166,255,.2)', borderRadius: 5, cursor: 'pointer', color: '#7AA6FF', padding: '3px 7px', fontSize: 8.5 }}>
                                  <MessageSquare size={9} /> Notif.
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Histórico de Recuperação — 2026" tag="Acumulado do Ano">
          <div style={{ padding: '14px 14px 10px' }}>
            {(colData?.recovery12 || []).every((d: { value: number }) => d.value === 0) ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: '#7888A0', fontSize: 10 }}>
                Sem recebimentos registados em 2026. Registe pagamentos para ver o histórico.
              </div>
            ) : (
              <RecoveryChart data={colData?.recovery12 || []} />
            )}
          </div>
        </Panel>
      </div>

      {/* ── MODAL: Notificação de Cobrança ──────────────────────────────────── */}
      {notifItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 440, background: '#141820', border: '1px solid rgba(201,168,76,.25)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#1C3A6E', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={16} color="#7AA6FF" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Notificação de Cobrança</span>
              </div>
              <button onClick={() => { setNotifItem(null); setNotifResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {!notifResult ? (
                <>
                  <div style={{ padding: '10px 14px', background: 'rgba(7,9,12,.4)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 9, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Mutuário · {notifItem.reference}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#DEB96A', marginBottom: 4 }}>{notifItem.client_name}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {notifItem.client_phone
                        ? <span style={{ fontSize: 10, color: '#26B870', display: 'flex', alignItems: 'center', gap: 4 }}><Smartphone size={10} /> {notifItem.client_phone}</span>
                        : <span style={{ fontSize: 10, color: '#D43352', display: 'flex', alignItems: 'center', gap: 4 }}><Smartphone size={10} /> Telefone não cadastrado</span>}
                      {notifItem.client_email
                        ? <span style={{ fontSize: 10, color: '#26B870', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} /> {notifItem.client_email}</span>
                        : <span style={{ fontSize: 10, color: '#D43352', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} /> Email não cadastrado</span>}
                    </div>
                  </div>
                  {[
                    { key: 'phone', label: 'Telefone (WhatsApp)', fromClient: !!notifItem.client_phone },
                    { key: 'email', label: 'Email', fromClient: !!notifItem.client_email },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: 10, color: '#7888A0' }}>{f.label}</label>
                        {f.fromClient
                          ? <span style={{ fontSize: 9, color: '#26B870', background: 'rgba(38,184,112,.1)', border: '1px solid rgba(38,184,112,.2)', borderRadius: 10, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={9} /> do cadastro</span>
                          : <span style={{ fontSize: 9, color: '#E09020', background: 'rgba(224,144,32,.08)', border: '1px solid rgba(224,144,32,.2)', borderRadius: 10, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={9} /> Não cadastrado</span>}
                      </div>
                      <input
                        value={(notifForm as any)[f.key]}
                        placeholder={f.fromClient ? '' : 'Introduza manualmente'}
                        onChange={e => setNotifForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: `1px solid ${f.fromClient ? 'rgba(38,184,112,.3)' : 'rgba(201,168,76,.2)'}`, borderRadius: 6, color: '#E5EBF2', padding: '6px 10px', fontSize: 12 }}
                      />
                    </div>
                  ))}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 10, color: '#7888A0', marginBottom: 4 }}>Mensagem *</label>
                    <textarea
                      value={notifForm.message}
                      onChange={e => setNotifForm(p => ({ ...p, message: e.target.value }))}
                      rows={5}
                      style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#E5EBF2', padding: '8px 10px', fontSize: 11, resize: 'vertical' }}
                    />
                  </div>
                  <button
                    disabled={sendNotif.isPending || !notifForm.message || (!notifForm.phone && !notifForm.email)}
                    onClick={() => sendNotif.mutate({ ...notifForm, contractId: notifItem.contract_id })}
                    style={{ width: '100%', background: '#1C3A6E', border: '1px solid rgba(122,166,255,.3)', borderRadius: 8, color: '#7AA6FF', padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {sendNotif.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                    Enviar Notificação
                  </button>
                </>
              ) : notifResult.error ? (
                <div style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ color: '#D43352', marginBottom: 10, fontSize: 12 }}>{notifResult.error}</div>
                  <button onClick={() => setNotifResult(null)} style={{ background: 'rgba(212,51,82,.15)', border: '1px solid rgba(212,51,82,.3)', borderRadius: 6, color: '#D43352', padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>Tentar novamente</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(38,184,112,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Send size={28} color="#26B870" /></div>
                  <div style={{ color: '#26B870', fontWeight: 700, marginBottom: 8 }}>Notificação enviada!</div>
                  <button onClick={() => { setNotifItem(null); setNotifResult(null); }} style={{ background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 6, color: '#26B870', padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>Fechar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}






