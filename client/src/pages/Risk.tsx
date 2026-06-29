import { useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const ENTITY_LABELS: Record<string, string> = {
  governo_central: 'Gov. Central',
  ministerio: 'Ministérios',
  governo_provincial: 'Gov. Prov.',
  administracao_municipal: 'Adm. Mun.',
  empresa_publica: 'Emp. Pública',
  empresa_privada: 'Emp. Privada',
};

const RATING_COLORS: Record<string, string> = {
  'A+': '#26B870', A: '#26B870', 'B+': '#C9A84C', B: '#C9A84C', 'B-': '#E09020', 'C+': '#E09020', C: '#D43352',
};

const SCORING_LABELS: Record<string, string> = {
  payment_history: 'Histórico de Pagamento',
  financial_situation: 'Situação Financeira',
  political_risk: 'Risco Político / Institucional',
  contractual_risk: 'Risco Contratual',
  execution_risk: 'Risco de Execução',
  liquidity_risk: 'Risco de Liquidez',
};

function RiskChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const scores = [6.8, 6.5, 6.2, 5.9, 5.6, 5.3];
    const w = el.width, h = el.height;
    const pad = { t: 20, r: 16, b: 30, l: 40 };
    const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(201,168,76,.06)';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (gh / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gw, y); ctx.stroke();
    }

    // Alert line at 5.0
    const alertY = pad.t + gh * (1 - (5 - 3) / (9 - 3));
    ctx.strokeStyle = 'rgba(212,51,82,.4)';
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(pad.l, alertY); ctx.lineTo(pad.l + gw, alertY); ctx.stroke();
    ctx.setLineDash([]);

    const toX = (i: number) => pad.l + (i / (labels.length - 1)) * gw;
    const toY = (v: number) => pad.t + gh * (1 - (v - 3) / (9 - 3));

    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    scores.forEach((v, i) => i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)));
    ctx.stroke();

    scores.forEach((v, i) => {
      ctx.fillStyle = '#C9A84C';
      ctx.beginPath(); ctx.arc(toX(i), toY(v), 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#07090C';
      ctx.beginPath(); ctx.arc(toX(i), toY(v), 1.5, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#7888A0';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    labels.forEach((l, i) => ctx.fillText(l, toX(i), h - 8));
    ctx.textAlign = 'right';
    [3, 5, 7, 9].forEach(v => ctx.fillText(String(v), pad.l - 4, toY(v) + 3));
  }, []);

  return <canvas ref={canvasRef} width={380} height={200} style={{ width: '100%', height: 200 }} />;
}

const EMPTY_RISK = {
  contract_id: '', client_id: '', risk_level: 'medio', overall_score: '',
  payment_history_score: '', financial_situation_score: '', political_risk_score: '',
  contractual_risk_score: '', execution_risk_score: '', liquidity_risk_score: '',
  recommended_action: '', action_deadline: '', notes: '',
};

export default function Risk() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_RISK);
  const [formError, setFormError] = useState('');

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-select'],
    queryFn: () => api.get('/contracts', { params: { limit: 200 } }).then(r => r.data.data || []),
  });
  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: () => api.get('/clients', { params: { limit: 100 } }).then(r => r.data.data?.data || []),
  });

  const createAssessment = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/risk/assessments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk'] });
      setShowForm(false);
      setFormError('');
      setForm(EMPTY_RISK);
    },
    onError: (e: any) => setFormError(e.response?.data?.message || 'Erro ao registar avaliação'),
  });

  function upd(k: keyof typeof EMPTY_RISK, v: string) { setForm(p => ({ ...p, [k]: v })); }

  const WEIGHTS = { payment_history_score: 30, financial_situation_score: 25, political_risk_score: 20, contractual_risk_score: 10, execution_risk_score: 10, liquidity_risk_score: 5 };

  function calcScore(): number | null {
    const keys = Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>;
    const filled = keys.filter(k => form[k as keyof typeof form] !== '');
    if (filled.length < 3) return null;
    const totalWeight = filled.reduce((a, k) => a + WEIGHTS[k], 0);
    const weighted = filled.reduce((a, k) => a + Number(form[k as keyof typeof form]) * WEIGHTS[k], 0);
    return Math.round((weighted / totalWeight) * 10) / 10;
  }

  function submitAssessment(e: React.FormEvent) {
    e.preventDefault();
    const autoScore = calcScore();
    if (!form.contract_id || !form.risk_level) {
      setFormError('Preencha contrato e nível de risco.');
      return;
    }
    const finalScore = autoScore ?? (form.overall_score ? +form.overall_score : null);
    if (!finalScore) { setFormError('Preencha pelo menos 3 indicadores de scoring.'); return; }
    const contractObj = (contractsData || []).find((c: { id: string; client_id: string }) => c.id === form.contract_id);
    const autoScore2 = calcScore();
    createAssessment.mutate({
      ...form,
      client_id: contractObj?.client_id || form.client_id,
      overall_score: autoScore2 ?? +form.overall_score,
      payment_history_score: form.payment_history_score ? +form.payment_history_score : null,
      financial_situation_score: form.financial_situation_score ? +form.financial_situation_score : null,
      political_risk_score: form.political_risk_score ? +form.political_risk_score : null,
      contractual_risk_score: form.contractual_risk_score ? +form.contractual_risk_score : null,
      execution_risk_score: form.execution_risk_score ? +form.execution_risk_score : null,
      liquidity_risk_score: form.liquidity_risk_score ? +form.liquidity_risk_score : null,
    });
  }

  const inputStyle = { width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 6, padding: '6px 10px', color: '#E5EBF2', fontSize: 11, boxSizing: 'border-box' as const };

  const { data: riskData, isLoading } = useQuery({
    queryKey: ['risk'],
    queryFn: () => api.get('/risk').then(r => r.data.data),
  });

  type KpisMap = Record<string, { count: number; total: number }>;
  const matrixData: Array<{ risk_level: string; count: number; total_amount: number }> = riskData?.matrix || [];
  const watchList = riskData?.watchList || [];
  const kpisMap: KpisMap = riskData?.kpis || {};
  const ratingByType: Record<string, { rating: string; count: number; total: number }> = riskData?.ratingByType || {};
  const scoringIndicators = riskData?.scoringIndicators || [];

  const getLevel = (level: string) => {
    const fromMatrix = matrixData.find(m => m.risk_level === level);
    if (fromMatrix) return fromMatrix;
    const fromKpis = kpisMap[level];
    if (fromKpis) return { risk_level: level, count: fromKpis.count, total_amount: fromKpis.total };
    return { risk_level: level, count: 0, total_amount: 0 };
  };

  const baixo = getLevel('baixo');
  const medio = getLevel('medio');
  const alto = getLevel('alto');
  const critico = getLevel('critico');

  const ratingsEntries = Object.keys(ENTITY_LABELS).map(key => ({
    entity_type: key,
    label: ENTITY_LABELS[key],
    rating: ratingByType[key]?.rating || '—',
    count: ratingByType[key]?.count || 0,
  }));

  const watchListTyped = watchList as Array<{
    id: string; reference: string; client_name: string; contract_amount: number;
    risk_level: string; overall_score: number; notes: string; recommended_action: string; action_deadline: string;
  }>;

  const evalBadge = (ev: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      Positivo: { bg: 'rgba(38,184,112,.12)', color: '#26B870' },
      Neutro: { bg: 'rgba(224,144,32,.1)', color: '#E09020' },
      Negativo: { bg: 'rgba(212,51,82,.09)', color: '#D43352' },
      Crítico: { bg: 'rgba(212,51,82,.18)', color: '#FF2040' },
    };
    const c = colors[ev] || colors.Neutro;
    return <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, background: c.bg, color: c.color, border: `1px solid ${c.color}33` }}>{ev}</span>;
  };

  async function handleExport() {
    const wl = watchListTyped as Array<any>;
    const byLevel: Record<string, { count: number; total: number }> = {};
    wl.forEach(r => {
      const k = r.risk_level || 'outro';
      if (!byLevel[k]) byLevel[k] = { count: 0, total: 0 };
      byLevel[k].count++; byLevel[k].total += r.contract_amount || 0;
    });
    await downloadExcel('MAIOMBE_Risco_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Avaliacoes de Risco', wl.length],
          ['Em Vigilancia Reforcada', wl.filter(r => r.risk_level === 'critico' || r.risk_level === 'alto').length],
          ['Risco Critico', wl.filter(r => r.risk_level === 'critico').length],
          ['Risco Alto', wl.filter(r => r.risk_level === 'alto').length],
          ['Risco Moderado', wl.filter(r => r.risk_level === 'moderado').length],
          ['Risco Baixo', wl.filter(r => r.risk_level === 'baixo').length],
          ['Valor Total em Risco (Kz)', wl.reduce((a, r) => a + (r.contract_amount || 0), 0)],
        ],
      },
      {
        title: 'DISTRIBUICAO POR NIVEL DE RISCO',
        headers: ['nivel_risco', 'quantidade', 'valor_total_kz'],
        rows: ['critico', 'alto', 'moderado', 'baixo'].map(level => [
          level, byLevel[level]?.count ?? 0, byLevel[level]?.total ?? 0,
        ]),
      },
      {
        title: 'SCORING POR INDICADOR',
        headers: ['indicador', 'peso_pct'],
        rows: [
          ['Historico de Pagamentos', 30],
          ['Situacao Financeira', 25],
          ['Risco Politico/Institucional', 20],
          ['Risco Contratual', 10],
          ['Risco de Execucao', 10],
          ['Risco de Liquidez', 5],
        ],
      },
      {
        title: 'LISTA DE VIGILANCIA REFORCADA',
        headers: ['Referencia', 'Mutuario', 'Valor em Risco (Kz)', 'Nivel de Risco', 'Score Global', 'Acao Recomendada', 'Prazo'],
        rows: wl.map(r => [r.reference, r.client_name, r.contract_amount, r.risk_level, r.overall_score, r.recommended_action, r.action_deadline]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Gestão de Risco" onExport={handleExport} breadcrumb="MAIOMBE / Gestão de Risco"
        showNewButton newLabel="+ Nova Avaliação" onNew={() => setShowForm(p => !p)} />
      <div className="ct">
        {showForm && (
          <Panel title="Nova Avaliação de Risco" style={{ marginBottom: 12 }}>
            <form onSubmit={submitAssessment} style={{ padding: 14 }}>
              {formError && <div style={{ color: '#D43352', fontSize: 10, marginBottom: 10 }}>{formError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 120px', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Contrato</label>
                  <select value={form.contract_id} onChange={e => upd('contract_id', e.target.value)} style={inputStyle} required>
                    <option value="">Seleccionar contrato...</option>
                    {(contractsData || []).map((c: { id: string; reference: string; client_name?: string }) => (
                      <option key={c.id} value={c.id}>{c.reference}{c.client_name ? ` — ${c.client_name}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Nível de Risco</label>
                  <select value={form.risk_level} onChange={e => upd('risk_level', e.target.value)} style={inputStyle}>
                    <option value="baixo">Baixo</option>
                    <option value="medio">Médio</option>
                    <option value="alto">Alto</option>
                    <option value="critico">Crítico</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Score Global (0–10)</label>
                  {calcScore() != null ? (
                    <div style={{ ...inputStyle, background: 'rgba(38,184,112,.08)', border: '1px solid rgba(38,184,112,.25)', color: '#26B870', fontWeight: 700, display:'flex', alignItems:'center', gap:6 }}>
                      {calcScore()} <span style={{ fontSize:8, color:'#26B870', fontWeight:400 }}>calculado automaticamente</span>
                    </div>
                  ) : (
                    <input type="number" min="0" max="10" step="0.1" value={form.overall_score} onChange={e => upd('overall_score', e.target.value)} placeholder="Ou preencher manual" style={inputStyle} />
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 10 }}>
                {[
                  { key: 'payment_history_score', label: 'Pagamento' },
                  { key: 'financial_situation_score', label: 'Situação Financ.' },
                  { key: 'political_risk_score', label: 'Risco Político' },
                  { key: 'contractual_risk_score', label: 'Risco Contratual' },
                  { key: 'execution_risk_score', label: 'Risco Execução' },
                  { key: 'liquidity_risk_score', label: 'Risco Liquidez' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>{f.label}</label>
                    <input type="number" min="0" max="10" step="0.1"
                      value={form[f.key as keyof typeof EMPTY_RISK]}
                      onChange={e => upd(f.key as keyof typeof EMPTY_RISK, e.target.value)}
                      placeholder="—" style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10, marginBottom: 10 }}>
                <input value={form.recommended_action} onChange={e => upd('recommended_action', e.target.value)} placeholder="Acção recomendada" style={inputStyle} />
                <input value={form.action_deadline} onChange={e => upd('action_deadline', e.target.value)} placeholder="Prazo (ex: 7 dias)" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Observações (opcional)" style={{ ...inputStyle, flex: 1 }} />
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-gold" disabled={createAssessment.isPending}>
                  {createAssessment.isPending ? <><Loader2 size={11} className="spin" /> A salvar...</> : 'Registar Avaliação'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Risco Baixo" value={baixo.count} unit="contratos" delta={formatKz(baixo.total_amount, true)} deltaType="up" variant="em" />
          <KpiCard label="Risco Médio" value={medio.count} unit="contratos" delta={formatKz(medio.total_amount, true)} deltaType="nt" variant="am" />
          <KpiCard label="Risco Alto" value={alto.count} unit="contratos" delta={formatKz(alto.total_amount, true)} deltaType="dn" variant="cr" />
          <KpiCard label="Risco Crítico" value={critico.count} unit="contratos" delta={formatKz(critico.total_amount, true)} deltaType="dn" variant="cr" />
        </div>

        {/* Rating grid */}
        <Panel title="Rating por Tipo de Entidade — Classificação Interna" tag="Actualizado Jun 2026" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, padding: 16 }}>
            {ratingsEntries.map(r => {
              const ratingColor = RATING_COLORS[r.rating] || '#C9A84C';
              return (
                <div key={r.entity_type} style={{ textAlign: 'center', padding: 14, background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.1)', borderRadius: 8 }}>
                  <div style={{ fontSize: 8.5, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{r.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: ratingColor, lineHeight: 1 }}>{r.rating}</div>
                  <div style={{ fontSize: 8.5, color: '#7888A0', marginTop: 4 }}>{r.count} contratos</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Panel title="Scoring Detalhado por Indicador" tag="Ponderação Interna">
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Indicador de Risco</th><th>Peso</th><th>Score Médio</th><th>Tendência</th><th>Avaliação</th></tr>
                </thead>
                <tbody>
                  {scoringIndicators.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#7888A0', padding: '20px 0' }}>
                        Registe avaliações de risco para ver o scoring por indicador.
                      </td>
                    </tr>
                  ) : scoringIndicators.map((s: { indicator: string; weight: number; avg_score: number; trend: string; evaluation: string }, i: number) => {
                    const scoreColor = s.avg_score >= 7 ? '#26B870' : s.avg_score >= 5.5 ? '#C9A84C' : '#D43352';
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: '#E5EBF2' }}>{SCORING_LABELS[s.indicator] || s.indicator}</td>
                        <td className="td-mono">{s.weight}%</td>
                        <td style={{ color: scoreColor, fontWeight: 700 }}>{s.avg_score?.toFixed(1)} / 10</td>
                        <td style={{ fontSize: 9.5, color: s.trend?.includes('▲') ? '#26B870' : s.trend?.includes('▼') ? '#D43352' : '#7888A0' }}>{s.trend || '—'}</td>
                        <td>{evalBadge(s.evaluation)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Evolução do Score de Risco">
            <div style={{ padding: '14px 14px 10px' }}>
              <RiskChart />
            </div>
          </Panel>
        </div>

        <Panel title="Contratos em Vigilância Reforçada" tag={`${watchListTyped.length} Em Risco`} tagVariant="cr">
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Referência</th><th>Mutuário</th><th>Valor em Risco (Kz)</th>
                    <th>Score</th><th>Motivo Principal</th><th>Acção Recomendada</th><th>Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {watchListTyped.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#7888A0', padding: '24px 0' }}>
                        Nenhum contrato em vigilância reforçada.
                      </td>
                    </tr>
                  ) : watchListTyped.map((c, i) => {
                    const isCrit = c.risk_level === 'critico';
                    const scoreColor = c.overall_score < 3.5 ? '#D43352' : c.overall_score < 5 ? '#E09020' : '#7888A0';
                    return (
                      <tr key={c.id || i}>
                        <td className="td-mono td-bold">{c.reference}</td>
                        <td>{c.client_name}</td>
                        <td className="td-mono" style={{ color: isCrit ? '#D43352' : '#E09020' }}>{formatKz(c.contract_amount)}</td>
                        <td>
                          <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9.5, fontWeight: 700, background: isCrit ? 'rgba(212,51,82,.15)' : 'rgba(212,51,82,.09)', color: scoreColor, border: `1px solid ${scoreColor}33` }}>
                            {c.overall_score?.toFixed(1)}/10
                          </span>
                        </td>
                        <td style={{ fontSize: 9.5, color: '#7888A0' }}>{c.notes}</td>
                        <td style={{ fontSize: 9.5 }}>{c.recommended_action}</td>
                        <td style={{ color: isCrit ? '#D43352' : '#E09020', fontSize: 9.5, fontWeight: 600 }}>{c.action_deadline}</td>
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





