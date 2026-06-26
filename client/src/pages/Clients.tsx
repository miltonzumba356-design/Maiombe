import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ClipboardList, Mail, Download, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate, getEntityTypeLabel } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const RISK_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  baixo: { bg: 'rgba(38,184,112,.12)', color: '#26B870', label: 'Baixo' },
  medio: { bg: 'rgba(224,144,32,.1)', color: '#E09020', label: 'Médio' },
  alto:  { bg: 'rgba(212,51,82,.12)', color: '#D43352', label: 'Alto' },
};

const REPAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  ot: 'OT',
  bt: 'BT',
  mix: 'OT + Cash',
};

const EMAIL_ALERTS = [
  { label: 'Alertas Preventivos', opts: ['30d', '15d', '7d', '3d', '1d'] },
  { label: 'Alertas Pós-Incumprimento', opts: ['D+1', 'D+7', 'D+15 (formal)', 'D+30 (pré-judicial)'] },
  { label: 'Cópia Automática (CC)', opts: ['Dir. Financeiro', 'Jurídico', 'Gestor de Conta'] },
];

interface Client {
  id: string; name: string; entity_type: string; nif: string;
  contract_count: number; total_exposure: number; risk_level: string;
  contact_email: string; repayment_methods?: string; execution_pct?: number;
  next_due_date?: string; amortized?: number; outstanding?: number;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

const GRAD_COLORS = ['#26B870,#178A4A', '#C9A84C,#A07830', '#D43352,#9E1F38', '#5B9CF6,#3460A0', '#E09020,#A05C0C'];

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    nif: '',
    entity_type: 'empresa_privada',
    legal_representative: '',
    province: '',
    email: '',
    phone: '',
    address: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.get('/clients', { params: { search: search || undefined, limit: 50 } }).then(r => r.data.data),
  });

  const clients: Client[] = data?.data || [];
  const total = data?.total;

  const { data: clientContractsData } = useQuery({
    queryKey: ['client-contracts', selectedId],
    queryFn: () => api.get('/contracts', { params: { limit: 200 } }).then(r => r.data.data?.data || []),
    enabled: !!selectedId,
  });
  const clientContracts = ((clientContractsData || []) as Array<{
    id: string; reference: string; client_id: string; amount: number;
    interest_rate: number; celebration_date: string; status: string;
    term_months: number; payment_frequency: string; risk_level: string;
  }>).filter(c => c.client_id === selectedId);

  const { data: contractSchedule } = useQuery<Array<{
    installment_number: number; due_date: string; amortization: number;
    interest: number; total_installment: number; residual_capital: number; status: string;
  }>>({
    queryKey: ['client-schedule', expandedContractId],
    queryFn: () => api.get(`/contracts/${expandedContractId}/schedule`).then(r => r.data.data),
    enabled: !!expandedContractId,
  });

  const selected = selectedId ? clients.find(c => c.id === selectedId) : null;
  const inDefault = clients.filter(c => c.risk_level === 'alto').length;
  const onTime = clients.filter(c => c.risk_level === 'baixo').length;

  const createClient = useMutation({
    mutationFn: () => api.post('/clients', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-select'] });
      setShowForm(false);
      setErrorMsg('');
      setForm({
        name: '',
        nif: '',
        entity_type: 'empresa_privada',
        legal_representative: '',
        province: '',
        email: '',
        phone: '',
        address: '',
      });
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || 'Erro ao cadastrar cliente'),
  });

  function updateForm(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function submitClient(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.nif || !form.entity_type) {
      setErrorMsg('Preencha nome, NIF e tipo de entidade.');
      return;
    }
    createClient.mutate();
  }

  async function handleExport() {
    const byType: Record<string, number> = {};
    clients.forEach(c => { byType[c.entity_type || 'outro'] = (byType[c.entity_type || 'outro'] || 0) + 1; });
    await downloadExcel('MAIOMBE_Clientes_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Clientes', clients.length],
          ['Com Contratos Activos', clients.filter(c => (c as any).contracts_count > 0).length],
          ['Entidades Publicas', clients.filter(c => ['governo_central', 'ministerio', 'governo_provincial', 'administracao_municipal', 'empresa_publica'].includes(c.entity_type)).length],
          ['Entidades Privadas', clients.filter(c => c.entity_type === 'empresa_privada' || c.entity_type === 'particular').length],
        ],
      },
      {
        title: 'CLIENTES POR TIPO DE ENTIDADE',
        headers: ['tipo_entidade', 'quantidade'],
        rows: Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => [t.replace(/_/g, ' '), n]),
      },
      {
        title: 'LISTAGEM COMPLETA DE CLIENTES',
        headers: ['Nome', 'Tipo de Entidade', 'NIF', 'Email', 'Telefone'],
        rows: clients.map(r => [r.name, r.entity_type?.replace(/_/g, ' '), r.nif, r.contact_email, r.phone]),
      },
    ]);
  }
  return (
    <>
      <TopBar onExport={handleExport}
        title="Crédito Cedido — Gestão Individual de Clientes"
        breadcrumb="MAIOMBE / Clientes"
        showNewButton
        newLabel="+ Novo Cliente"
        onNew={() => setShowForm(prev => !prev)}
      />
      <div style={{ padding: '22px 26px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Clientes Registados" value={total ?? clients.length} delta={clients.length > 0 ? `${clients.length} carregados` : 'Sem clientes'} deltaType="up" variant="gold" />
          <KpiCard label="Clientes em Dia" value={onTime} delta={clients.length > 0 ? `${Math.round(onTime / clients.length * 100)}% do total` : '—'} deltaType="up" variant="em" />
          <KpiCard label="Em Incumprimento" value={inDefault} delta={inDefault > 0 ? 'Acção activa' : 'Sem incumprimentos'} deltaType="dn" variant="cr" />
          <KpiCard label="Exposição Total" value={clients.length > 0 ? (clients.reduce((a, c) => a + (c.total_exposure || 0), 0) / 1e9).toFixed(1) : '—'} unit="Mil M Kz" delta="Carteira activa" deltaType="nt" variant="gold" />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#7888A0' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar cliente..."
              style={{ paddingLeft: 27, height: 26, fontSize: 10, width: 200 }} />
          </div>
        </div>

        {showForm && (
          <Panel title="Cadastrar Cliente" style={{ marginBottom: 12 }}>
            <form onSubmit={submitClient} style={{ padding: 14 }}>
              {errorMsg && <div style={{ color: '#D43352', fontSize: 10, marginBottom: 10 }}>{errorMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 220px', gap: 10, marginBottom: 10 }}>
                <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Nome / entidade" required />
                <input value={form.nif} onChange={e => updateForm('nif', e.target.value)} placeholder="NIF" required />
                <select value={form.entity_type} onChange={e => updateForm('entity_type', e.target.value)} required>
                  <option value="governo_central">Governo Central</option>
                  <option value="ministerio">Ministério</option>
                  <option value="governo_provincial">Governo Provincial</option>
                  <option value="administracao_municipal">Administração Municipal</option>
                  <option value="empresa_publica">Empresa Pública</option>
                  <option value="empresa_dominio_publico">Empresa Domínio Público</option>
                  <option value="empresa_privada">Empresa Privada</option>
                  <option value="particular">Particular</option>
                  <option value="entidade_mista">Entidade Mista</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 180px 180px', gap: 10, marginBottom: 10 }}>
                <input value={form.legal_representative} onChange={e => updateForm('legal_representative', e.target.value)} placeholder="Representante legal" />
                <input value={form.province} onChange={e => updateForm('province', e.target.value)} placeholder="Província" />
                <input value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="Email" type="email" />
                <input value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="Telefone" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="Morada / sede" style={{ flex: 1 }} />
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-gold" disabled={createClient.isPending}>
                  {createClient.isPending ? 'A salvar...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        {isLoading ? <LoadingSpinner /> : (
          <>
            {/* Client cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
              {clients.map((c, idx) => {
                const risk = RISK_CONFIG[c.risk_level] || RISK_CONFIG.baixo;
                const grad = GRAD_COLORS[idx % GRAD_COLORS.length];
                const execPct = c.execution_pct ?? 0;
                const outstanding = c.outstanding ?? 0;
                const amortized = c.amortized ?? 0;
                const isSelected = selectedId === c.id;

                return (
                  <div key={c.id}
                    onClick={() => setSelectedId(isSelected ? null : c.id)}
                    style={{
                      background: isSelected ? 'rgba(201,168,76,.05)' : 'rgba(7,9,12,.4)',
                      border: `1px solid ${isSelected ? 'rgba(201,168,76,.3)' : 'rgba(201,168,76,.08)'}`,
                      borderRadius: 10, padding: 12, cursor: 'pointer',
                      transition: 'all .2s',
                    }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: `linear-gradient(135deg,${grad})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff',
                      }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: '#E5EBF2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize: 8.5, color: '#7888A0' }}>{getEntityTypeLabel(c.entity_type)}</div>
                      </div>
                      <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, background: risk.bg, color: risk.color, border: `1px solid ${risk.color}33`, flexShrink: 0 }}>
                        {risk.label}
                      </span>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      {[
                        { v: formatKz(c.total_exposure, true), l: 'Capital' },
                        { v: `${execPct}%`, l: 'Exec.', color: execPct >= 80 ? '#D43352' : execPct >= 50 ? '#E09020' : '#26B870' },
                        { v: c.risk_level === 'baixo' ? 'OK' : c.risk_level === 'alto' ? 'VCD' : '!', l: c.risk_level === 'baixo' ? 'Em dia' : c.risk_level === 'alto' ? 'Vencido' : 'Atraso', color: c.risk_level === 'baixo' ? '#26B870' : c.risk_level === 'alto' ? '#D43352' : '#E09020' },
                      ].map((stat, i) => (
                        <div key={i} style={{ flex: 1, background: 'rgba(7,9,12,.5)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: (stat as { color?: string }).color || '#E5EBF2' }}>{stat.v}</div>
                          <div style={{ fontSize: 7.5, color: '#7888A0' }}>{stat.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress */}
                    <div style={{
                      padding: 7, background: c.risk_level !== 'baixo' ? `rgba(${c.risk_level === 'alto' ? '212,51,82' : '224,144,32'},.07)` : 'rgba(7,9,12,.5)',
                      border: `1px solid rgba(${c.risk_level === 'alto' ? '212,51,82' : c.risk_level === 'medio' ? '224,144,32' : '201,168,76'},.15)`,
                      borderRadius: 4, marginBottom: 8,
                    }}>
                      {c.next_due_date && (
                        <div style={{ fontSize: 8.5, color: c.risk_level === 'baixo' ? '#7888A0' : c.risk_level === 'alto' ? '#D43352' : '#E09020', marginBottom: 3 }}>
                          {c.risk_level !== 'baixo' && <AlertTriangle size={9} style={{ marginRight: 3 }} />}{c.risk_level === 'alto' ? 'Vencimento: ' : c.risk_level === 'medio' ? 'Próx. prestação: ' : 'Próx. prestação: '}
                          {formatDate(c.next_due_date)}
                        </div>
                      )}
                      <div style={{ height: 3, background: 'rgba(201,168,76,.09)', borderRadius: 4, overflow: 'hidden', marginBottom: 3 }}>
                        <div style={{ height: '100%', width: `${execPct}%`, background: execPct >= 80 ? '#D43352' : '#26B870', borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 8, color: '#7888A0' }}>
                        Amortizado: {formatKz(amortized, true)} / Residual: {formatKz(outstanding, true)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={e => { e.stopPropagation(); navigate(`/clientes/${c.id}`); }} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:5, cursor:'pointer', color:'#DEB96A', padding:'3px 7px', fontSize:8.5 }}><ExternalLink size={10} /> Ver Detalhe</button>
                      <button onClick={e => e.stopPropagation()} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, background:'rgba(7,9,12,.5)', border:'1px solid rgba(201,168,76,.15)', borderRadius:5, cursor:'pointer', color:'#7888A0', padding:'3px 7px', fontSize:8.5 }}><Mail size={10} /> Email</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected client real contracts + schedule */}
            {selected && (
              <Panel title={`Contratos — ${selected.name}`}
                actions={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(7,9,12,.5)', border:'1px solid rgba(201,168,76,.15)', borderRadius:6, cursor:'pointer', color:'#7888A0', padding:'4px 9px', fontSize:8.5 }}><Mail size={10} /> Enviar Extracto</button>
                    <button style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(201,168,76,.15)', border:'1px solid rgba(201,168,76,.25)', borderRadius:6, cursor:'pointer', color:'#DEB96A', padding:'4px 9px', fontSize:8.5 }}><Download size={10} /> PDF</button>
                  </div>
                }
                style={{ marginBottom: 12 }}>
                {clientContracts.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#364858', fontSize: 11, padding: 24 }}>
                    Sem contratos registados para este cliente
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {clientContracts.map(c => (
                      <div key={c.id} style={{ borderBottom: '1px solid rgba(201,168,76,.06)' }}>
                        <div
                          style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 14px', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => {
                            const next = expandedContractId === c.id ? null : c.id;
                            setExpandedContractId(next);
                          }}
                        >
                          <span style={{ fontFamily: 'monospace', color: '#DEB96A', fontSize: 11, fontWeight: 700, minWidth: 110 }}>{c.reference}</span>
                          <Badge value={c.status} />
                          <Badge value={c.risk_level} type="risk" />
                          <span style={{ fontSize: 9, color: '#7888A0' }}>{formatDate(c.celebration_date)}</span>
                          <span style={{ fontSize: 9, color: '#7888A0' }}>{c.term_months} meses · {c.payment_frequency}</span>
                          <span style={{ fontSize: 11, color: '#DEB96A', fontFamily: 'monospace', marginLeft: 'auto', fontWeight: 700 }}>{formatKz(c.amount)} Kz</span>
                          <span style={{ fontSize: 9, color: '#7888A0' }}>{c.interest_rate}% a.a.</span>
                          {expandedContractId === c.id ? <ChevronUp size={13} color="#7888A0" /> : <ChevronDown size={13} color="#7888A0" />}
                        </div>
                        {expandedContractId === c.id && (
                          <div style={{ padding: '0 14px 16px', background: 'rgba(7,9,12,.25)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                              Plano de Amortização
                            </div>
                            {contractSchedule ? (
                              contractSchedule.length === 0 ? (
                                <div style={{ color: '#7888A0', fontSize: 10, padding: '12px 0' }}>Plano de amortização ainda não gerado para este contrato.</div>
                              ) : (
                                <div style={{ overflow: 'auto', maxHeight: 300 }}>
                                  <table className="data-table">
                                    <thead>
                                      <tr><th>#</th><th>Data Venc.</th><th>Amortização</th><th>Juros</th><th>Prestação Total</th><th>Cap. Residual</th><th>Estado</th></tr>
                                    </thead>
                                    <tbody>
                                      {contractSchedule.map(row => (
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
                              )
                            ) : <LoadingSpinner text="A carregar plano..." />}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {/* Email automation */}
            <Panel title="Automação de Emails de Cobrança" tag="Sistema Activo" tagVariant="em">
              <div style={{ padding: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                  {EMAIL_ALERTS.map((section, si) => (
                    <div key={si}>
                      <div style={{ fontSize: 8.5, color: '#7888A0', marginBottom: 8 }}>{section.label}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {section.opts.map((opt, oi) => (
                          <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input type="checkbox" defaultChecked style={{ accentColor: '#C9A84C' }} />
                            <span style={{ fontSize: 8.5, color: '#E5EBF2' }}>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.08)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 8.5, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 7 }}>Último Email Enviado</div>
                  <div style={{ fontSize: 10, color: '#7888A0', lineHeight: 1.7 }}>
                    <strong style={{ color: '#E5EBF2' }}>Para:</strong> contacto@cliente.ao · dir.financeiro@cliente.gov.ao<br />
                    <strong style={{ color: '#E5EBF2' }}>Assunto:</strong> MAIOMBE · Notificação de Prestação · Vencimento em 3 dias<br />
                    <strong style={{ color: '#E5EBF2' }}>Enviado:</strong> {new Date().toLocaleDateString('pt-PT')} às 09:00 (automático · sistema automático)<br />
                    <strong style={{ color: '#E5EBF2' }}>Estado:</strong> <span style={{ color: '#26B870' }}>Entregue · Lido · Resposta pendente</span>
                  </div>
                </div>
              </div>
            </Panel>
          </>
        )}
      </div>
    </>
  );
}






