import { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge, RepaymentTag, ProgressBar } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate, daysUntil, getEntityTypeLabel } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const ENTITY_COLORS: Record<string, string> = {
  ministerio:              'rgba(38,184,112,.78)',
  governo_provincial:      'rgba(38,184,112,.65)',
  governo_central:         'rgba(201,168,76,.80)',
  empresa_publica:         'rgba(224,144,32,.75)',
  administracao_municipal: 'rgba(224,144,32,.60)',
  empresa_privada:         'rgba(212,51,82,.65)',
  empresa_dominio_publico: 'rgba(91,156,246,.70)',
  particular:              'rgba(156,100,200,.70)',
  entidade_mista:          'rgba(70,130,100,.70)',
};

const SECTOR_COLORS: Record<string, string> = {
  saude:          'rgba(91,156,246,.85)',
  energia:        'rgba(38,184,112,.8)',
  infraestrutura: 'rgba(201,168,76,.85)',
  habitacao:      'rgba(156,100,200,.8)',
  educacao:       'rgba(224,144,32,.8)',
  agricultura:    'rgba(80,180,120,.8)',
  agua:           'rgba(56,189,248,.8)',
  transporte:     'rgba(248,113,113,.8)',
  outros:         'rgba(70,85,100,.8)',
};

const SECTOR_LABELS: Record<string, string> = {
  saude: 'Saúde', energia: 'Energia', infraestrutura: 'Infra.',
  habitacao: 'Habitação', educacao: 'Educação', agricultura: 'Agricultura',
  agua: 'Água', transporte: 'Transporte', outros: 'Outros',
};

interface EntityRow { entity_type: string; total_amount: number; count: number; pct: number; }
interface SectorRow { sector: string; total_financed: number; count: number; pct: number; }

function EntityChart({ rows }: { rows: EntityRow[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ctx = el.getContext('2d'); if (!ctx) return;
    if (!rows.length) return;
    const w = el.width, h = el.height;
    const labels = rows.map(r => getEntityTypeLabel(r.entity_type));
    const values = rows.map(r => r.total_amount / 1e9);
    const colors = rows.map(r => ENTITY_COLORS[r.entity_type] || 'rgba(201,168,76,.7)');
    const pad = { t: 14, r: 80, b: 14, l: 140 };
    const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
    const max = Math.max(...values, 0.001);
    const bh = Math.max(Math.floor(gh / labels.length) - 6, 8);
    ctx.clearRect(0, 0, w, h);
    labels.forEach((label, i) => {
      const y = pad.t + i * (gh / labels.length);
      const bw = (values[i] / max) * gw;
      ctx.fillStyle = colors[i];
      const rx = 4;
      ctx.beginPath();
      ctx.moveTo(pad.l + rx, y + 3);
      ctx.lineTo(pad.l + bw - rx, y + 3);
      ctx.quadraticCurveTo(pad.l + bw, y + 3, pad.l + bw, y + 3 + rx);
      ctx.lineTo(pad.l + bw, y + 3 + bh - rx);
      ctx.quadraticCurveTo(pad.l + bw, y + 3 + bh, pad.l + bw - rx, y + 3 + bh);
      ctx.lineTo(pad.l + rx, y + 3 + bh);
      ctx.quadraticCurveTo(pad.l, y + 3 + bh, pad.l, y + 3 + bh - rx);
      ctx.lineTo(pad.l, y + 3 + rx);
      ctx.quadraticCurveTo(pad.l, y + 3, pad.l + rx, y + 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7888A0';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(label, pad.l - 6, y + bh / 2 + 4);
      ctx.fillStyle = '#C9A84C';
      ctx.textAlign = 'left';
      ctx.fillText(values[i].toFixed(1) + ' Mil M', pad.l + bw + 4, y + bh / 2 + 4);
    });
  }, [rows]);
  return <canvas ref={ref} width={440} height={260} style={{ width: '100%', height: 260 }} />;
}

function SectorPie({ rows }: { rows: SectorRow[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ctx = el.getContext('2d'); if (!ctx) return;
    if (!rows.length) return;
    const w = el.width, h = el.height;
    const cx = w / 2, cy = (h - 40) / 2;
    const r = Math.min(w, h - 40) * 0.42;
    const slices = rows.map(row => ({
      pct: row.pct,
      color: SECTOR_COLORS[row.sector] || 'rgba(70,85,100,.8)',
      label: SECTOR_LABELS[row.sector] || row.sector,
    }));
    ctx.clearRect(0, 0, w, h);
    let start = -Math.PI / 2;
    slices.forEach(s => {
      const end = start + (s.pct / 100) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath();
      ctx.fillStyle = s.color; ctx.fill();
      ctx.strokeStyle = 'rgba(7,9,12,.8)'; ctx.lineWidth = 2; ctx.stroke();
      start = end;
    });
    ctx.font = '8px system-ui';
    const lcols = Math.min(slices.length, 3), lw = 75;
    const lx = (w - lcols * lw) / 2;
    slices.forEach((s, i) => {
      const x = lx + (i % lcols) * lw;
      const y = cy + r + 14 + Math.floor(i / lcols) * 14;
      ctx.fillStyle = s.color; ctx.fillRect(x, y - 7, 7, 7);
      ctx.fillStyle = '#7888A0'; ctx.textAlign = 'left'; ctx.fillText(`${s.label} ${s.pct}%`, x + 10, y);
    });
  }, [rows]);
  return <canvas ref={ref} width={240} height={240} style={{ maxWidth: 240, maxHeight: 240 }} />;
}

export default function Portfolio() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', search, statusFilter],
    queryFn: () => api.get('/contracts', { params: { search: search || undefined, status: statusFilter || undefined, limit: 50 } }).then(r => r.data),
  });

  const { data: analytics } = useQuery({
    queryKey: ['portfolio-analytics'],
    queryFn: () => api.get('/portfolio/analytics').then(r => r.data.data),
    staleTime: 60_000,
  });

  const entityRows: EntityRow[] = analytics?.entityExposure || [];
  const sectorRows: SectorRow[] = analytics?.sectorDistribution || [];

  const contracts = (data?.data || []) as Array<{
    id: string; reference: string; client_name: string; contract_type: string;
    amount: number; interest_rate: number; celebration_date: string; end_date: string;
    proximo_vencimento: string; repayment_methods: string; status: string; risk_level: string;
  }>;
  const total = data?.pagination?.total || 0;

  const emCurso = contracts.filter(c => c.status === 'recebidos');
  const vencido = contracts.filter(c => c.risk_level === 'alto' || c.risk_level === 'critico');
  const liquidado = contracts.filter(c => c.status !== 'recebidos' && c.status !== 'elaboracao');
  const totalAmount = contracts.reduce((a, c) => a + (c.amount || 0), 0);
  const emCursoAmount = emCurso.reduce((a, c) => a + (c.amount || 0), 0);
  const vencidoAmount = vencido.reduce((a, c) => a + (c.amount || 0), 0);

  const statuses = ['recebidos', 'elaboracao'];

  async function handleExport() {
    const byType: Record<string, number> = {};
    contracts.forEach(c => { byType[c.contract_type || 'outro'] = (byType[c.contract_type || 'outro'] || 0) + 1; });
    await downloadExcel('MAIOMBE_Carteira_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Contratos', total],
          ['Total Carteira (Kz)', totalAmount],
          ['Em Cobrança Regular (Kz)', emCursoAmount],
          ['Crédito em Risco NPL (Kz)', vencidoAmount],
          ['Contratos Em Curso', emCurso.length],
          ['Contratos em Risco', vencido.length],
          ['Contratos Liquidados', liquidado.length],
        ],
      },
      {
        title: 'CONTRATOS POR ESTADO',
        headers: ['estado', 'quantidade', 'valor_total_kz'],
        rows: [
          ['Em Cobrança Regular', emCurso.length, emCursoAmount],
          ['Crédito em Risco (NPL)', vencido.length, vencidoAmount],
          ['Liquidado', liquidado.length, liquidado.reduce((a, c) => a + (c.amount || 0), 0)],
        ],
      },
      {
        title: 'CONTRATOS POR TIPO',
        headers: ['tipo', 'quantidade'],
        rows: Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => [t.replace(/_/g, ' '), n]),
      },
      {
        title: 'LISTAGEM COMPLETA DE CONTRATOS',
        headers: ['Referencia', 'Mutuario', 'Tipo', 'Valor (Kz)', 'Taxa (%)', 'Data Inicio', 'Data Fim', 'Proximo Vencimento', 'Estado'],
        rows: contracts.map(r => [r.reference, r.client_name, r.contract_type, r.amount, r.interest_rate, r.celebration_date, r.end_date, r.proximo_vencimento, r.status]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Carteira de Crédito" breadcrumb="MAIOMBE / Carteira de Crédito" onExport={handleExport} />
      <div className="ct">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Crédito Concedido Total" value={totalAmount > 0 ? (totalAmount / 1e9).toFixed(1) : '—'} unit="Mil M Kz" delta={`${total} contratos`} deltaType="up" variant="gold" />
          <KpiCard label="Em Cobrança Regular" value={emCursoAmount > 0 ? (emCursoAmount / 1e9).toFixed(1) : '—'} unit="Mil M Kz" delta={`${emCurso.length} contratos`} deltaType="up" variant="em" />
          <KpiCard label="Crédito em Risco (NPL)" value={vencidoAmount > 0 ? (vencidoAmount / 1e9).toFixed(1) : '—'} unit="Mil M Kz" delta={`${vencido.length} contratos`} deltaType="dn" variant="cr" />
          <KpiCard label="Crédito Liquidado" value={liquidado.length > 0 ? liquidado.length : '—'} unit="contratos" delta="Totalmente pagos" deltaType="up" variant="am" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Panel title="Exposição por Tipo de Entidade" tag="Concentração">
            <div style={{ padding: '14px 14px 10px' }}>
              {entityRows.length > 0
                ? <EntityChart rows={entityRows} />
                : <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#364858', fontSize: 11 }}>Sem contratos activos para análise</div>}
            </div>
          </Panel>
          <Panel title="Distribuição Sectorial" tag="Por projeto financiado">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
              {sectorRows.length > 0
                ? <SectorPie rows={sectorRows} />
                : <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#364858', fontSize: 11 }}>Sem projectos com contrato associado</div>}
            </div>
          </Panel>
        </div>

        <Panel title="Carteira Completa — Todos os Contratos" actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#7888A0' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
                style={{ paddingLeft: 27, height: 26, fontSize: 10 }} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: 26, fontSize: 10 }}>
              <option value="">Todos os Estados</option>
              {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <button style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '4px 9px', fontSize: 8.5 }}>
              + Novo Contrato
            </button>
          </div>
        }>
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Referência</th><th>Mutuário</th><th>Tipo</th><th>Valor Financiado (Kz)</th>
                    <th>Taxa</th><th>Data Início</th><th>Data Fim</th><th>Executado</th>
                    <th>Saldo Devedor</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => {
                    const days = c.proximo_vencimento ? daysUntil(c.proximo_vencimento) : null;
                    const isOverdue = days !== null && days < 0;
                    const isUrgent = days !== null && days <= 7 && days >= 0;
                    const execPct = 0;
                    return (
                      <tr key={c.id}>
                        <td className="td-mono td-bold">{c.reference}</td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.client_name}</td>
                        <td style={{ fontSize: 8.5, color: '#7888A0', textTransform: 'capitalize' }}>{c.contract_type?.replace(/_/g, ' ')}</td>
                        <td className="td-mono">{formatKz(c.amount)}</td>
                        <td className="td-mono">{c.interest_rate}%</td>
                        <td>{formatDate(c.celebration_date)}</td>
                        <td>{formatDate(c.end_date)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ProgressBar value={execPct} />
                            <span style={{ fontSize: 8.5 }}>{execPct}%</span>
                          </div>
                        </td>
                        <td className="td-mono" style={{ color: isOverdue ? '#D43352' : isUrgent ? '#E09020' : undefined }}>
                          {isOverdue ? 'VENCIDO' : c.proximo_vencimento ? formatDate(c.proximo_vencimento) : '—'}
                        </td>
                        <td><Badge value={c.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}




