import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, BarChart2, Briefcase, BarChart, Pencil, AlertTriangle, Scale, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate, formatPercent } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';
import { useCommissionPolicy } from '@/hooks/useCommissionPolicy';
import { PolicyAlert } from '@/components/ui/PolicyAlert';

function BalanceChart({ kpis }: { kpis: any }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const totalActivo = kpis?.totalActivo ?? 0;
  const totalPassivo = kpis?.totalPassivo ?? 0;
  const margem = kpis?.margemLiquida ?? 0;
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const passivoBars = months.map((_, i) => totalPassivo * (0.08 + 0.005 * i) / 1e9);
  const activoBars  = months.map((_, i) => totalActivo  * (0.07 + 0.006 * i) / 1e9);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ctx = el.getContext('2d'); if (!ctx) return;
    const w = el.width, h = el.height;
    const pad = { t: 24, r: 16, b: 32, l: 52 };
    const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
    const max = Math.max(...passivoBars, ...activoBars, 1);
    const n = months.length;
    const groupW = gw / n;
    const bw = groupW * 0.32;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (gh / 4) * i;
      ctx.strokeStyle = 'rgba(201,168,76,.06)'; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gw, y); ctx.stroke();
    }
    months.forEach((m, i) => {
      const x = pad.l + i * groupW + groupW / 2;
      const phMax = (passivoBars[i] / max) * gh;
      const ahMax = (activoBars[i] / max) * gh;
      ctx.fillStyle = 'rgba(212,51,82,.65)';
      ctx.fillRect(x - bw - 1, pad.t + gh - phMax, bw, phMax);
      ctx.fillStyle = 'rgba(38,184,112,.65)';
      ctx.fillRect(x + 1, pad.t + gh - ahMax, bw, ahMax);
      ctx.fillStyle = '#364858'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(m, x, h - 8);
    });
    [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), Math.round(max)].forEach((v, i) => {
      const y = pad.t + gh * (1 - i / 4);
      ctx.fillStyle = '#364858'; ctx.font = '8px system-ui'; ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(1) + 'B', pad.l - 4, y + 3);
    });
    ctx.font = '8px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(212,51,82,.65)'; ctx.fillRect(pad.l, pad.t - 16, 8, 8);
    ctx.fillStyle = '#7888A0'; ctx.fillText('Reembolsos Passivo', pad.l + 12, pad.t - 9);
    ctx.fillStyle = 'rgba(38,184,112,.65)'; ctx.fillRect(pad.l + 130, pad.t - 16, 8, 8);
    ctx.fillStyle = '#7888A0'; ctx.fillText('Cobranças Activo', pad.l + 142, pad.t - 9);
  }, [kpis]);

  return (
    <Panel title="Balanceamento Activo vs. Passivo — Projecção 2026" tag="Análise de Liquidez" style={{ marginTop: 12 }}>
      <div style={{ padding: '14px 14px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Total Activo (Crédito)', value: totalActivo > 0 ? formatKz(totalActivo / 1e9, false) + ' Mil M Kz' : '—', color: '#26B870' },
            { label: 'Total Passivo', value: totalPassivo > 0 ? formatKz(totalPassivo / 1e9, false) + ' Mil M Kz' : '—', color: '#D43352' },
            { label: 'Margem Activo / Passivo', value: kpis?.margemLiquida != null ? `${margem > 0 ? '+' : ''}${margem} pp` : '—', color: margem >= 0 ? '#C9A84C' : '#D43352' },
          ].map((item, i) => (
            <div key={i} style={{ padding: 10, background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.08)', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <canvas ref={ref} width={700} height={180} style={{ width: '100%', height: 180 }} />
      </div>
    </Panel>
  );
}

const LIABILITY_ICONS: Record<string, React.ElementType> = {
  banco:            Landmark,
  credito_bancario: Landmark,
  linha_bancaria:   Landmark,
  suprimentos:      BarChart2,
  capital_proprio:  BarChart,
  debentures:       Briefcase,
  obrigacoes:       Briefcase,
  outro:            Landmark,
};

interface LiabilityItem {
  id: string; creditor_name: string; liability_type: string; total_amount: number;
  outstanding_amount: number; interest_rate: number; start_date: string;
  maturity_date: string; payment_frequency: string; status: string;
  paid_installments: number; total_installments: number; contract_reference?: string;
  mora_rate?: number; next_due_date?: string; guarantee?: string;
}

const LIABILITY_TYPES = [
  'linha_bancaria', 'suprimentos', 'debentures', 'obrigacoes', 'co_financiamento', 'outros',
];
const FREQ_OPTS = ['mensal', 'bimestral', 'trimestral', 'semestral', 'anual'];

type ActionType = 'renegociar' | 'penalidade' | 'litigio';
interface ActionModal { type: ActionType; id: string; creditor: string; }

export default function Liabilities() {
  const queryClient = useQueryClient();
  const { checkMoraRate } = useCommissionPolicy();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    creditor_name: '', liability_type: 'linha_bancaria', total_amount: '',
    outstanding_amount: '', interest_rate: '', late_interest_rate: '',
    start_date: '', maturity_date: '', payment_frequency: 'semestral',
    guarantee_given: '', notes: '',
  });
  const [formError, setFormError] = useState('');
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionValue, setActionValue] = useState('');
  const [actionErr, setActionErr] = useState('');

  const doAction = useMutation({
    mutationFn: ({ id, type, notes, value }: { id: string; type: ActionType; notes: string; value?: string }) =>
      api.patch(`/liabilities/${id}/action`, { action: type, notes, value: value ? +value : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      setActionModal(null); setActionNotes(''); setActionValue(''); setActionErr('');
    },
    onError: (e: any) => setActionErr(e.response?.data?.message || 'Erro ao registar acção'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['liabilities'],
    queryFn: () => api.get('/liabilities').then(r => r.data.data),
  });

  const liabilities: LiabilityItem[] = data?.data || data || [];
  const kpis = data?.kpis;

  const { data: expandedDetail } = useQuery<{
    id: string; schedule: Array<{
      installment_number: number; due_date: string; capital: number;
      interest: number; total_installment: number; residual_capital: number; status: string;
    }>;
  }>({
    queryKey: ['liability-detail', expandedId],
    queryFn: () => api.get(`/liabilities/${expandedId}`).then(r => r.data.data),
    enabled: !!expandedId,
  });
  const realSchedule = expandedDetail?.schedule || [];

  const createLiability = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/liabilities', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      setShowForm(false);
      setFormError('');
      setForm({ creditor_name: '', liability_type: 'linha_bancaria', total_amount: '', outstanding_amount: '', interest_rate: '', late_interest_rate: '', start_date: '', maturity_date: '', payment_frequency: 'semestral', guarantee_given: '', notes: '' });
    },
    onError: (e: any) => setFormError(e.response?.data?.message || 'Erro ao registar obrigação'),
  });

  function submitLiability(e: React.FormEvent) {
    e.preventDefault();
    if (!form.creditor_name || !form.total_amount || !form.start_date) {
      setFormError('Preencha credor, montante e data de início.');
      return;
    }
    createLiability.mutate({
      ...form,
      total_amount: +form.total_amount,
      outstanding_amount: form.outstanding_amount ? +form.outstanding_amount : +form.total_amount,
      interest_rate: +form.interest_rate || 0,
      late_interest_rate: +form.late_interest_rate || 0,
    });
  }

  function upd(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })); }

  const totalAmortized = liabilities.reduce((acc, l) => {
    const paid = l.total_amount - (l.outstanding_amount || l.total_amount);
    return acc + Math.max(0, paid);
  }, 0);

  const ACTION_CONFIG: Record<ActionType, { label: string; color: string; border: string; needsValue: boolean; valuePlaceholder?: string; desc: string }> = {
    renegociar: { label: 'Renegociação de Condições', color: '#C9A84C', border: 'rgba(201,168,76,.3)', needsValue: false, desc: 'Registe as novas condições acordadas com o credor (taxa, prazo, carência, etc.).' },
    penalidade: { label: 'Registo de Penalidade', color: '#E09020', border: 'rgba(224,144,32,.3)', needsValue: true, valuePlaceholder: 'Valor da penalidade (Kz)', desc: 'Registe a penalidade ou multa aplicada pelo credor pelo incumprimento de cláusulas contratuais.' },
    litigio:    { label: 'Abertura de Litígio', color: '#D43352', border: 'rgba(212,51,82,.3)', needsValue: false, desc: 'Abre um processo de contencioso jurídico com o credor. O estado da obrigação passa a "Em Litígio".' },
  };

  const mInp: React.CSSProperties = { width: '100%', background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', borderRadius: 6, padding: '6px 10px', color: '#E5EBF2', fontSize: 11, boxSizing: 'border-box' };

  async function handleExport() {
    const totalPass = liabilities.reduce((a, l) => a + (l.outstanding_amount || l.total_amount || 0), 0);
    const totalAmort = liabilities.reduce((a, l) => a + Math.max(0, (l.total_amount || 0) - (l.outstanding_amount || l.total_amount || 0)), 0);
    const byType: Record<string, { count: number; total: number }> = {};
    liabilities.forEach(l => {
      const k = l.liability_type || 'outro';
      if (!byType[k]) byType[k] = { count: 0, total: 0 };
      byType[k].count++;
      byType[k].total += l.outstanding_amount || 0;
    });
    await downloadExcel('MAIOMBE_Passivo_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Obrigacoes', liabilities.length],
          ['Total Passivo em Divida (Kz)', totalPass],
          ['Total Amortizado (Kz)', totalAmort],
          ['Custo Medio do Passivo (%)', kpis?.custoMedioPassivo ?? '—'],
          ['Margem Activo vs Passivo (pp)', kpis?.margemLiquida ?? '—'],
          ['Reembolsos Proximos 30 dias (Kz)', kpis?.reembolsos30d ?? '—'],
        ],
      },
      {
        title: 'OBRIGACOES POR TIPO',
        headers: ['tipo', 'quantidade', 'total_divida_kz'],
        rows: Object.entries(byType).sort((a, b) => b[1].total - a[1].total).map(([t, v]) => [t.replace(/_/g, ' '), v.count, v.total]),
      },
      {
        title: 'LISTAGEM COMPLETA',
        headers: ['Referencia', 'Credor', 'Tipo', 'Montante Total (Kz)', 'Saldo Divida (Kz)', 'Taxa (%)', 'Data Inicio', 'Vencimento', 'Estado'],
        rows: liabilities.map(r => [(r as any).reference || '—', r.creditor_name, r.liability_type, r.total_amount, r.outstanding_amount, r.interest_rate, r.start_date, r.maturity_date, r.status]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Gestão do Passivo Financeiro" onExport={handleExport} breadcrumb="MAIOMBE / Gestão do Passivo"
        showNewButton newLabel="+ Registar Obrigação" onNew={() => setShowForm(p => !p)} />
      <div style={{ padding: '22px 26px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Total Passivo Financeiro" value={kpis?.totalPassivo != null ? formatKz(kpis.totalPassivo / 1e9, false) : '—'} unit="Mil M Kz" delta={`${kpis?.fontesAtivas ?? liabilities.length} fontes activas`} deltaType="nt" variant="gold" />
          <KpiCard label="Reembolsos Próx. 30 dias" value={kpis?.reembolsos30d != null ? formatKz(kpis.reembolsos30d / 1e9, false) : '—'} unit="Mil M Kz" delta="Próximos 30 dias" deltaType="dn" variant="cr" />
          <KpiCard label="Custo Médio do Passivo" value={kpis?.custoMedioPassivo != null ? `${kpis.custoMedioPassivo}%` : '—'} delta="Médio ponderado" deltaType="nt" variant="am" />
          <KpiCard label="Margem Activo vs Passivo" value={kpis?.margemLiquida != null ? `${kpis.margemLiquida > 0 ? '+' : ''}${kpis.margemLiquida}` : '—'} unit=" pp" delta="Spread intermediação" deltaType={kpis?.margemLiquida != null && kpis.margemLiquida > 0 ? 'up' : 'dn'} variant="em" />
        </div>

        {/* Action modal */}
        {actionModal && (() => {
          const cfg = ACTION_CONFIG[actionModal.type];
          return (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ background:'#0D1117', border:`1px solid ${cfg.border}`, borderRadius:12, padding:22, width:440, maxWidth:'95vw' }}>
                <div style={{ fontSize:11, fontWeight:700, color:cfg.color, marginBottom:4 }}>{cfg.label}</div>
                <div style={{ fontSize:9, color:'#7888A0', marginBottom:12 }}>{actionModal.creditor} · {cfg.desc}</div>
                {actionErr && <div style={{ color:'#D43352', fontSize:10, marginBottom:8 }}>{actionErr}</div>}
                {cfg.needsValue && (
                  <input type="number" placeholder={cfg.valuePlaceholder} value={actionValue}
                    onChange={e => setActionValue(e.target.value)}
                    style={{ ...mInp, marginBottom:8 }} />
                )}
                <textarea rows={3} placeholder="Notas / descrição da ocorrência *" value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  style={{ ...mInp, resize:'vertical', marginBottom:12 }} />
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button type="button" onClick={() => { setActionModal(null); setActionNotes(''); setActionValue(''); setActionErr(''); }}
                    style={{ background:'none', border:'1px solid rgba(120,136,160,.2)', borderRadius:6, cursor:'pointer', color:'#7888A0', padding:'7px 14px', fontSize:10 }}>
                    Cancelar
                  </button>
                  <button type="button" disabled={doAction.isPending || !actionNotes.trim()}
                    onClick={() => doAction.mutate({ id: actionModal.id, type: actionModal.type, notes: actionNotes, value: actionValue })}
                    style={{ background: cfg.color === '#D43352' ? 'rgba(212,51,82,.15)' : `rgba(${cfg.color === '#E09020' ? '224,144,32' : '201,168,76'},.15)`, border:`1px solid ${cfg.border}`, borderRadius:6, cursor:'pointer', color:cfg.color, padding:'7px 14px', fontSize:10, fontWeight:700 }}>
                    {doAction.isPending ? <Loader2 size={11} className="spin" /> : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {showForm && (
          <Panel title="Registar Nova Obrigação" style={{ marginBottom: 12 }}>
            <form onSubmit={submitLiability} style={{ padding: 14 }}>
              {formError && <div style={{ color: '#D43352', fontSize: 10, marginBottom: 10 }}>{formError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 200px', gap: 10, marginBottom: 10 }}>
                <input value={form.creditor_name} onChange={e => upd('creditor_name', e.target.value)} placeholder="Nome do Credor" required />
                <select value={form.liability_type} onChange={e => upd('liability_type', e.target.value)}>
                  {LIABILITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <select value={form.payment_frequency} onChange={e => upd('payment_frequency', e.target.value)}>
                  {FREQ_OPTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={{ display:'block', fontSize:8.5, color:'#7888A0', marginBottom:3 }}>Montante Total (Kz)</label>
                  <input type="number" value={form.total_amount} onChange={e => upd('total_amount', e.target.value)} placeholder="0" required /></div>
                <div><label style={{ display:'block', fontSize:8.5, color:'#7888A0', marginBottom:3 }}>Saldo em Dívida (Kz)</label>
                  <input type="number" value={form.outstanding_amount} onChange={e => upd('outstanding_amount', e.target.value)} placeholder="= montante total" /></div>
                <div><label style={{ display:'block', fontSize:8.5, color:'#7888A0', marginBottom:3 }}>Taxa de Juro (% a.a.)</label>
                  <input type="number" step="0.1" value={form.interest_rate} onChange={e => upd('interest_rate', e.target.value)} placeholder="0" /></div>
                <div>
                  <label style={{ display:'block', fontSize:8.5, color: checkMoraRate(+form.late_interest_rate || 0) ? '#E09020' : '#7888A0', marginBottom:3 }}>
                    Taxa de Mora (%/dia)
                  </label>
                  <input type="number" step="0.01" value={form.late_interest_rate} onChange={e => upd('late_interest_rate', e.target.value)} placeholder="0.05"
                    style={{ borderColor: checkMoraRate(+form.late_interest_rate || 0) ? 'rgba(224,144,32,.5)' : undefined }} />
                  {form.late_interest_rate && checkMoraRate(+form.late_interest_rate) && (
                    <div style={{ marginTop: 4 }}>
                      <PolicyAlert violations={[checkMoraRate(+form.late_interest_rate)]} compact />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 160px 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={{ display:'block', fontSize:8.5, color:'#7888A0', marginBottom:3 }}>Data de Início</label>
                  <input type="date" value={form.start_date} onChange={e => upd('start_date', e.target.value)} required /></div>
                <div><label style={{ display:'block', fontSize:8.5, color:'#7888A0', marginBottom:3 }}>Data de Vencimento</label>
                  <input type="date" value={form.maturity_date} onChange={e => upd('maturity_date', e.target.value)} /></div>
                <input value={form.guarantee_given} onChange={e => upd('guarantee_given', e.target.value)} placeholder="Garantia dada (ex: Carteira de crédito, Imóvel...)" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Observações (opcional)" style={{ flex: 1 }} />
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-gold" disabled={createLiability.isPending}>
                  {createLiability.isPending ? <><Loader2 size={11} className="spin" /> A salvar...</> : 'Registar Obrigação'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        <Panel title="Obrigações por Fonte — Gestão Completa de Alto Nível" actions={
          <button onClick={() => setShowForm(p => !p)} style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '5px 9px', fontSize: 8.5 }}>
            + Registar Obrigação
          </button>
        }>
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {liabilities.map(l => {
                const isExpanded = expandedId === l.id;
                const amortized = Math.max(0, l.total_amount - (l.outstanding_amount || l.total_amount));
                const amortizedPct = l.total_amount ? Math.round((amortized / l.total_amount) * 100) : 0;
                const LiabIcon = LIABILITY_ICONS[l.liability_type] || Landmark;
                const isNormal = l.status !== 'em_risco' && l.status !== 'vencido';

                return (
                  <div key={l.id} style={{
                    border: `1px solid ${isNormal ? 'rgba(201,168,76,.12)' : 'rgba(212,51,82,.2)'}`,
                    borderRadius: 10,
                    background: isNormal ? 'rgba(7,9,12,.3)' : 'rgba(212,51,82,.04)',
                    overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }}
                      onClick={() => setExpandedId(isExpanded ? null : l.id)}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                        background: `rgba(${isNormal ? '201,168,76' : '38,184,112'},.13)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><LiabIcon size={18} color={isNormal?'#C9A84C':'#26B870'} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#E5EBF2', marginBottom: 2 }}>{l.creditor_name}</div>
                        <div style={{ fontSize: 8.5, color: '#7888A0' }}>
                          {l.contract_reference || `MAI/PASSIVO/${new Date(l.start_date).getFullYear()}/001`}
                          {l.start_date ? ` · Data: ${formatDate(l.start_date)}` : ''}
                          <span style={{ textTransform: 'capitalize', marginLeft: 6 }}>· {l.liability_type?.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C', fontFamily: 'monospace' }}>
                          {formatKz(l.outstanding_amount || l.total_amount)}
                        </div>
                        <div style={{ fontSize: 8.5, color: '#7888A0' }}>Capital em dívida</div>
                      </div>
                    </div>

                    {/* Terms row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', padding: '0 14px 10px', fontSize: 9 }}>
                      <span style={{ color: '#7888A0' }}>Taxa: <span style={{ color: '#DEB96A' }}>{formatPercent(l.interest_rate)} a.a.</span></span>
                      {l.maturity_date && <span style={{ color: '#7888A0' }}>Prazo: <span style={{ color: '#E5EBF2' }}>{formatDate(l.maturity_date)}</span></span>}
                      {l.payment_frequency && <span style={{ color: '#7888A0' }}>Prestações: <span style={{ color: '#E5EBF2' }}>{l.payment_frequency}</span></span>}
                      {l.next_due_date && <span style={{ color: '#7888A0' }}>Próx. venc.: <span style={{ color: '#E09020' }}>{formatDate(l.next_due_date)}</span></span>}
                      {l.mora_rate && <span style={{ color: '#7888A0' }}>Mora: <span style={{ color: '#D43352' }}>{l.mora_rate}%/dia</span></span>}
                      <span style={{ color: isNormal ? '#26B870' : '#E09020', display:'inline-flex', alignItems:'center', gap:3 }}>
                        {isNormal ? 'Normal · Sem litígio' : <><AlertTriangle size={10} /> Em risco</>}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ padding: '0 14px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#7888A0', marginBottom: 5 }}>
                        <span>Amortizado: {formatKz(amortized, true)} ({amortizedPct}%)</span>
                        <span>Em dívida: {formatKz(l.outstanding_amount || l.total_amount, true)}</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(201,168,76,.09)', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${amortizedPct}%`, background: 'linear-gradient(90deg,#26B870,#178A4A)', borderRadius: 6, transition: 'width .5s' }} />
                      </div>
                    </div>

                    {/* Expanded amortization */}
                    {isExpanded && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(201,168,76,.06)' }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 1, margin: '12px 0 8px' }}>
                          Plano de Amortização
                        </div>
                        {expandedDetail ? (
                          realSchedule.length === 0 ? (
                            <div style={{ color: '#7888A0', fontSize: 10, padding: '8px 0' }}>
                              Plano de amortização ainda não gerado para esta obrigação.
                            </div>
                          ) : (
                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                              <table className="data-table">
                                <thead>
                                  <tr><th>#</th><th>Data Venc.</th><th>Capital (Kz)</th><th>Juros (Kz)</th><th>Prestação Total</th><th>Cap. Residual</th><th>Estado</th></tr>
                                </thead>
                                <tbody>
                                  {realSchedule.map(row => (
                                    <tr key={row.installment_number}>
                                      <td className="td-mono">{row.installment_number}</td>
                                      <td>{formatDate(row.due_date)}</td>
                                      <td className="td-mono">{formatKz(row.capital)}</td>
                                      <td className="td-mono">{formatKz(row.interest)}</td>
                                      <td className="td-mono" style={{ fontWeight: 600 }}>{formatKz(row.total_installment)}</td>
                                      <td className="td-mono">{formatKz(row.residual_capital)}</td>
                                      <td><Badge value={row.status} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        ) : <LoadingSpinner text="A carregar plano..." />}
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          {[
                            { Icon: BarChart2,     label:'Mapa Completo', bg:'rgba(7,9,12,.5)',     border:'rgba(201,168,76,.15)', color:'#7888A0',  action: null as ActionType|null },
                            { Icon: Pencil,        label:'Renegociar',    bg:'rgba(7,9,12,.5)',     border:'rgba(201,168,76,.3)',  color:'#C9A84C',  action: 'renegociar' as ActionType },
                            { Icon: AlertTriangle, label:'Penalidade',    bg:'rgba(7,9,12,.5)',     border:'rgba(224,144,32,.3)', color:'#E09020',  action: 'penalidade' as ActionType },
                            { Icon: Scale,         label:'Litígio',       bg:'rgba(212,51,82,.08)', border:'rgba(212,51,82,.25)', color:'#D43352',  action: 'litigio' as ActionType },
                          ].map(({ Icon, label, bg, border, color, action }) => (
                            <button key={label}
                              onClick={() => action && setActionModal({ type: action, id: l.id, creditor: l.creditor_name })}
                              style={{ display:'flex', alignItems:'center', gap:4, background:bg, border:`1px solid ${border}`, borderRadius:5, cursor: action ? 'pointer' : 'default', color, padding:'4px 9px', fontSize:8.5 }}>
                              <Icon size={10} />{label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {liabilities.length === 0 && (
                <div style={{ textAlign: 'center', color: '#364858', fontSize: 11, padding: 24 }}>
                  Sem obrigações registadas
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Balance chart */}
        <BalanceChart kpis={kpis} />
      </div>
    </>
  );
}





