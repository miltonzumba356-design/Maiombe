import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import Panel from '@/components/ui/Panel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const SECTOR_COLORS = [
  'rgba(201,168,76,.85)', 'rgba(38,184,112,.8)', 'rgba(91,156,246,.8)',
  'rgba(224,144,32,.8)', 'rgba(156,100,200,.8)', 'rgba(70,85,100,.8)',
];

function Spark({ heights, color }: { heights: number[]; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 20, width: 40 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}%`, background: color, borderRadius: 2 }} />
      ))}
    </div>
  );
}

function SectorChart({ data }: { data: Array<{ sector: string; total: number }> }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#7888A0', fontSize: 10 }}>
        Registe projectos com sector para ver a distribuição.
      </div>
    );
  }
  const grandTotal = data.reduce((a, d) => a + d.total, 0);
  return (
    <div style={{ padding: 14 }}>
      {data.slice(0, 6).map((d, i) => {
        const pct = grandTotal > 0 ? Math.round(d.total / grandTotal * 100) : 0;
        const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
        return (
          <div key={d.sector} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: color }} />
            <div style={{ flex: 1, fontSize: 9.5, color: '#E5EBF2', textTransform: 'capitalize' }}>
              {d.sector || 'Não classificado'}
            </div>
            <div style={{ fontSize: 9, color: '#C9A84C', fontFamily: 'monospace' }}>{formatKz(d.total, true)}</div>
            <div style={{ fontSize: 8.5, color: '#7888A0', width: 32, textAlign: 'right' }}>{pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyChart({ data, label, color }: { data: Array<{ month: string; value: number }>; label: string; color: string }) {
  if (!data || data.every(d => d.value === 0)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#7888A0', fontSize: 10 }}>
        Sem dados de {label.toLowerCase()} registados.
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ fontSize: 7, color: '#C9A84C' }}>{d.value > 0 ? `${d.value}M` : ''}</div>
          <div style={{ width: '100%', background: color, borderRadius: '2px 2px 0 0', height: `${(d.value / max) * 80}px`, minHeight: d.value > 0 ? 2 : 0 }} />
          <div style={{ fontSize: 7.5, color: '#7888A0' }}>{d.month}</div>
        </div>
      ))}
    </div>
  );
}

function CashFlowChart({ data }: { data: Array<{ month: string; entrada: number; saida: number }> }) {
  const hasData = data.some(d => d.entrada > 0 || d.saida > 0);
  if (!hasData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: '#7888A0', fontSize: 10 }}>
        Registe pagamentos e obrigações para ver o fluxo de caixa.
      </div>
    );
  }
  const max = Math.max(...data.flatMap(d => [d.entrada, d.saida]), 1);
  return (
    <div style={{ padding: '8px 4px 0' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 6, justifyContent: 'flex-end' }}>
        <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:8, color:'#26B870' }}><span style={{ width:8, height:8, borderRadius:2, background:'rgba(38,184,112,.7)', display:'inline-block' }} />Entradas (cobranças)</span>
        <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:8, color:'#D43352' }}><span style={{ width:8, height:8, borderRadius:2, background:'rgba(212,51,82,.7)', display:'inline-block' }} />Saídas (passivo)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:1, height:80 }}>
              <div style={{ width:'45%', background:'rgba(38,184,112,.7)', borderRadius:'2px 2px 0 0', height:`${(d.entrada/max)*80}px`, minHeight: d.entrada>0?2:0 }} />
              <div style={{ width:'45%', background:'rgba(212,51,82,.7)', borderRadius:'2px 2px 0 0', height:`${(d.saida/max)*80}px`, minHeight: d.saida>0?2:0 }} />
            </div>
            <div style={{ fontSize: 7, color: '#7888A0' }}>{d.month}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NplChart({ data }: { data: Array<{ month: string; vencido: number }> }) {
  const META = 6;
  const hasData = data.some(d => d.vencido > 0);
  if (!hasData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: '#7888A0', fontSize: 10 }}>
        Sem prestações vencidas registadas em 2026.
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.vencido), 1);
  return (
    <div style={{ padding: '8px 4px 0' }}>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
        <span style={{ fontSize:8, color:'#D43352' }}>— Meta NPL ≤ {META}% a.a.</span>
      </div>
      <div style={{ position:'relative', height:90 }}>
        <svg width="100%" height="90" style={{ overflow:'visible' }}>
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 90 - (d.vencido / max) * 80;
            return i === 0 ? null : (
              <line key={i}
                x1={`${((i-1)/(data.length-1))*100}%`} y1={90-(data[i-1].vencido/max)*80}
                x2={`${x}%`} y2={y}
                stroke="rgba(212,51,82,.8)" strokeWidth={1.5} />
            );
          })}
          {data.map((d, i) => d.vencido > 0 && (
            <circle key={i} cx={`${(i/(data.length-1))*100}%`} cy={90-(d.vencido/max)*80}
              r={3} fill="#D43352" />
          ))}
          <line x1="0%" y1={90-(META/max)*80 || 45} x2="100%" y2={90-(META/max)*80 || 45}
            stroke="rgba(212,51,82,.3)" strokeWidth={1} strokeDasharray="4 3" />
        </svg>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
          {data.filter((_,i) => i % 2 === 0).map((d,i) => (
            <span key={i} style={{ fontSize:7, color:'#7888A0' }}>{d.month}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BI() {
  const { data: biData, isLoading } = useQuery({
    queryKey: ['bi'],
    queryFn: () => api.get('/bi').then(r => r.data.data),
  });

  const kpis: Array<{
    kpi: string; value: number | null; target: number; unit: string;
    delta: number | null; rating: string;
  }> = biData?.kpis || [];

  const sectorExposure: Array<{ sector: string; total: number }> = biData?.sectorExposure || [];
  const nplEvolution: Array<{ month: string; vencido: number }> = biData?.nplEvolution || [];
  const cashFlow: Array<{ month: string; entrada: number; saida: number }> = biData?.cashFlow || [];

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthlyPayments: Array<{ month: string; value: number }> = (() => {
    const raw: Array<{ m: string; received: number }> = biData?.monthlyPayments || [];
    return months.map((m, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      const found = raw.find(r => r.m === monthNum);
      return { month: m, value: found ? Math.round(found.received / 1e6) : 0 };
    });
  })();

  const monthlyScheduled: Array<{ month: string; value: number }> = (() => {
    const raw: Array<{ m: string; scheduled: number }> = biData?.monthlyScheduled || [];
    return months.map((m, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      const found = raw.find(r => r.m === monthNum);
      return { month: m, value: found ? Math.round(found.scheduled / 1e6) : 0 };
    });
  })();

  function ratingStyle(rating: string) {
    if (rating === 'Óptimo') return { bg: 'rgba(38,184,112,.12)', color: '#26B870' };
    if (rating === 'Normal') return { bg: 'rgba(201,168,76,.1)', color: '#C9A84C' };
    if (rating === 'Atenção') return { bg: 'rgba(224,144,32,.1)', color: '#E09020' };
    if (rating === 'Crítico') return { bg: 'rgba(212,51,82,.12)', color: '#D43352' };
    return { bg: 'rgba(120,136,160,.1)', color: '#7888A0' };
  }

  function sparkFromDelta(delta: number | null, higherBetter: boolean): number[] {
    if (delta === null) return [50, 50, 50, 50, 50];
    const good = higherBetter ? delta >= 0 : delta <= 0;
    return good ? [40, 55, 70, 85, 100] : [100, 85, 70, 55, 40];
  }

  async function handleExport() {
    await downloadExcel('MAIOMBE_BI_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs DE PERFORMANCE',
        headers: ['KPI', 'Valor Actual', 'Meta', 'Unidade', 'Delta', 'Rating'],
        rows: kpis.map(r => [r.kpi, r.value, r.target, r.unit, r.delta, r.rating]),
      },
      {
        title: 'FLUXO DE CAIXA MENSAL 2026',
        headers: ['mes', 'entradas_kz', 'saidas_kz', 'saldo_liquido_kz'],
        rows: cashFlow.map(r => [r.month, r.entrada, r.saida, r.entrada - r.saida]),
      },
      {
        title: 'EVOLUCAO NPL 2026',
        headers: ['mes', 'valor_vencido_kz'],
        rows: nplEvolution.map(r => [r.month, r.vencido]),
      },
      {
        title: 'EXPOSICAO SECTORIAL',
        headers: ['sector', 'valor_total_kz'],
        rows: sectorExposure.sort((a, b) => b.total - a.total).map(r => [r.sector.replace(/_/g, ' '), r.total]),
      },
      {
        title: 'RECEBIMENTOS MENSAIS 2026',
        headers: ['mes', 'recebido_m_kz'],
        rows: monthlyPayments.map(r => [r.month, r.value]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Business Intelligence & Analytics" onExport={handleExport} breadcrumb="MAIOMBE / BI & Analytics" showNewButton={false} />
      <div className="ct">
        {isLoading ? <LoadingSpinner /> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Panel title="Fluxo de Caixa Líquido 2026" tag="Entradas vs Saídas">
                <CashFlowChart data={cashFlow} />
              </Panel>
              <Panel title="Exposição por Sector">
                <SectorChart data={sectorExposure} />
              </Panel>
              <Panel title="Evolução do NPL 2026" tag="Crédito Vencido · Meta ≤ 6%">
                <NplChart data={nplEvolution} />
              </Panel>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Panel title="Recebimentos Mensais 2026" tag="Cobranças efectivas">
                <MonthlyChart data={monthlyPayments} label="Recebimentos" color="rgba(38,184,112,.7)" />
              </Panel>
              <Panel title="Prestações Previstas 2026" tag="Cronograma">
                <MonthlyChart data={monthlyScheduled} label="Prestações previstas" color="rgba(201,168,76,.6)" />
              </Panel>
            </div>

            <Panel title="Indicadores de Performance — Business Intelligence">
              <div style={{ overflow: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>KPI</th><th>Valor Actual</th><th>Meta</th><th>Delta</th><th>Tendência</th><th>Rating</th></tr>
                  </thead>
                  <tbody>
                    {kpis.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#7888A0', padding: '24px 0' }}>
                          Sem dados suficientes para calcular indicadores. Registe contratos, pagamentos e avaliações de risco.
                        </td>
                      </tr>
                    ) : kpis.map((row, i) => {
                      const rs = ratingStyle(row.rating);
                      const higherBetter = ['Taxa de Recuperação', 'Índice Cobertura Garantias', 'Spread Médio'].some(k => row.kpi.includes(k.split(' ')[0]));
                      const deltaColor = row.delta === null ? '#7888A0'
                        : (higherBetter ? row.delta >= 0 : row.delta <= 0) ? '#26B870' : '#D43352';
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: '#E5EBF2' }}>{row.kpi}</td>
                          <td className="td-mono">{row.value != null ? `${row.value}${row.unit}` : '—'}</td>
                          <td className="td-mono" style={{ color: '#7888A0' }}>{row.target}{row.unit}</td>
                          <td style={{ color: deltaColor, fontWeight: 600 }}>
                            {row.delta != null ? `${row.delta >= 0 ? '+' : ''}${row.delta}${row.unit}` : '—'}
                          </td>
                          <td><Spark heights={sparkFromDelta(row.delta, higherBetter)} color={deltaColor} /></td>
                          <td>
                            <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, background: rs.bg, color: rs.color, border: `1px solid ${rs.color}33` }}>
                              {row.rating}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </>
  );
}





