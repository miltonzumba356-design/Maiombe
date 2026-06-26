import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, User, Landmark, Users, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge, ProgressBar } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate, formatPercent } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const PARTNER_ICONS: Record<string, React.ElementType> = {
  capital_proprio:    Building2,
  acionista:          Building2,
  investidor_privado: User,
  fundo:              Landmark,
  parceiro:           Users,
  outro:              Users,
};

const SOURCE_TYPES = [
  'linha_bancaria', 'credito_bancario', 'banco', 'credito_sindico', 'linha_especial',
  'capital_proprio', 'acionista', 'investidor_privado', 'debentures', 'obrigacoes',
  'fundo', 'parceiro', 'suprimentos', 'outro',
];

const EMPTY_FORM = {
  name: '', source_type: 'linha_bancaria', institution: '', product: '',
  total_amount: '', utilized_amount: '', interest_rate: '',
  maturity_date: '', guarantee_given: '', notes: '',
};

export default function Funding() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['funding'],
    queryFn: () => api.get('/funding').then(r => r.data.data),
  });

  const sources = (data?.data || []) as Array<{
    id: string; name: string; source_type: string; institution: string;
    total_amount: number; utilized_amount: number; interest_rate: number;
    maturity_date: string; status: string;
  }>;
  const kpis = data?.kpis;

  const createFunding = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/funding', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding'] });
      setShowForm(false);
      setFormError('');
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => setFormError(e.response?.data?.message || 'Erro ao registar fonte'),
  });

  function upd(k: keyof typeof EMPTY_FORM, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function submitFunding(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.total_amount) {
      setFormError('Preencha nome e montante total.');
      return;
    }
    createFunding.mutate({
      ...form,
      total_amount: +form.total_amount,
      utilized_amount: form.utilized_amount ? +form.utilized_amount : 0,
      interest_rate: form.interest_rate ? +form.interest_rate : 0,
    });
  }

  const bankTypes = ['linha_bancaria', 'credito_bancario', 'banco', 'credito_sindico', 'linha_especial'];
  const bankSources = sources.filter(s => bankTypes.includes(s.source_type));
  const otherSources = sources.filter(s => !bankTypes.includes(s.source_type));

  const inputStyle = { width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 6, padding: '6px 10px', color: '#E5EBF2', fontSize: 11, boxSizing: 'border-box' as const };

  async function handleExport() {
    const totalCap = sources.reduce((a, s) => a + (s.total_amount || 0), 0);
    const totalUtil = sources.reduce((a, s) => a + (s.utilized_amount || 0), 0);
    const pctUtil = totalCap > 0 ? Math.round(totalUtil / totalCap * 100) : 0;
    await downloadExcel('MAIOMBE_Fontes_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Fontes', sources.length],
          ['Total Captado (Kz)', totalCap],
          ['Total Utilizado (Kz)', totalUtil],
          ['Total Disponivel (Kz)', totalCap - totalUtil],
          ['Taxa de Utilizacao (%)', pctUtil],
          ['Linhas Bancarias', bankSources.length],
          ['Capital Proprio e Terceiros', otherSources.length],
        ],
      },
      {
        title: 'LINHAS BANCARIAS',
        headers: ['Banco', 'Produto', 'Total (Kz)', 'Utilizado (Kz)', 'Disponivel (Kz)', 'Utilizacao (%)', 'Taxa (%)', 'Vencimento', 'Estado'],
        rows: bankSources.map(s => {
          const avail = (s.total_amount || 0) - (s.utilized_amount || 0);
          const pct = s.total_amount ? Math.round((s.utilized_amount / s.total_amount) * 100) : 0;
          return [(s as any).institution || s.name, (s as any).product || '—', s.total_amount, s.utilized_amount, avail, pct, s.interest_rate, s.maturity_date, s.status];
        }),
      },
      {
        title: 'CAPITAL PROPRIO E TERCEIROS',
        headers: ['Nome', 'Tipo', 'Total (Kz)', 'Taxa (%)', 'Vencimento', 'Estado'],
        rows: otherSources.map(s => [s.name, s.source_type.replace(/_/g, ' '), s.total_amount, s.interest_rate, s.maturity_date, s.status]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Fontes de Financiamento" onExport={handleExport} breadcrumb="MAIOMBE / Fontes de Financiamento"
        showNewButton newLabel="+ Nova Fonte" onNew={() => setShowForm(p => !p)} />
      <div style={{ padding: '22px 26px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Total Captado" value={kpis?.totalCaptado != null ? formatKz(kpis.totalCaptado / 1e9, false) : '—'} unit="Mil M Kz" delta={`${sources.length} fontes activas`} deltaType="up" variant="gold" />
          <KpiCard label="Linhas Bancárias" value={kpis?.linhasBancarias != null ? formatKz(kpis.linhasBancarias / 1e9, false) : '—'} unit="Mil M Kz" delta={`${kpis?.numBancos ?? bankSources.length} bancos`} deltaType="nt" variant="em" />
          <KpiCard label="Capital Próprio" value={kpis?.capitalProprio != null ? formatKz(kpis.capitalProprio / 1e9, false) : '—'} unit="Mil M Kz" delta="Acionista" deltaType="up" variant="am" />
          <KpiCard label="Investidores Privados" value={kpis?.investidoresPrivados != null ? formatKz(kpis.investidoresPrivados / 1e9, false) : '—'} unit="Mil M Kz" delta="Debêntures" deltaType="nt" variant="gold" />
        </div>

        {showForm && (
          <Panel title="Registar Nova Fonte de Financiamento" style={{ marginBottom: 12 }}>
            <form onSubmit={submitFunding} style={{ padding: 14 }}>
              {formError && <div style={{ color: '#D43352', fontSize: 10, marginBottom: 10 }}>{formError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Nome / Designação</label>
                  <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Nome da fonte de financiamento" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Tipo de Fonte</label>
                  <select value={form.source_type} onChange={e => upd('source_type', e.target.value)} style={inputStyle}>
                    {SOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Instituição / Entidade</label>
                  <input value={form.institution} onChange={e => upd('institution', e.target.value)} placeholder="Nome do banco ou entidade" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Montante Total (Kz)</label>
                  <input type="number" value={form.total_amount} onChange={e => upd('total_amount', e.target.value)} placeholder="0" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Montante Utilizado (Kz)</label>
                  <input type="number" value={form.utilized_amount} onChange={e => upd('utilized_amount', e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Taxa de Juro (% a.a.)</label>
                  <input type="number" step="0.1" value={form.interest_rate} onChange={e => upd('interest_rate', e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Data de Vencimento</label>
                  <input type="date" value={form.maturity_date} onChange={e => upd('maturity_date', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={form.guarantee_given} onChange={e => upd('guarantee_given', e.target.value)} placeholder="Garantia dada (opcional)" style={{ ...inputStyle, flex: 1 }} />
                <input value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Observações (opcional)" style={{ ...inputStyle, flex: 1 }} />
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-gold" disabled={createFunding.isPending}>
                  {createFunding.isPending ? <><Loader2 size={11} className="spin" /> A salvar...</> : 'Registar Fonte'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
          <Panel title="Linhas de Crédito Bancárias" tag={`${bankSources.length} Activas`} actions={
            <button onClick={() => setShowForm(p => !p)} style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '4px 8px', fontSize: 8.5 }}>
              + Nova Fonte
            </button>
          }>
            {isLoading ? <LoadingSpinner /> : (
              <div style={{ overflow: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Banco</th><th>Linha / Produto</th><th>Valor Total</th>
                      <th>Utilizado</th><th>Disponível</th><th>Taxa</th><th>Vencimento</th><th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankSources.slice(0, 5).map(s => {
                      const available = (s.total_amount || 0) - (s.utilized_amount || 0);
                      const pct = s.total_amount ? Math.round((s.utilized_amount / s.total_amount) * 100) : 0;
                      return (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600, color: '#fff' }}>{s.institution || s.name}</td>
                          <td style={{ fontSize: 9.5, color: '#7888A0' }}>{s.name}</td>
                          <td className="td-mono">{formatKz(s.total_amount)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <ProgressBar value={pct} />
                              <span style={{ fontSize: 8.5 }}>{pct}%</span>
                            </div>
                          </td>
                          <td className="td-mono" style={{ color: available > 0 ? '#26B870' : '#D43352' }}>{formatKz(available)}</td>
                          <td className="td-mono">{formatPercent(s.interest_rate)}</td>
                          <td>{formatDate(s.maturity_date)}</td>
                          <td><Badge value={s.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Capital Próprio e Terceiros">
            {isLoading ? <LoadingSpinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {otherSources.map(s => {
                  const pct = kpis?.totalCaptado ? ((s.total_amount / kpis.totalCaptado) * 100).toFixed(1) : '—';
                  const PartnerIcon = PARTNER_ICONS[s.source_type] || Users;
                  return (
                    <div key={s.id} style={{
                      display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px',
                      borderBottom: '1px solid rgba(201,168,76,.06)',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(201,168,76,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PartnerIcon size={16} color="#C9A84C" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: '#E5EBF2', marginBottom: 2 }}>{s.name}</div>
                        <div style={{ fontSize: 8.5, color: '#7888A0' }}>
                          {s.source_type?.replace(/_/g, ' ')} · {s.interest_rate ? `Taxa: ${formatPercent(s.interest_rate)}` : 'Prazo indefinido'}
                          {s.maturity_date ? ` · Vencimento: ${formatDate(s.maturity_date)}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', fontFamily: 'monospace' }}>{formatKz(s.total_amount, true)}</div>
                        <div style={{ fontSize: 8.5, color: '#7888A0' }}>{pct}% do total</div>
                      </div>
                    </div>
                  );
                })}

                {otherSources.length === 0 && (
                  <div style={{ padding: '24px 14px', textAlign: 'center', color: '#7888A0', fontSize: 10 }}>
                    Nenhuma fonte de capital próprio ou terceiros registada.
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}





