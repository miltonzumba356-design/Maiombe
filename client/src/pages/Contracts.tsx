import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, CheckCircle, Loader2, Send, MessageSquare, Mail, PenLine, X, Smartphone, Check, Download, Phone, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge, RepaymentTag } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate, formatPercent } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';
import { useCommissionPolicy } from '@/hooks/useCommissionPolicy';
import { PolicyBadge, PolicyAlert } from '@/components/ui/PolicyAlert';

interface ScheduleRow {
  installment_number: number; due_date: string; initial_capital: number;
  amortization: number; interest: number; total_installment: number;
  residual_capital: number; status: string;
}

const TABS = ['Todos', 'Em Vigor', 'Em Formalização'];

function formalizacaoLabel(c: { status: string; amount: number; risk_level?: string }): { label: string; color: string } {
  if (c.status === 'recebidos') return { label: 'Em Vigor', color: '#26B870' };
  if (c.amount > 3_000_000_000) return { label: 'Aguarda Escritura Pública', color: '#D43352' };
  if (c.risk_level === 'alto' || c.risk_level === 'critico') return { label: 'Aguarda Registo Garantia', color: '#E09020' };
  return { label: 'Aguarda Assinatura', color: '#C9A84C' };
}

export default function Contracts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { checkRate } = useCommissionPolicy();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal de assinatura digital
  const [sigModal, setSigModal] = useState<{ contractId: string; contractRef: string } | null>(null);
  const [sigForm, setSigForm] = useState({ signerName: '', signerPhone: '', signerEmail: '', signerRole: 'mutuario', sendVia: 'ambos' as 'whatsapp' | 'email' | 'ambos' });
  const [sigResult, setSigResult] = useState<{ link?: string; sent?: string[]; error?: string } | null>(null);

  const requestSig = useMutation({
    mutationFn: (data: typeof sigForm & { contractId: string; documentTitle: string; documentSummary: string }) =>
      api.post('/signatures/request', data).then(r => r.data.data),
    onSuccess: (d) => {
      setSigResult({ link: d.link, sent: d.sent });
      queryClient.invalidateQueries({ queryKey: ['signatures-latest'] });
    },
    onError: (e: any) => setSigResult({ error: e.response?.data?.message || 'Erro ao enviar pedido de assinatura.' }),
  });

  // Modal de notificação de cobrança
  const [notifModal, setNotifModal] = useState<{ contractId: string; clientName: string; clientPhone: string | null; clientEmail: string | null } | null>(null);
  const [notifForm, setNotifForm] = useState({ phone: '', email: '', channel: 'cobranca' as const, message: '' });
  const [notifResult, setNotifResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  const sendNotif = useMutation({
    mutationFn: async (f: typeof notifForm & { contractId: string }) => {
      const tasks = [];
      if (f.phone) tasks.push(api.post('/notifications/whatsapp', { phone: f.phone, message: f.message, contractId: f.contractId, channel: f.channel, recipientName: notifModal?.clientName }));
      if (f.email) tasks.push(api.post('/notifications/email', { to: f.email, subject: `Cobrança — ${notifModal?.clientName}`, title: 'Aviso de Cobrança', body: f.message, contractId: f.contractId, channel: f.channel, recipientName: notifModal?.clientName }));
      return Promise.all(tasks);
    },
    onSuccess: () => setNotifResult({ ok: true }),
    onError: (e: any) => setNotifResult({ error: e.response?.data?.message || 'Erro ao enviar notificação.' }),
  });

  const approveDisbursement = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      api.patch(`/contracts/${id}/approve-disbursement`, { disbursement_date: date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts-manage'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', approvingId] });
      setApprovingId(null);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['contracts-manage'],
    queryFn: () => api.get('/contracts', { params: { limit: 100 } }).then(r => r.data),
  });

  const { data: sigStatuses } = useQuery<Record<string, { status: string; signerName: string; signedAt: string | null; expiresAt: string }>>({
    queryKey: ['signatures-latest'],
    queryFn: () => api.get('/signatures/latest-by-contracts').then(r => r.data.data),
    staleTime: 30_000,
  });

  const { data: schedule } = useQuery<ScheduleRow[]>({
    queryKey: ['schedule', expanded],
    queryFn: () => api.get(`/contracts/${expanded}/schedule`).then(r => r.data.data),
    enabled: !!expanded,
  });

  const allContracts = (data?.data || []) as Array<{
    id: string; reference: string; client_name: string; client_phone: string | null; client_email: string | null;
    contract_type: string; amount: number; interest_rate: number; celebration_date: string;
    term_months: number; payment_frequency: string; repayment_methods: string; status: string;
    risk_level: string; object: string; grace_period_months: number;
  }>;

  const ativos = allContracts.filter(c => c.status === 'recebidos').length;
  const formalizacao = allContracts.filter(c => c.status === 'elaboracao');
  const assinados = allContracts.filter(c => c.status === 'recebidos').length;
  const inadimplentes = allContracts.filter(c => c.status === 'recebidos' && (c.risk_level === 'alto' || c.risk_level === 'critico')).length;

  const tabFilter = ['', 'recebidos', 'elaboracao'];
  const contracts = tab === 0 ? allContracts : allContracts.filter(c => c.status === tabFilter[tab]);

  async function handleExport() {
    const byStatus: Record<string, number> = {};
    allContracts.forEach(c => { byStatus[c.status || 'outro'] = (byStatus[c.status || 'outro'] || 0) + 1; });
    const byType: Record<string, number> = {};
    allContracts.forEach(c => { byType[c.contract_type || 'outro'] = (byType[c.contract_type || 'outro'] || 0) + 1; });
    await downloadExcel('MAIOMBE_Contratos_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Contratos', allContracts.length],
          ['Contratos Activos (Em Vigor)', ativos],
          ['Em Formalização', formalizacao.length],
          ['Assinados Digitalmente', assinados],
          ['Em Incumprimento', inadimplentes],
          ['Valor Total Carteira (Kz)', allContracts.reduce((a, c) => a + (c.amount || 0), 0)],
        ],
      },
      {
        title: 'CONTRATOS POR ESTADO',
        headers: ['estado', 'quantidade'],
        rows: Object.entries(byStatus).map(([s, n]) => [s.replace(/_/g, ' '), n]),
      },
      {
        title: 'CONTRATOS POR TIPO',
        headers: ['tipo', 'quantidade'],
        rows: Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => [t.replace(/_/g, ' '), n]),
      },
      {
        title: 'CONTRATOS EM FORMALIZACAO',
        headers: ['Referencia', 'Mutuario', 'Tipo', 'Valor (Kz)', 'Taxa (%)', 'Estado Formalizacao'],
        rows: formalizacao.map(c => [c.reference, c.client_name, c.contract_type, c.amount, c.interest_rate, formalizacaoLabel(c).label]),
      },
      {
        title: 'LISTAGEM COMPLETA',
        headers: ['Referencia', 'Mutuario', 'Tipo', 'Valor (Kz)', 'Taxa (%)', 'Prazo (meses)', 'Data Inicio', 'Estado'],
        rows: allContracts.map(r => [r.reference, r.client_name, r.contract_type, r.amount, r.interest_rate, r.term_months, r.celebration_date, r.status]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Gestão de Contratos" breadcrumb="MAIOMBE / Gestão de Contratos" onExport={handleExport} />
      <div style={{ padding: '22px 26px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Contratos Activos" value={ativos} delta={ativos > 0 ? `${ativos} em vigor` : 'Sem contratos'} deltaType="up" variant="gold" />
          <KpiCard label="Em Formalização" value={formalizacao.length} delta="Aguardam assinatura" deltaType="nt" variant="am" />
          <KpiCard label="Assinados Digitalmente" value={assinados} delta={allContracts.length > 0 ? `${Math.round(assinados / allContracts.length * 100)}% do total` : '—'} deltaType="up" variant="em" />
          <KpiCard label="Em Incumprimento" value={inadimplentes} delta={inadimplentes > 0 ? 'Acção em curso' : 'Sem incumprimentos'} deltaType="dn" variant="cr" />
        </div>

        {formalizacao.length > 0 && (
          <Panel title="Contratos em Formalização — Pendentes de Assinatura" tag={`${formalizacao.length} Pendentes`} tagVariant="am" style={{ marginBottom: 12 }}>
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Referência</th><th>Mutuário</th><th>Modelo</th><th>Valor (Kz)</th>
                    <th>Taxa</th><th>Estado Formalização</th><th>Data Limite</th><th>Acção</th>
                  </tr>
                </thead>
                <tbody>
                  {formalizacao.map(c => (
                    <tr key={c.id}>
                      <td className="td-mono td-bold">{c.reference}</td>
                      <td>{c.client_name}</td>
                      <td><span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, background: 'rgba(201,168,76,.12)', color: '#DEB96A', border: '1px solid rgba(201,168,76,.2)' }}>{c.contract_type?.replace(/_/g, ' ')}</span></td>
                      <td className="td-mono">{formatKz(c.amount)}</td>
                      <td className="td-mono">{formatPercent(c.interest_rate)}</td>
                      <td>{(() => { const fl = formalizacaoLabel(c); return <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, background: `${fl.color}18`, color: fl.color, border: `1px solid ${fl.color}40` }}>{fl.label}</span>; })()}</td>
                      <td style={{ color: '#E09020' }}>{c.celebration_date ? formatDate(c.celebration_date) : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {approvingId === c.id ? (
                            <>
                              <input
                                type="date"
                                value={disbursementDate}
                                onChange={e => setDisbursementDate(e.target.value)}
                                style={{ height: 24, fontSize: 9, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.3)', borderRadius: 4, color: '#E5EBF2', padding: '0 5px' }}
                              />
                              <button
                                disabled={approveDisbursement.isPending}
                                onClick={() => approveDisbursement.mutate({ id: c.id, date: disbursementDate })}
                                style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 5, cursor: 'pointer', color: '#26B870', padding: '3px 8px', fontSize: 8.5 }}>
                                {approveDisbursement.isPending ? <Loader2 size={9} className="spin" /> : <CheckCircle size={9} />} Confirmar
                              </button>
                              <button onClick={() => setApprovingId(null)} style={{ background: 'none', border: '1px solid rgba(120,136,160,.2)', borderRadius: 5, cursor: 'pointer', color: '#7888A0', padding: '3px 6px', fontSize: 8.5, display: 'flex', alignItems: 'center' }}><X size={9} /></button>
                            </>
                          ) : (
                            <>
                              {(() => {
                                const sig = sigStatuses?.[c.id];
                                if (sig?.status === 'assinado') {
                                  return (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(38,184,112,.12)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 5, color: '#26B870', padding: '3px 8px', fontSize: 8.5 }}>
                                      <CheckCircle size={9} /> Assinado
                                    </span>
                                  );
                                }
                                if (sig?.status === 'pendente') {
                                  return (
                                    <button
                                      title={`Pedido enviado a ${sig.signerName} — aguarda assinatura`}
                                      onClick={() => { setSigModal({ contractId: c.id, contractRef: c.reference }); setSigForm({ signerName: c.client_name, signerPhone: c.client_phone || '', signerEmail: c.client_email || '', signerRole: 'mutuario', sendVia: 'ambos' }); setSigResult(null); }}
                                      style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(224,144,32,.1)', border: '1px solid rgba(224,144,32,.3)', borderRadius: 5, cursor: 'pointer', color: '#E09020', padding: '3px 8px', fontSize: 8.5 }}>
                                      <PenLine size={9} /> Aguarda Assinatura
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    onClick={() => { setSigModal({ contractId: c.id, contractRef: c.reference }); setSigForm({ signerName: c.client_name, signerPhone: c.client_phone || '', signerEmail: c.client_email || '', signerRole: 'mutuario', sendVia: 'ambos' }); setSigResult(null); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 5, cursor: 'pointer', color: '#DEB96A', padding: '3px 8px', fontSize: 8.5 }}>
                                    <PenLine size={9} /> Enviar p/ Assinar
                                  </button>
                                );
                              })()}
                              <button
                                onClick={() => setApprovingId(c.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(38,184,112,.1)', border: '1px solid rgba(38,184,112,.2)', borderRadius: 5, cursor: 'pointer', color: '#26B870', padding: '3px 8px', fontSize: 8.5 }}>
                                <CheckCircle size={9} /> Aprovar Desembolso
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <Panel
          title="Todos os Contratos — Histórico Completo"
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 6, cursor: 'pointer', color: '#7888A0', padding: '4px 9px', fontSize: 8.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Download size={10} /> Exportar
              </button>
              <button onClick={() => navigate('/elaboracao')} style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '4px 9px', fontSize: 8.5 }}>
                + Novo Contrato
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px 0', borderBottom: '1px solid rgba(201,168,76,.08)' }}>
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(i)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px',
                  fontSize: 9.5, color: tab === i ? '#C9A84C' : '#7888A0',
                  borderBottom: tab === i ? '2px solid #C9A84C' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t} ({i === 0 ? allContracts.length : allContracts.filter(c => c.status === tabFilter[i]).length})
              </button>
            ))}
          </div>

          {isLoading ? <LoadingSpinner /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {contracts.map(c => (
                <div key={c.id} style={{ borderBottom: '1px solid rgba(201,168,76,.06)' }}>
                  <div
                    style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 14px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#DEB96A', fontFamily: 'monospace', minWidth: 110 }}>{c.reference}</span>
                    <span style={{ fontSize: 10.5, color: '#fff', minWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.client_name}</span>
                    <span style={{ fontSize: 9, color: '#7888A0' }}>{formatDate(c.celebration_date)}</span>
                    <RepaymentTag methods={c.repayment_methods} />
                    <Badge value={c.status} />
                    <Badge value={c.risk_level} type="risk" />
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#DEB96A', fontFamily: 'monospace' }}>
                      {formatKz(c.amount)} Kz
                    </span>
                    <span style={{ fontSize: 10, color: '#7888A0', display: 'flex', alignItems: 'center' }}>
                      {formatPercent(c.interest_rate)} a.a.
                      <PolicyBadge violation={checkRate(c.interest_rate)} />
                    </span>
                    {expanded === c.id ? <ChevronUp size={13} color="#7888A0" /> : <ChevronDown size={13} color="#7888A0" />}
                  </div>

                  {expanded === c.id && (
                    <div style={{ padding: '0 14px 16px', background: 'rgba(7,9,12,.25)' }}>
                      {checkRate(c.interest_rate) && (
                        <div style={{ marginBottom: 12 }}>
                          <PolicyAlert violations={[checkRate(c.interest_rate)]} />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        <button
                          onClick={() => {
                            setNotifModal({ contractId: c.id, clientName: c.client_name, clientPhone: c.client_phone || null, clientEmail: c.client_email || null });
                            setNotifForm({ phone: c.client_phone || '', email: c.client_email || '', channel: 'cobranca', message: `Estimado/a ${c.client_name},\n\nVimos por este meio informar que existe uma prestação em atraso referente ao contrato ${c.reference}.\n\nAgradecemos que regularize a sua situação o mais brevemente possível.\n\nMAIOMBE — Sistema de Gestão de Crédito` });
                            setNotifResult(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(28,58,110,.3)', border: '1px solid rgba(122,166,255,.2)', borderRadius: 6, cursor: 'pointer', color: '#7AA6FF', padding: '5px 11px', fontSize: 9.5 }}>
                          <MessageSquare size={10} /> Notificar Mutuário
                        </button>
                        {c.status === 'elaboracao' && (
                          <button
                            onClick={() => { setSigModal({ contractId: c.id, contractRef: c.reference }); setSigForm({ signerName: c.client_name, signerPhone: c.client_phone || '', signerEmail: c.client_email || '', signerRole: 'mutuario', sendVia: 'ambos' }); setSigResult(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '5px 11px', fontSize: 9.5 }}>
                            <PenLine size={10} /> Pedir Assinatura Digital
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 14 }}>
                        {[
                          { label: 'Tipo', value: c.contract_type?.replace(/_/g, ' ') },
                          { label: 'Início', value: formatDate(c.celebration_date) },
                          { label: 'Prazo', value: `${c.term_months} meses` },
                          { label: 'Frequência', value: c.payment_frequency },
                          { label: 'Carência', value: `${c.grace_period_months || 0} meses` },
                        ].map((d, i) => (
                          <div key={i} style={{ background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.06)', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 1.2, color: '#7888A0', marginBottom: 3 }}>{d.label}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#E5EBF2', textTransform: 'capitalize' }}>{d.value || '—'}</div>
                          </div>
                        ))}
                      </div>
                      {c.object && (
                        <div style={{ fontSize: 9.5, color: '#7888A0', marginBottom: 12, padding: '8px 10px', background: 'rgba(7,9,12,.3)', borderRadius: 6 }}>
                          {c.object}
                        </div>
                      )}
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        Plano de Amortização
                      </div>
                      {schedule ? (
                        <div style={{ overflow: 'auto', maxHeight: 300 }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>#</th><th>Data Venc.</th><th>Capital (Kz)</th>
                                <th>Juros (Kz)</th><th>Prestação Total</th><th>Cap. Residual</th><th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.map((row: ScheduleRow) => (
                                <tr key={row.installment_number}>
                                  <td className="td-mono">{row.installment_number}</td>
                                  <td>{formatDate(row.due_date)}</td>
                                  <td className="td-mono">{formatKz(row.amortization)}</td>
                                  <td className="td-mono">{formatKz(row.interest)}</td>
                                  <td className="td-mono td-bold">{formatKz(row.total_installment)}</td>
                                  <td className="td-mono">{formatKz(row.residual_capital)}</td>
                                  <td><Badge value={row.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <LoadingSpinner text="A carregar plano..." />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── MODAL: Pedido de Assinatura Digital ───────────────────────────────── */}
      {sigModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 480, background: '#141820', border: '1px solid rgba(201,168,76,.25)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#1A7A3C', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PenLine size={16} color="#FFC72C" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Pedido de Assinatura Digital</span>
              </div>
              <button onClick={() => { setSigModal(null); setSigResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {!sigResult ? (
                <>
                  <div style={{ fontSize: 11, color: '#7888A0', marginBottom: 14 }}>Contrato: <strong style={{ color: '#DEB96A' }}>{sigModal.contractRef}</strong></div>
                  {([
                    { field: 'signerName', label: 'Nome do Signatário *', fromClient: true },
                    { field: 'signerPhone', label: 'Telefone (WhatsApp)', fromClient: !!sigForm.signerPhone },
                    { field: 'signerEmail', label: 'Email', fromClient: !!sigForm.signerEmail },
                    { field: 'signerRole', label: 'Cargo/Papel', fromClient: false },
                  ] as const).map(({ field, label, fromClient }) => (
                    <div key={field} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: 10, color: '#7888A0' }}>{label}</label>
                        {fromClient && <span style={{ fontSize: 9, color: '#26B870', background: 'rgba(38,184,112,.1)', border: '1px solid rgba(38,184,112,.2)', borderRadius: 10, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={9} /> do cadastro</span>}
                        {(field === 'signerPhone' || field === 'signerEmail') && !fromClient && (
                          <span style={{ fontSize: 9, color: '#E09020', background: 'rgba(224,144,32,.08)', border: '1px solid rgba(224,144,32,.2)', borderRadius: 10, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={9} /> Não cadastrado</span>
                        )}
                      </div>
                      <input
                        value={sigForm[field]}
                        placeholder={(field === 'signerPhone' || field === 'signerEmail') && !fromClient ? 'Introduza manualmente' : ''}
                        onChange={e => setSigForm(p => ({ ...p, [field]: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: `1px solid ${fromClient ? 'rgba(38,184,112,.3)' : 'rgba(201,168,76,.2)'}`, borderRadius: 6, color: '#E5EBF2', padding: '6px 10px', fontSize: 12 }}
                      />
                    </div>
                  ))}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 10, color: '#7888A0', marginBottom: 4 }}>Enviar via</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['ambos', 'whatsapp', 'email'] as const).map(v => (
                        <button key={v} onClick={() => setSigForm(p => ({ ...p, sendVia: v }))}
                          style={{ flex: 1, padding: '5px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: sigForm.sendVia === v ? '1px solid #26B870' : '1px solid rgba(120,136,160,.2)', background: sigForm.sendVia === v ? 'rgba(38,184,112,.15)' : 'transparent', color: sigForm.sendVia === v ? '#26B870' : '#7888A0' }}>
                          {v === 'ambos' ? 'WhatsApp + Email' : v === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    disabled={requestSig.isPending || !sigForm.signerName}
                    onClick={() => requestSig.mutate({
                      ...sigForm,
                      contractId: sigModal.contractId,
                      documentTitle: `Contrato de Crédito ${sigModal.contractRef}`,
                      documentSummary: `Contrato de crédito referência ${sigModal.contractRef}. Por favor reveja e assine electronicamente.`,
                    })}
                    style={{ width: '100%', background: '#26B870', border: 'none', borderRadius: 8, color: '#fff', padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {requestSig.isPending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                    Enviar Pedido de Assinatura
                  </button>
                </>
              ) : sigResult.error ? (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ color: '#D43352', marginBottom: 10 }}>{sigResult.error}</div>
                  <button onClick={() => setSigResult(null)} style={{ background: 'rgba(212,51,82,.15)', border: '1px solid rgba(212,51,82,.3)', borderRadius: 6, color: '#D43352', padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>Tentar novamente</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><CheckCircle size={32} color="#26B870" /></div>
                  <div style={{ color: '#26B870', fontWeight: 700, marginBottom: 12 }}>Pedido enviado com sucesso!</div>
                  {sigResult.sent?.map((s, i) => <div key={i} style={{ fontSize: 11, color: '#7888A0', marginBottom: 4 }}>{s}</div>)}
                  <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(7,9,12,.5)', borderRadius: 6, fontSize: 10, color: '#7888A0', wordBreak: 'break-all' }}>
                    <div style={{ marginBottom: 4, color: '#C9A84C', fontWeight: 700 }}>Link de assinatura:</div>
                    {sigResult.link}
                  </div>
                  <button onClick={() => { setSigModal(null); setSigResult(null); }} style={{ marginTop: 14, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 6, color: '#26B870', padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>Fechar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Notificação de Cobrança ────────────────────────────────────── */}
      {notifModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 440, background: '#141820', border: '1px solid rgba(201,168,76,.25)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#1C3A6E', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={16} color="#7AA6FF" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Notificação de Cobrança</span>
              </div>
              <button onClick={() => { setNotifModal(null); setNotifResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {!notifResult ? (
                <>
                  <div style={{ padding: '10px 14px', background: 'rgba(7,9,12,.4)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 9, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Mutuário</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#DEB96A', marginBottom: 4 }}>{notifModal.clientName}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {notifModal.clientPhone
                        ? <span style={{ fontSize: 10, color: '#26B870', display: 'flex', alignItems: 'center', gap: 4 }}><Smartphone size={10} /> {notifModal.clientPhone}</span>
                        : <span style={{ fontSize: 10, color: '#D43352', display: 'flex', alignItems: 'center', gap: 4 }}><Smartphone size={10} /> Telefone não cadastrado</span>}
                      {notifModal.clientEmail
                        ? <span style={{ fontSize: 10, color: '#26B870', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} /> {notifModal.clientEmail}</span>
                        : <span style={{ fontSize: 10, color: '#D43352', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} /> Email não cadastrado</span>}
                    </div>
                  </div>
                  {[
                    { key: 'phone', label: 'Telefone (WhatsApp)', placeholder: 'Do cadastro', fromClient: !!notifModal.clientPhone },
                    { key: 'email', label: 'Email', placeholder: 'Do cadastro', fromClient: !!notifModal.clientEmail },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: 10, color: '#7888A0' }}>{f.label}</label>
                        {f.fromClient && <span style={{ fontSize: 9, color: '#26B870', background: 'rgba(38,184,112,.1)', border: '1px solid rgba(38,184,112,.2)', borderRadius: 10, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={9} /> do cadastro</span>}
                      </div>
                      <input
                        value={(notifForm as any)[f.key]}
                        placeholder={f.fromClient ? '' : 'Não cadastrado — introduza manualmente'}
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
                      rows={4}
                      style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#E5EBF2', padding: '8px 10px', fontSize: 12, resize: 'vertical' }}
                    />
                  </div>
                  <button
                    disabled={sendNotif.isPending || !notifForm.message || (!notifForm.phone && !notifForm.email)}
                    onClick={() => sendNotif.mutate({ ...notifForm, contractId: notifModal.contractId })}
                    style={{ width: '100%', background: '#1C3A6E', border: '1px solid rgba(122,166,255,.3)', borderRadius: 8, color: '#7AA6FF', padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {sendNotif.isPending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                    Enviar Notificação
                  </button>
                </>
              ) : notifResult.error ? (
                <div style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ color: '#D43352', marginBottom: 10 }}>{notifResult.error}</div>
                  <button onClick={() => setNotifResult(null)} style={{ background: 'rgba(212,51,82,.15)', border: '1px solid rgba(212,51,82,.3)', borderRadius: 6, color: '#D43352', padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>Tentar novamente</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(38,184,112,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Send size={28} color="#26B870" /></div>
                  <div style={{ color: '#26B870', fontWeight: 700, marginBottom: 8 }}>Notificação enviada!</div>
                  <button onClick={() => { setNotifModal(null); setNotifResult(null); }} style={{ background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 6, color: '#26B870', padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>Fechar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}





