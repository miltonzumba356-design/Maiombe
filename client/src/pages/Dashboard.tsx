import { useQuery } from '@tanstack/react-query';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge, RepaymentTag, ProgressBar } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate, daysUntil } from '@/lib/utils';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0C1B0F', borderColor: '#C9A84C', borderWidth: 1 } },
  scales: {
    x: { grid: { color: 'rgba(201,168,76,.05)' }, ticks: { color: '#7888A0', font: { size: 9 } } },
    y: { grid: { color: 'rgba(201,168,76,.05)' }, ticks: { color: '#7888A0', font: { size: 9 } } },
  },
};

export default function Dashboard() {
  const { data: kpis, isLoading } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: () => api.get('/dashboard/kpis').then(r => r.data.data) });
  const { data: contracts } = useQuery({ queryKey: ['dashboard-contracts'], queryFn: () => api.get('/dashboard/contracts').then(r => r.data.data) });
  const { data: alerts } = useQuery({ queryKey: ['dashboard-alerts'], queryFn: () => api.get('/dashboard/alerts').then(r => r.data.data) });
  const { data: fontes } = useQuery({ queryKey: ['dashboard-funding'], queryFn: () => api.get('/dashboard/funding-summary').then(r => r.data.data) });
  const { data: cronograma } = useQuery({ queryKey: ['dashboard-schedule'], queryFn: () => api.get('/dashboard/schedule-2026').then(r => r.data.data) });
  const { data: provincial } = useQuery({ queryKey: ['dashboard-provincial'], queryFn: () => api.get('/dashboard/provincial-exposure').then(r => r.data.data) });
  const { data: portfolioEvolution } = useQuery({ queryKey: ['dashboard-portfolio-evolution'], queryFn: () => api.get('/dashboard/portfolio-evolution').then(r => r.data.data) });

  if (isLoading) return <><TopBar title="Dashboard Executivo" /><div className="ct"><LoadingSpinner /></div></>;

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const evolutionData = portfolioEvolution || [];
  const portfolioChart = {
    labels: evolutionData.map((d: { month: string }) => d.month),
    datasets: [{
      label: 'Carteira Activa (Mil M Kz)',
      data: evolutionData.map((d: { value: number }) => d.value),
      borderColor: '#C9A84C', backgroundColor: 'rgba(201,168,76,.06)',
      fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2,
    }],
  };

  const compChart = {
    labels: ['Gov. Provinciais', 'Emp. Públicas', 'Ministérios', 'Emp. Privadas', 'Adm. Municipais'],
    datasets: [{
      data: [31, 23, 21, 16, 9],
      backgroundColor: ['#C9A84C', '#26B870', '#5B9CF6', '#E09020', '#7888A0'],
      borderWidth: 0,
    }],
  };

  const riskByLevel = kpis?.riskMatrix?.reduce((acc: Record<string, { count: number; total: number }>, r: { risk_level: string; count: number; total_amount: number }) => {
    acc[r.risk_level] = { count: r.count, total: r.total_amount };
    return acc;
  }, {}) || {};

  const maxProv = provincial?.[0]?.total || 1;

  return (
    <>
      <TopBar title="Dashboard Executivo" />
      <div className="ct">

        {/* KPI Grid 4 */}
        <div className="g-kpi4" style={{ gap: 12, marginBottom: 18 }}>
          <KpiCard label="Capital Captado" value={kpis?.capitalCaptado != null ? formatKz(kpis.capitalCaptado / 1e9, false) : '—'} unit="Mil M Kz" delta={kpis?.utilizacaoCapital != null ? `util. ${kpis.utilizacaoCapital}%` : '—'} deltaType="up" variant="gold" />
          <KpiCard label="Capital Aplicado" value={kpis?.capitalAplicado != null ? formatKz(kpis.capitalAplicado / 1e9, false) : '—'} unit="Mil M Kz" delta={kpis?.utilizacaoCapital != null ? `util. ${kpis.utilizacaoCapital}%` : '—'} deltaType="up" variant="em" />
          <KpiCard label="Crédito Vencido" value={kpis?.creditoVencido != null ? formatKz(kpis.creditoVencido / 1e9, false) : '—'} unit="Mil M Kz" delta={kpis?.nplRatio != null ? `NPL ${kpis.nplRatio}%` : '—'} deltaType="dn" variant="cr" />
          <KpiCard label="Rentabilidade Líquida" value={kpis?.rentabilidadeLiquida ?? '—'} unit="%" delta="Spread activo/passivo" deltaType="up" variant="am" />
        </div>

        {/* KPI Grid 6 */}
        <div className="g-kpi6" style={{ gap: 10, marginBottom: 18 }}>
          <KpiCard label="Contratos" value={kpis?.contratos?.total ?? '—'} small sub={`${kpis?.contratos?.em_vigor ?? 0} em vigor`} variant="gold" />
          <KpiCard label="Clientes" value={kpis?.clientes ?? '—'} small sub="activos" variant="gold" />
          <KpiCard label="Recuperação" value={kpis?.taxaRecuperacao != null ? `${kpis.taxaRecuperacao}%` : '—'} small sub="taxa de recuperação" variant="em" />
          <KpiCard label="Garantias" value={kpis?.garantias ?? '—'} small sub="activas" variant="gold" />
          <KpiCard label="Venc. 30d" value={kpis?.contratos?.em_risco ?? '—'} small sub="em risco" variant="am" />
          <KpiCard label="Health Score" value={kpis?.healthScore ?? '—'} unit="/100" small sub="portfolio score" variant="gold" />
        </div>

        {/* Charts row */}
        <div className="g-charts" style={{ gap: 12, marginBottom: 14 }}>
          <Panel title="Evolução da Carteira 2025–2026" tag="12 Meses">
            <div style={{ padding: 16 }}><div style={{ height: 220 }}><Line data={portfolioChart} options={CHART_OPTS} /></div></div>
          </Panel>
          <Panel title="Composição do Crédito">
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ height: 195, width: 195 }}><Doughnut data={compChart} options={{ ...CHART_OPTS, scales: undefined }} /></div>
            </div>
          </Panel>
        </div>

        {/* Risk Matrix + Fontes + Alertas */}
        <div className="g-3col" style={{ gap: 12, marginBottom: 14 }}>
          <Panel title="Matriz de Risco" tag="Análise de Risco">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 13 }}>
              {[
                { key: 'baixo', label: 'Baixo', numColor: '#26B870', bg: 'rgba(38,184,112,.09)', border: '1px solid rgba(38,184,112,.18)' },
                { key: 'medio', label: 'Médio', numColor: '#E09020', bg: 'rgba(224,144,32,.09)', border: '1px solid rgba(224,144,32,.18)' },
                { key: 'alto', label: 'Alto', numColor: '#D43352', bg: 'rgba(212,51,82,.09)', border: '1px solid rgba(212,51,82,.18)' },
                { key: 'critico', label: 'Crítico', numColor: '#FF2040', bg: 'rgba(212,51,82,.18)', border: '1px solid rgba(212,51,82,.44)' },
              ].map(r => (
                <div key={r.key} style={{ padding: 12, borderRadius: 9, cursor: 'pointer', transition: 'all .15s', background: r.bg, border: r.border }}>
                  <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 1.4, color: '#7888A0' }}>{r.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, margin: '4px 0 3px', color: r.numColor }}>
                    {riskByLevel[r.key]?.count ?? 0}
                  </div>
                  <div style={{ fontSize: 8.5, color: '#7888A0' }}>
                    {riskByLevel[r.key] ? formatKz(riskByLevel[r.key].total, true) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Fontes — Resumo" tag={fontes ? `${fontes.length} Activas` : '—'} tagVariant="em">
            <div style={{ padding: '9px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {fontes && fontes.length > 0 ? fontes.slice(0, 4).map((f: { name: string; interest_rate?: number; total_amount?: number; utilized_amount?: number }, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 9, background: 'rgba(7,9,12,.4)', border: '1px solid rgba(201,168,76,.06)', borderRadius: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, background: 'rgba(201,168,76,.13)', color: '#C9A84C' }}>
                    {f.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#fff' }}>{f.name}</div>
                    <div style={{ fontSize: 8.5, color: '#7888A0', marginTop: 1 }}>
                      {f.interest_rate != null ? `${f.interest_rate}% a.a.` : 'Taxa não definida'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#DEB96A', fontFamily: 'monospace' }}>
                      {formatKz(f.total_amount || 0, true)}
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: '#7888A0', fontSize: 10 }}>
                  Nenhuma fonte de financiamento registada.
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Alertas" tag={`${(kpis?.alertas?.reduce((a: number, b: { count: number }) => a + b.count, 0)) ?? 0} Activos`} tagVariant="cr">
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {(alerts || []).map((a: { id: string; severity: string; title: string; description: string; created_at: string }) => (
                <div key={a.id} style={{
                  display: 'flex', gap: 9, padding: '9px 14px', borderBottom: '1px solid rgba(201,168,76,.04)',
                  cursor: 'pointer',
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: a.severity === 'urgente' ? '#D43352' : a.severity === 'atencao' ? '#E09020' : '#26B870',
                    boxShadow: a.severity === 'urgente' ? '0 0 4px #D43352' : 'none',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#fff' }}>{a.title}</div>
                    <div style={{ fontSize: 8.5, color: '#7888A0', marginTop: 1 }}>{a.description?.slice(0, 60)}...</div>
                  </div>
                  <div style={{ fontSize: 8.5, color: '#364858', whiteSpace: 'nowrap' }}>
                    {formatDate(a.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Contracts Table + Health Score */}
        <div className="g-2-1" style={{ gap: 12, marginBottom: 14 }}>
          <Panel title="Carteira de Crédito — Contratos Activos"
            actions={<button className="btn btn-outline" style={{ padding: '4px 9px', fontSize: 8.5 }}>Ver Todos</button>}
          >
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Referência</th><th>Mutuário</th><th>Tipo</th><th>Valor Kz</th>
                    <th>Taxa</th><th>Próx. Venc.</th><th>Reembolso</th><th>Exec.</th><th>Risco</th>
                  </tr>
                </thead>
                <tbody>
                  {(contracts || []).slice(0, 6).map((c: {
                    id: string; reference: string; client_name: string; entity_type: string;
                    amount: number; interest_rate: number; proximo_vencimento: string;
                    repayment_methods: string; risk_level: string; execution_pct?: number;
                  }) => {
                    const days = c.proximo_vencimento ? daysUntil(c.proximo_vencimento) : null;
                    const isOverdue = days !== null && days < 0;
                    const isUrgent = days !== null && days <= 5 && days >= 0;
                    const execPct = c.execution_pct ?? 0;
                    return (
                      <tr key={c.id}>
                        <td className="td-mono td-bold">{c.reference}</td>
                        <td>{c.client_name}</td>
                        <td style={{ fontSize: 8.5, color: '#7888A0' }}>{c.entity_type?.replace(/_/g, ' ')}</td>
                        <td className="td-mono">{c.amount?.toLocaleString('pt-AO')}</td>
                        <td className="td-mono">{c.interest_rate}%</td>
                        <td style={{ color: isOverdue ? '#D43352' : isUrgent ? '#E09020' : undefined }}>
                          {isOverdue ? 'VENCIDO' : c.proximo_vencimento ? formatDate(c.proximo_vencimento) : '—'}
                          {isUrgent && ' !'}
                        </td>
                        <td><RepaymentTag methods={c.repayment_methods} /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ProgressBar value={execPct} />
                            <span style={{ fontSize: 8.5, color: execPct >= 80 ? '#D43352' : execPct >= 50 ? '#E09020' : '#26B870' }}>{execPct}%</span>
                          </div>
                        </td>
                        <td><Badge value={c.risk_level} type="risk" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Health Score */}
            <Panel title="Health Score">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div style={{ position: 'relative', width: 140, height: 140 }}>
                  <svg viewBox="0 0 140 140" width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                    <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#C9A84C" /><stop offset="100%" stopColor="#26B870" />
                    </linearGradient></defs>
                    <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(201,168,76,.09)" strokeWidth="10" />
                    <circle cx="70" cy="70" r="58" fill="none" stroke="url(#sg)" strokeWidth="10"
                      strokeDasharray="364" strokeDashoffset="100" strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#C9A84C', lineHeight: 1 }}>{kpis?.healthScore ?? '—'}</div>
                    <div style={{ fontSize: 8.5, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>Health Score</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, padding: '0 12px 12px' }}>
                {[
                  { l: 'Recuperação', v: kpis?.taxaRecuperacao != null ? `${kpis.taxaRecuperacao}%` : '—', c: '#26B870' },
                  { l: 'NPL Ratio', v: kpis?.nplRatio != null ? `${kpis.nplRatio}%` : '—', c: '#E09020' },
                  { l: 'Spread', v: kpis?.rentabilidadeLiquida != null ? `${kpis.rentabilidadeLiquida > 0 ? '+' : ''}${kpis.rentabilidadeLiquida}pp` : '—', c: '#C9A84C' },
                  { l: 'Garantias', v: kpis?.garantias != null ? `${kpis.garantias}` : '—', c: '#C9A84C' },
                ].map((m, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: 6, background: 'rgba(7,9,12,.5)', borderRadius: 4 }}>
                    <div style={{ fontSize: 8.5, color: '#7888A0' }}>{m.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: m.c }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Exposição Provincial */}
            <Panel title="Exposição Provincial">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, padding: 12 }}>
                {provincial && provincial.length > 0 ? provincial.slice(0, 6).map((p: { province: string; total: number }, i: number) => (
                  <div key={i} style={{ padding: '7px 8px', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.06)', borderRadius: 4 }}>
                    <div style={{ fontSize: 8.5, fontWeight: 600, color: '#E5EBF2' }}>{p.province}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#C9A84C', fontFamily: 'monospace', marginTop: 2 }}>{formatKz(p.total, true)}</div>
                    <div style={{ marginTop: 4, height: 2, background: 'rgba(255,255,255,.05)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg, #C9A84C, #26B870)', width: `${(p.total / maxProv) * 100}%` }} />
                    </div>
                  </div>
                )) : (
                  <div style={{ gridColumn: '1/-1', padding: '16px', textAlign: 'center', color: '#7888A0', fontSize: 10 }}>
                    Sem contratos registados por província.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>

        {/* Cronograma 2026 */}
        <Panel title="Cronograma Consolidado 2026" tag="Activo + Passivo">
          <div className="g-mo12" style={{ gap: 5, padding: 12 }}>
            {(cronograma || months.map(m => ({ month: m, value: 0, status: 'Sem dados' }))).map((m: { month: string; value: number; status: string }, i: number) => (
              <div key={i} style={{
                padding: 8, borderRadius: 4, textAlign: 'center',
                border: m.status === 'Recebido' ? '1px solid rgba(38,184,112,.15)' : m.status === 'Em Curso' ? '1px solid rgba(201,168,76,.2)' : m.status === 'Risco' ? '1px solid rgba(212,51,82,.25)' : '1px solid rgba(201,168,76,.06)',
                background: m.status === 'Recebido' ? 'rgba(38,184,112,.04)' : m.status === 'Risco' ? 'rgba(212,51,82,.06)' : 'rgba(7,9,12,.5)',
              } as React.CSSProperties}>
                <div style={{ fontSize: 7.5, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1 }}>{m.month}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', fontFamily: 'monospace', marginTop: 2 }}>
                  {formatKz(m.value, true).replace(' Kz', '')}
                </div>
                <div style={{ fontSize: 7.5, marginTop: 2, color: m.status === 'Recebido' ? '#26B870' : m.status === 'Em Curso' ? '#E09020' : m.status === 'Risco' ? '#D43352' : '#7888A0' }}>
                  {m.status}
                </div>
              </div>
            ))}
          </div>
        </Panel>

      </div>
    </>
  );
}
