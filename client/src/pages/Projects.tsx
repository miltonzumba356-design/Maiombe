import { useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge, ProgressBar } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const SECTORS = ['saude', 'energia', 'infraestrutura', 'habitacao', 'educacao', 'agricultura', 'agua', 'transporte', 'outros'];

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
  saude: 'Saúde', energia: 'Energia', infraestrutura: 'Infraestrutura',
  habitacao: 'Habitação', educacao: 'Educação', agricultura: 'Agricultura',
  agua: 'Água', transporte: 'Transporte', outros: 'Outros',
};

interface SectorRow { sector: string; count: number; total_financed: number; pct: number; }
interface ProvinceRow { province: string; count: number; total_financed: number; pct: number; }
const PROVINCES_LIST = ['Luanda', 'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'];
const STATUS_OPTS = ['arranque', 'em_execucao', 'concluido', 'suspenso', 'desvio'];

const EMPTY_FORM = {
  name: '', executing_entity: '', beneficiary: '', location: '',
  province: '', sector: 'infraestrutura', total_value: '',
  financed_amount: '', execution_percentage: '0', contract_id: '',
  status: 'arranque', start_date: '', end_date: '', notes: '',
};

function SectorPie({ rows }: { rows: SectorRow[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    if (!rows.length) return;

    const w = el.width, h = el.height;
    const cx = w / 2, cy = (h - 40) / 2, r = Math.min(w, h - 40) * 0.4;
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
    const lcols = Math.min(slices.length, 2), lw = 90, lx = (w - lcols * lw) / 2;
    ctx.font = '8px system-ui';
    slices.forEach((s, i) => {
      const x = lx + (i % lcols) * lw;
      const y = cy + r + 14 + Math.floor(i / lcols) * 14;
      ctx.fillStyle = s.color; ctx.fillRect(x, y - 7, 7, 7);
      ctx.fillStyle = '#7888A0'; ctx.textAlign = 'left'; ctx.fillText(`${s.label} ${s.pct}%`, x + 10, y);
    });
  }, [rows]);
  return <canvas ref={ref} width={240} height={240} style={{ maxWidth: 240, maxHeight: 240 }} />;
}

export default function Projects() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data.data),
  });

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-select'],
    queryFn: () => api.get('/contracts', { params: { limit: 200 } }).then(r => r.data.data || []),
  });

  const { data: analytics } = useQuery({
    queryKey: ['projects-analytics'],
    queryFn: () => api.get('/projects/analytics').then(r => r.data.data),
    staleTime: 60_000,
  });

  const sectorRows: SectorRow[] = analytics?.sectorDistribution || [];
  const provinceRows: ProvinceRow[] = analytics?.provinceDistribution || [];

  const projects = (data?.data || []) as Array<{
    id: string; code: string; name: string; notes: string; sector: string;
    contract_reference: string; executing_entity: string; total_value: number;
    financed_amount: number; start_date: string; end_date: string;
    status: string; execution_percentage: number; province: string;
  }>;
  const kpis = data?.kpis;

  const createProject = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/projects', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
      setFormError('');
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => setFormError(e.response?.data?.message || 'Erro ao registar projecto'),
  });

  function upd(k: keyof typeof EMPTY_FORM, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function submitProject(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.executing_entity || !form.total_value) {
      setFormError('Preencha designação, entidade executora e valor global.');
      return;
    }
    createProject.mutate({
      ...form,
      total_value: +form.total_value,
      financed_amount: form.financed_amount ? +form.financed_amount : +form.total_value,
      execution_percentage: +form.execution_percentage || 0,
      contract_id: form.contract_id || null,
    });
  }

  const inputStyle = { width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 6, padding: '6px 10px', color: '#E5EBF2', fontSize: 11, boxSizing: 'border-box' as const };

  async function handleExport() {
    const bySector: Record<string, { count: number; total: number }> = {};
    projects.forEach((p: any) => {
      const k = p.sector || 'outro';
      if (!bySector[k]) bySector[k] = { count: 0, total: 0 };
      bySector[k].count++; bySector[k].total += p.financed_amount || 0;
    });
    const byStatus: Record<string, number> = {};
    projects.forEach((p: any) => { byStatus[p.status || 'outro'] = (byStatus[p.status || 'outro'] || 0) + 1; });
    const totalFinanc = projects.reduce((a: number, p: any) => a + (p.financed_amount || 0), 0);
    await downloadExcel('MAIOMBE_Projetos_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Projetos Financiados', projects.length],
          ['Valor Total Financiado (Kz)', totalFinanc],
          ['Projetos em Execucao', projects.filter((p: any) => p.status === 'em_execucao').length],
          ['Projetos Concluidos', projects.filter((p: any) => p.status === 'concluido').length],
          ['Projetos em Risco', projects.filter((p: any) => p.status === 'em_risco').length],
        ],
      },
      {
        title: 'PROJETOS POR SECTOR',
        headers: ['sector', 'quantidade', 'valor_financiado_kz'],
        rows: Object.entries(bySector).sort((a, b) => b[1].total - a[1].total).map(([s, v]) => [s.replace(/_/g, ' '), v.count, v.total]),
      },
      {
        title: 'PROJETOS POR ESTADO',
        headers: ['estado', 'quantidade'],
        rows: Object.entries(byStatus).map(([s, n]) => [s.replace(/_/g, ' '), n]),
      },
      {
        title: 'LISTAGEM COMPLETA DE PROJETOS',
        headers: ['Referencia', 'Designacao', 'Entidade', 'Localizacao', 'Sector', 'Valor Global (Kz)', 'Financiado (Kz)', 'Contrato', 'Estado'],
        rows: projects.map((r: any) => [r.reference, r.name, r.entity_name, r.location, r.sector, r.total_value, r.financed_amount, r.contract_reference, r.status]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Projetos Financiados" onExport={handleExport} breadcrumb="MAIOMBE / Projetos"
        showNewButton newLabel="+ Registar Projecto" onNew={() => setShowForm(p => !p)} />
      <div className="ct">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Projectos em Carteira" value={kpis?.total ?? projects.length} delta="Total activos" deltaType="up" variant="gold" />
          <KpiCard label="Em Execução" value={kpis?.emExecucao ?? 0} delta={kpis ? `${Math.round((kpis.emExecucao / kpis.total) * 100)}%` : '—'} deltaType="up" variant="em" />
          <KpiCard label="Em Arranque" value={kpis?.emArranque ?? 0} delta="Mobilização em curso" deltaType="nt" variant="am" />
          <KpiCard label="Com Desvios" value={kpis?.comDesvios ?? 0} delta="Acção correctiva" deltaType="dn" variant="cr" />
        </div>

        {showForm && (
          <Panel title="Registar Novo Projecto" style={{ marginBottom: 12 }}>
            <form onSubmit={submitProject} style={{ padding: 14 }}>
              {formError && <div style={{ color: '#D43352', fontSize: 10, marginBottom: 10 }}>{formError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 160px', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Designação do Projecto</label>
                  <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Nome do projecto" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Sector</label>
                  <select value={form.sector} onChange={e => upd('sector', e.target.value)} style={inputStyle}>
                    {SECTORS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Província</label>
                  <select value={form.province} onChange={e => upd('province', e.target.value)} style={inputStyle}>
                    <option value="">— Seleccionar —</option>
                    {PROVINCES_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Entidade Executora</label>
                  <input value={form.executing_entity} onChange={e => upd('executing_entity', e.target.value)} placeholder="Nome da entidade" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Beneficiário</label>
                  <input value={form.beneficiary} onChange={e => upd('beneficiary', e.target.value)} placeholder="Beneficiário (opcional)" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 140px 140px', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Valor Global (Kz)</label>
                  <input type="number" value={form.total_value} onChange={e => upd('total_value', e.target.value)} placeholder="0" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Montante Financiado (Kz)</label>
                  <input type="number" value={form.financed_amount} onChange={e => upd('financed_amount', e.target.value)} placeholder="= valor global" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Exec. (%)</label>
                  <input type="number" min="0" max="100" value={form.execution_percentage} onChange={e => upd('execution_percentage', e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Data Início</label>
                  <input type="date" value={form.start_date} onChange={e => upd('start_date', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Data Conclusão</label>
                  <input type="date" value={form.end_date} onChange={e => upd('end_date', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Contrato Associado</label>
                  <select value={form.contract_id} onChange={e => upd('contract_id', e.target.value)} style={inputStyle}>
                    <option value="">— Nenhum —</option>
                    {(contractsData || []).map((c: { id: string; reference: string }) => (
                      <option key={c.id} value={c.id}>{c.reference}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Observações</label>
                  <input value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Observações (opcional)" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-gold" disabled={createProject.isPending}>
                  {createProject.isPending ? <><Loader2 size={11} className="spin" /> A salvar...</> : 'Registar Projecto'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Panel title="Distribuição por Sector">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
              {sectorRows.length > 0
                ? <SectorPie rows={sectorRows} />
                : <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#364858', fontSize: 11 }}>Sem projectos registados</div>}
            </div>
          </Panel>

          <Panel title="Volume por Província">
            {provinceRows.length > 0 ? (
              <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                {provinceRows.map((p, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 9.5, color: '#E5EBF2' }}>{p.province}</span>
                      <span style={{ fontSize: 9, color: '#C9A84C' }}>{p.count} proj.</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(201,168,76,.09)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p.pct}%`, background: 'linear-gradient(90deg,#26B870,#178A4A)', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#364858', fontSize: 11 }}>Sem projectos com província definida</div>
            )}
          </Panel>
        </div>

        <Panel title="Projectos Financiados — Detalhe" actions={
          <button onClick={() => setShowForm(p => !p)} style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '5px 9px', fontSize: 8.5 }}>
            + Registar Projecto
          </button>
        }>
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th><th>Designação do Projecto</th><th>Entidade Executora</th>
                    <th>Localização</th><th>Sector</th><th>Valor Global</th>
                    <th>Financiado</th><th>Execução</th><th>Contrato</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => {
                    const pct = p.execution_percentage || Math.round((p.financed_amount / p.total_value) * 100) || 0;
                    const pctColor = pct >= 80 ? '#E09020' : pct >= 50 ? '#C9A84C' : '#26B870';
                    return (
                      <tr key={p.id}>
                        <td className="td-mono td-bold" style={{ color: '#DEB96A' }}>{p.code}</td>
                        <td style={{ maxWidth: 200 }}>{p.name}</td>
                        <td style={{ fontSize: 9.5, color: '#7888A0' }}>{p.executing_entity}</td>
                        <td style={{ fontSize: 9.5, color: '#7888A0' }}>{p.province}</td>
                        <td style={{ fontSize: 9.5, color: '#7888A0', textTransform: 'capitalize' }}>{p.sector?.replace(/_/g, ' ')}</td>
                        <td className="td-mono">{formatKz(p.total_value)}</td>
                        <td className="td-mono">{formatKz(p.financed_amount)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 60, height: 4, background: 'rgba(201,168,76,.09)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 8.5, color: pctColor }}>{pct}%</span>
                          </div>
                        </td>
                        <td className="td-mono">{p.contract_reference}</td>
                        <td><Badge value={p.status} /></td>
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





