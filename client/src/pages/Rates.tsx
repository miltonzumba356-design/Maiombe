import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, RefreshCw, Plus, Trash2, Edit2, X, ShieldCheck, Settings, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatPercent, formatKz } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

interface RateRow {
  id: string; entity_type: string; min_rate: number; base_rate: number;
  max_rate: number; management_commission: number; opening_commission: number;
}

interface CommissionRow {
  id: string; name: string; calculation_base: string;
  rate_min: number; rate_max: number; periodicity: string;
  is_capitalizable: number; can_reinvest: number; description?: string;
}

const PERIODICIDADE_OPTS = [
  'Única (assinatura)', 'Anual', 'Mensal', 'Única',
  'Automático (por dia)', 'Semestral', 'Trimestral',
];

const inpStyle: React.CSSProperties = {
  background: 'rgba(7,9,12,.6)', border: '1px solid rgba(38,184,112,.2)',
  borderRadius: 4, color: '#E5EBF2', fontSize: 9.5, padding: '3px 7px',
  boxSizing: 'border-box',
};

export default function Rates() {
  const queryClient = useQueryClient();

  // ── Rate table state ──────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RateRow>>({});
  const [saveMsg, setSaveMsg] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    entity_type: '', min_rate: '', base_rate: '', max_rate: '',
    management_commission: '', opening_commission: '',
  });
  const [addErr, setAddErr] = useState('');

  // ── Commission state ──────────────────────────────────────────────────────
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [editCommForm, setEditCommForm] = useState<Partial<CommissionRow>>({});
  const [showAddComm, setShowAddComm] = useState(false);
  const [addCommForm, setAddCommForm] = useState({
    name: '', calculation_base: '', rate_min: '', rate_max: '',
    periodicity: 'Mensal', is_capitalizable: false, can_reinvest: false, description: '',
  });
  const [addCommErr, setAddCommErr] = useState('');
  const [commSaveMsg, setCommSaveMsg] = useState('');

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: ratesResp, isLoading } = useQuery({
    queryKey: ['rates'],
    queryFn: () => api.get('/rates').then(r => r.data.data),
  });
  const rateTables: RateRow[] = ratesResp?.rateTables || [];
  const commissions: CommissionRow[] = ratesResp?.commissions || [];

  const { data: liabData } = useQuery({
    queryKey: ['liabilities'],
    queryFn: () => api.get('/liabilities').then(r => r.data.data),
    staleTime: 60_000,
  });
  const custoPassivoApi: number | null = liabData?.kpis?.custoMedioPassivo ?? null;

  // ── Rate mutations ────────────────────────────────────────────────────────
  const saveRate = useMutation({
    mutationFn: (row: RateRow) => api.put(`/rates/${row.id}`, row),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      setEditingId(null);
      setSaveMsg('Taxa actualizada com sucesso.');
      setTimeout(() => setSaveMsg(''), 3000);
    },
  });

  const addRate = useMutation({
    mutationFn: (data: typeof addForm) => api.post('/rates', {
      ...data, min_rate: +data.min_rate, base_rate: +data.base_rate,
      max_rate: +data.max_rate, management_commission: +data.management_commission,
      opening_commission: +data.opening_commission,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      setShowAddForm(false);
      setAddForm({ entity_type: '', min_rate: '', base_rate: '', max_rate: '', management_commission: '', opening_commission: '' });
      setAddErr('');
      setSaveMsg('Novo tipo de mutuário adicionado.');
      setTimeout(() => setSaveMsg(''), 3000);
    },
    onError: (e: any) => setAddErr(e.response?.data?.message || 'Erro ao criar tabela'),
  });

  const deleteRate = useMutation({
    mutationFn: (id: string) => api.delete(`/rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      setSaveMsg('Tipo de mutuário eliminado.');
      setTimeout(() => setSaveMsg(''), 3000);
    },
  });

  // ── Commission mutations ──────────────────────────────────────────────────
  const updateComm = useMutation({
    mutationFn: (data: CommissionRow) => api.put(`/commissions/${data.id}`, {
      name: data.name, calculation_base: data.calculation_base,
      rate_min: Number(data.rate_min), rate_max: Number(data.rate_max),
      periodicity: data.periodicity, is_capitalizable: data.is_capitalizable,
      can_reinvest: data.can_reinvest, description: data.description,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      setEditingCommId(null);
      setCommSaveMsg('Política de comissão actualizada.');
      setTimeout(() => setCommSaveMsg(''), 3000);
    },
  });

  const createComm = useMutation({
    mutationFn: (data: typeof addCommForm) => api.post('/commissions', {
      name: data.name, calculation_base: data.calculation_base,
      rate_min: +data.rate_min || 0, rate_max: +data.rate_max || 0,
      periodicity: data.periodicity, is_capitalizable: data.is_capitalizable,
      can_reinvest: data.can_reinvest, description: data.description,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      setShowAddComm(false);
      setAddCommErr('');
      setAddCommForm({ name: '', calculation_base: '', rate_min: '', rate_max: '', periodicity: 'Mensal', is_capitalizable: false, can_reinvest: false, description: '' });
      setCommSaveMsg('Nova regra adicionada à política.');
      setTimeout(() => setCommSaveMsg(''), 3000);
    },
    onError: (e: any) => setAddCommErr(e.response?.data?.message || 'Erro ao criar regra'),
  });

  const deleteComm = useMutation({
    mutationFn: (id: string) => api.delete(`/commissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      setCommSaveMsg('Regra de comissão eliminada.');
      setTimeout(() => setCommSaveMsg(''), 3000);
    },
  });

  function startEditComm(r: CommissionRow) {
    setEditingCommId(r.id);
    setEditCommForm({ ...r });
  }

  function startEdit(r: RateRow) {
    setEditingId(r.id);
    setEditForm({ min_rate: r.min_rate, base_rate: r.base_rate, max_rate: r.max_rate, management_commission: r.management_commission, opening_commission: r.opening_commission });
  }

  // ── Margem de Intermediação ───────────────────────────────────────────────
  const [showCostForm, setShowCostForm] = useState(false);
  const [costForm, setCostForm] = useState({ name: '', category: 'pessoal', amount_monthly: '', notes: '' });
  const [costErr, setCostErr] = useState('');
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editCostForm, setEditCostForm] = useState<{ name: string; category: string; amount_monthly: number; notes: string }>({ name: '', category: 'pessoal', amount_monthly: 0, notes: '' });

  const { data: marginData, isLoading: marginLoading } = useQuery({
    queryKey: ['margin'],
    queryFn: () => api.get('/margin').then(r => r.data.data),
    staleTime: 30_000,
  });

  const marginTotais = marginData?.totais;
  const marginFontes: Array<{ id: string; name: string; institution: string; interest_rate: number; total_amount: number; custo_anual: number; pct_do_total: number }> = marginData?.fontes || [];
  const marginContratos: Array<{ id: string; reference: string; client_name: string; interest_rate: number; amount: number; receita_anual: number; pct_do_total: number }> = marginData?.contratos || [];
  const marginCustos: Array<{ id: string; name: string; category: string; amount_monthly: number; is_active: number; notes: string }> = marginData?.custosOp || [];

  const createCost = useMutation({
    mutationFn: (d: typeof costForm) => api.post('/operational-costs', { ...d, amount_monthly: +d.amount_monthly }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['margin'] }); setShowCostForm(false); setCostErr(''); setCostForm({ name: '', category: 'pessoal', amount_monthly: '', notes: '' }); },
    onError: (e: any) => setCostErr(e.response?.data?.message || 'Erro ao registar'),
  });

  const updateCost = useMutation({
    mutationFn: (d: { id: string } & typeof editCostForm) => api.put(`/operational-costs/${d.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['margin'] }); setEditingCostId(null); },
  });

  const deleteCost = useMutation({
    mutationFn: (id: string) => api.delete(`/operational-costs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['margin'] }),
  });

  const COST_CATS: Record<string, { label: string; color: string }> = {
    pessoal:       { label: 'Pessoal',       color: '#C9A84C' },
    sistema:       { label: 'Sistema/TI',    color: '#26B870' },
    juridico:      { label: 'Jurídico',      color: '#D43352' },
    administrativo:{ label: 'Administrativo',color: '#7888A0' },
    outros:        { label: 'Outros',         color: '#E09020' },
  };

  // ── Simulator ─────────────────────────────────────────────────────────────
  const [selectedProfile, setSelectedProfile] = useState('');
  const [capital, setCapital] = useState(1000);
  const [taxa, setTaxa] = useState(15.5);
  const [prazo, setPrazo] = useState(24);
  const [custoPassivo, setCustoPassivo] = useState(0);
  const [comAbertura, setComAbertura] = useState(1.5);
  const [comGestao, setComGestao] = useState(0.75);
  const [capitalNaoDesembolsado, setCapitalNaoDesembolsado] = useState(0);
  const [diasAtraso, setDiasAtraso] = useState(0);
  const [custosOpMensaisM, setCustosOpMensaisM] = useState(0);

  useEffect(() => {
    if (custoPassivoApi != null && custoPassivo === 0) setCustoPassivo(custoPassivoApi);
  }, [custoPassivoApi]);

  useEffect(() => {
    if (marginCustos.length > 0 && custosOpMensaisM === 0) {
      const totalMensal = marginCustos
        .filter(c => c.is_active)
        .reduce((s, c) => s + c.amount_monthly, 0);
      setCustosOpMensaisM(Math.round(totalMensal / 1e6 * 100) / 100);
    }
  }, [marginCustos]);

  // ── Lookup das regras da política que se aplicam ao simulador ─────────────
  const polAbertura  = commissions.find(c => c.name.toLowerCase().includes('abertura'));
  const polGestao    = commissions.find(c => c.name.toLowerCase().includes('gest'));
  const polImob      = commissions.find(c => c.name.toLowerCase().includes('imobiliza'));
  const polMora      = commissions.find(c => c.name.toLowerCase().includes('mora'));

  function midpoint(c: CommissionRow | undefined) {
    if (!c) return 0;
    return Math.round(((c.rate_min + c.rate_max) / 2) * 100) / 100;
  }

  function applyProfile(entityType: string) {
    const r = rateTables.find(r => r.entity_type === entityType);
    if (!r) return;
    setSelectedProfile(entityType);
    setTaxa(r.base_rate);
    setComAbertura(r.opening_commission > 0 ? r.opening_commission : midpoint(polAbertura));
    setComGestao(r.management_commission > 0 ? r.management_commission : midpoint(polGestao));
  }

  // ── Cálculos seguindo as regras da política ───────────────────────────────
  // Juros de capital: capital × taxa × (prazo em anos)
  const juros = capital * (taxa / 100) * (prazo / 12);
  // Custo do passivo: capital × custo_passivo × (prazo em anos)
  const custo = capital * (custoPassivo / 100) * (prazo / 12);
  // Comissão de Abertura: única, sobre capital mutuado
  const commAberturaVal = capital * (comAbertura / 100);
  // Comissão de Gestão Anual: anual, sobre capital em dívida (≈ capital)
  const commGestaoVal = capital * (comGestao / 100) * (prazo / 12);
  // Comissão de Imobilização: mensal (0.25%), sobre capital não desembolsado
  const imobRate = polImob ? polImob.rate_min : 0.25;
  const commImobVal = capitalNaoDesembolsado * (imobRate / 100) * prazo;
  // Juros de Mora: automático por dia (0.05%/dia), sobre capital
  const moraRate = polMora ? polMora.rate_min : 0.05;
  const jurosMoraVal = diasAtraso > 0 ? capital * (moraRate / 100) * diasAtraso : 0;

  const totalReceitas    = juros + commAberturaVal + commGestaoVal + commImobVal + jurosMoraVal;
  const margemLiquida    = totalReceitas - custo;
  const custosOpPeriodo  = custosOpMensaisM * prazo;
  const resultadoFinal   = margemLiquida - custosOpPeriodo;
  const tir              = prazo > 0 ? (totalReceitas / capital / (prazo / 12)) * 100 : 0;
  const spread           = taxa - custoPassivo;

  // Validação dos intervalos da política
  const aperturaOk = !polAbertura || (comAbertura >= polAbertura.rate_min && comAbertura <= polAbertura.rate_max);
  const gestaoOk   = !polGestao   || (comGestao   >= polGestao.rate_min   && comGestao   <= polGestao.rate_max);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.15)',
    borderRadius: 6, padding: '6px 10px', color: '#E5EBF2', fontSize: 11, boxSizing: 'border-box',
  };

  const avgBase = rateTables.length ? Math.round(rateTables.reduce((a, r) => a + r.base_rate, 0) / rateTables.length * 10) / 10 : null;
  const avgMin  = rateTables.length ? Math.round(rateTables.reduce((a, r) => a + r.min_rate, 0) / rateTables.length * 10) / 10 : null;
  const avgCom  = rateTables.length ? Math.round(rateTables.reduce((a, r) => a + r.management_commission, 0) / rateTables.length * 10) / 10 : null;

  // ── Export ────────────────────────────────────────────────────────────────
  async function handleExport() {
    await downloadExcel('MAIOMBE_Taxas_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['Metrica', 'Valor'],
        rows: [
          ['Total de Tipos de Mutuario Configurados', rateTables.length],
          ['Taxa Base Media (%)', avgBase ?? '—'],
          ['Taxa Minima Media (%)', avgMin ?? '—'],
          ['Comissao de Gestao Media (%)', avgCom ?? '—'],
          ['Spread Medio (Taxa - Custo Passivo) (%)', custoPassivoApi != null && avgBase != null ? (avgBase - custoPassivoApi).toFixed(1) : '—'],
          ['Custo Medio do Passivo (%)', custoPassivoApi ?? '—'],
        ],
      },
      {
        title: 'POLITICA DE COMISSOES MAIOMBE',
        headers: ['Tipo de Comissao', 'Base de Calculo', 'Taxa Min (%)', 'Taxa Max (%)', 'Periodicidade', 'Recapitalizavel', 'Pode Reinvestir', 'Descricao'],
        rows: commissions.map(r => [
          r.name, r.calculation_base, r.rate_min, r.rate_max, r.periodicity,
          r.is_capitalizable ? 'Sim' : 'Nao', r.can_reinvest ? 'Sim' : 'N/A',
          r.description ?? '',
        ]),
      },
      {
        title: 'TABELA DE TAXAS POR TIPO DE MUTUARIO',
        headers: ['Tipo de Mutuario', 'Taxa Min (%)', 'Taxa Base (%)', 'Taxa Max (%)', 'Com. Gestao (%)', 'Com. Abertura (%)'],
        rows: rateTables.map(r => [r.entity_type.replace(/_/g, ' '), r.min_rate, r.base_rate, r.max_rate, r.management_commission, r.opening_commission]),
      },
    ]);
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  function badge(val: number | boolean, trueLabel: string, falseLabel: string) {
    const on = val === 1 || val === true;
    return (
      <span style={{
        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 600,
        background: on ? 'rgba(38,184,112,.12)' : 'rgba(120,136,160,.08)',
        color: on ? '#26B870' : '#7888A0',
        border: `1px solid ${on ? 'rgba(38,184,112,.22)' : 'rgba(120,136,160,.15)'}`,
      }}>{on ? trueLabel : falseLabel}</span>
    );
  }

  function toggleBtn(val: boolean, onChange: (v: boolean) => void, trueLabel: string, falseLabel: string) {
    return (
      <button onClick={() => onChange(!val)} style={{
        padding: '3px 10px', borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: 'pointer',
        background: val ? 'rgba(38,184,112,.15)' : 'rgba(120,136,160,.1)',
        color: val ? '#26B870' : '#7888A0',
        border: `1px solid ${val ? 'rgba(38,184,112,.3)' : 'rgba(120,136,160,.2)'}`,
      }}>{val ? trueLabel : falseLabel}</button>
    );
  }

  return (
    <>
      <TopBar title="Taxas, Juros & Comissões" breadcrumb="MAIOMBE / Taxas"
        showNewButton newLabel="+ Novo Tipo de Mutuário" onExport={handleExport}
        onNew={() => { setShowAddForm(v => !v); setAddErr(''); }} />
      <div style={{ padding: '22px 26px' }}>

        {/* ── KPI cards ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Taxa de Juro Base Média" value={avgBase ?? '—'} unit="%" delta={`Mín: ${avgMin ?? '—'}%`} deltaType="up" variant="gold" />
          <KpiCard label="Tipos de Mutuário" value={rateTables.length || '—'} delta="Com tabela de taxas" deltaType="nt" variant="em" />
          <KpiCard label="Custo Médio do Passivo" value={custoPassivoApi != null ? custoPassivoApi : '—'} unit="%" delta="Taxa passiva actual" deltaType="nt" variant="am" />
          <KpiCard label="Spread Médio" value={avgBase != null && custoPassivoApi != null ? `${(avgBase - custoPassivoApi) >= 0 ? '+' : ''}${Math.round((avgBase - custoPassivoApi) * 10) / 10}` : '—'} unit=" pp" delta="Activo vs Passivo" deltaType={avgBase != null && custoPassivoApi != null && avgBase > custoPassivoApi ? 'up' : 'dn'} variant="gold" />
          <KpiCard
            label="Resultado Líquido"
            value={marginTotais ? formatKz(marginTotais.resultadoLiquido) : '—'}
            delta="Após todos os custos"
            deltaType={marginTotais ? (marginTotais.resultadoLiquido >= 0 ? 'up' : 'dn') : 'nt'}
            variant={marginTotais ? (marginTotais.resultadoLiquido >= 0 ? 'em' : 'cr') : 'em'}
          />
        </div>

        {/* ── COMISSÕES — Configuração Principal ─────────────────────── */}
        <Panel
          title="Tabela de Comissões — Política Interna Maiombe"
          tag="Configuração Principal do Sistema · Editável"
          actions={
            <button
              onClick={() => { setShowAddComm(v => !v); setAddCommErr(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: showAddComm ? 'rgba(38,184,112,.18)' : 'rgba(38,184,112,.08)',
                border: '1px solid rgba(38,184,112,.25)', borderRadius: 6,
                cursor: 'pointer', color: '#26B870', padding: '5px 12px', fontSize: 10, fontWeight: 700,
              }}
            >
              {showAddComm ? <X size={11} /> : <Plus size={11} />}
              {showAddComm ? 'Cancelar' : 'Nova Regra'}
            </button>
          }
        >
          {commSaveMsg && (
            <div style={{ padding: '6px 16px', fontSize: 9.5, color: '#26B870', background: 'rgba(38,184,112,.07)', borderBottom: '1px solid rgba(38,184,112,.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={12} /> {commSaveMsg}
            </div>
          )}

          {/* Add new commission form */}
          {showAddComm && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(38,184,112,.12)', background: 'rgba(38,184,112,.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Settings size={12} color="#26B870" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#26B870' }}>Nova Regra de Comissão</span>
              </div>
              {addCommErr && (
                <div style={{ color: '#D43352', fontSize: 9.5, marginBottom: 8, padding: '4px 8px', background: 'rgba(212,51,82,.07)', borderRadius: 4 }}>{addCommErr}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1.5fr', gap: 8, marginBottom: 8 }}>
                {[
                  { label: 'Tipo de Comissão *', key: 'name', placeholder: 'Ex: Comissão de Análise' },
                  { label: 'Base de Cálculo *', key: 'calculation_base', placeholder: 'Ex: Sobre capital mutuado' },
                  { label: 'Taxa Mín. %', key: 'rate_min', type: 'number', placeholder: '0.5' },
                  { label: 'Taxa Máx. %', key: 'rate_max', type: 'number', placeholder: '2.0' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 3 }}>{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      placeholder={f.placeholder}
                      value={(addCommForm as any)[f.key]}
                      onChange={e => setAddCommForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ ...inpStyle, width: '100%' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 3 }}>Periodicidade *</label>
                  <select
                    value={addCommForm.periodicity}
                    onChange={e => setAddCommForm(p => ({ ...p, periodicity: e.target.value }))}
                    style={{ ...inpStyle, width: '100%' }}
                  >
                    {PERIODICIDADE_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 3 }}>Descrição</label>
                  <input
                    type="text"
                    placeholder="Descrição resumida da comissão..."
                    value={addCommForm.description}
                    onChange={e => setAddCommForm(p => ({ ...p, description: e.target.value }))}
                    style={{ ...inpStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 6 }}>Recapitalizável</label>
                  {toggleBtn(addCommForm.is_capitalizable, v => setAddCommForm(p => ({ ...p, is_capitalizable: v })), 'Sim', 'Não')}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 6 }}>Pode Reinvestir</label>
                  {toggleBtn(addCommForm.can_reinvest, v => setAddCommForm(p => ({ ...p, can_reinvest: v })), 'Sim', 'N/A')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => createComm.mutate(addCommForm)}
                  disabled={createComm.isPending || !addCommForm.name || !addCommForm.calculation_base}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 5, cursor: 'pointer', color: '#26B870', padding: '6px 14px', fontSize: 10, fontWeight: 700 }}
                >
                  {createComm.isPending ? <Loader2 size={11} className="spin" /> : <Save size={11} />} Guardar Regra
                </button>
                <button
                  onClick={() => { setShowAddComm(false); setAddCommErr(''); }}
                  style={{ background: 'none', border: '1px solid rgba(120,136,160,.2)', borderRadius: 5, cursor: 'pointer', color: '#7888A0', padding: '6px 12px', fontSize: 10 }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Commission table */}
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ overflow: 'auto' }}>
              <table className="data-table" style={{ minWidth: 1020 }}>
                <thead>
                  <tr>
                    <th style={{ width: 68, color: '#7888A0', fontWeight: 500 }}>Ref.</th>
                    <th>Tipo de Comissão</th>
                    <th>Base de Cálculo</th>
                    <th style={{ width: 118 }}>Taxa / Intervalo</th>
                    <th style={{ width: 148 }}>Periodicidade</th>
                    <th style={{ width: 92, textAlign: 'center' }}>Recapitalizável</th>
                    <th style={{ width: 84, textAlign: 'center' }}>Reinvestir</th>
                    <th style={{ minWidth: 200 }}>Descrição</th>
                    <th style={{ width: 100 }}>Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(r => {
                    const isEditing = editingCommId === r.id;
                    const ef = editCommForm;
                    return (
                      <tr key={r.id} style={{ background: isEditing ? 'rgba(38,184,112,.04)' : undefined }}>
                        <td style={{ fontFamily: 'monospace', fontSize: 8.5, color: '#364858' }}>
                          {r.id.slice(0, 8)}…
                        </td>
                        <td style={{ fontWeight: isEditing ? 400 : 600, color: '#fff' }}>
                          {isEditing
                            ? <input type="text" value={ef.name ?? r.name} onChange={e => setEditCommForm(p => ({ ...p, name: e.target.value }))} style={{ ...inpStyle, width: '100%', minWidth: 140 }} />
                            : r.name}
                        </td>
                        <td style={{ color: '#7888A0', fontSize: 9.5 }}>
                          {isEditing
                            ? <input type="text" value={ef.calculation_base ?? r.calculation_base} onChange={e => setEditCommForm(p => ({ ...p, calculation_base: e.target.value }))} style={{ ...inpStyle, width: '100%', minWidth: 130 }} />
                            : r.calculation_base}
                        </td>
                        <td className="td-mono">
                          {isEditing
                            ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <input type="number" step="0.01" value={ef.rate_min ?? r.rate_min} onChange={e => setEditCommForm(p => ({ ...p, rate_min: +e.target.value }))} style={{ ...inpStyle, width: 46 }} />
                                <span style={{ color: '#364858', fontSize: 9 }}>–</span>
                                <input type="number" step="0.01" value={ef.rate_max ?? r.rate_max} onChange={e => setEditCommForm(p => ({ ...p, rate_max: +e.target.value }))} style={{ ...inpStyle, width: 46 }} />
                                <span style={{ color: '#364858', fontSize: 9 }}>%</span>
                              </div>
                            )
                            : (
                              <span style={{ color: '#C9A84C' }}>
                                {r.rate_min === r.rate_max ? `${r.rate_min}%` : `${r.rate_min}%–${r.rate_max}%`}
                              </span>
                            )}
                        </td>
                        <td style={{ fontSize: 9.5 }}>
                          {isEditing
                            ? (
                              <select value={ef.periodicity ?? r.periodicity} onChange={e => setEditCommForm(p => ({ ...p, periodicity: e.target.value }))} style={{ ...inpStyle, width: '100%' }}>
                                {PERIODICIDADE_OPTS.map(o => <option key={o}>{o}</option>)}
                              </select>
                            )
                            : r.periodicity}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isEditing
                            ? toggleBtn(!!(ef.is_capitalizable ?? r.is_capitalizable), v => setEditCommForm(p => ({ ...p, is_capitalizable: v ? 1 : 0 })), 'Sim', 'Não')
                            : badge(r.is_capitalizable, 'Sim', 'Não')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isEditing
                            ? toggleBtn(!!(ef.can_reinvest ?? r.can_reinvest), v => setEditCommForm(p => ({ ...p, can_reinvest: v ? 1 : 0 })), 'Sim', 'N/A')
                            : badge(r.can_reinvest, 'Sim', 'N/A')}
                        </td>
                        <td style={{ fontSize: 9, color: '#7888A0', lineHeight: 1.5 }}>
                          {isEditing
                            ? <input type="text" value={ef.description ?? r.description ?? ''} onChange={e => setEditCommForm(p => ({ ...p, description: e.target.value }))} style={{ ...inpStyle, width: '100%', minWidth: 180 }} />
                            : (r.description ?? '—')}
                        </td>
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                disabled={updateComm.isPending}
                                onClick={() => updateComm.mutate({ ...r, ...ef } as CommissionRow)}
                                style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.25)', borderRadius: 4, cursor: 'pointer', color: '#26B870', padding: '3px 8px', fontSize: 8.5, fontWeight: 700 }}
                              >
                                {updateComm.isPending ? <Loader2 size={9} className="spin" /> : <Save size={9} />} Salvar
                              </button>
                              <button
                                onClick={() => setEditingCommId(null)}
                                style={{ background: 'none', border: '1px solid rgba(120,136,160,.15)', borderRadius: 4, cursor: 'pointer', color: '#7888A0', padding: '3px 6px', fontSize: 8.5 }}
                              >
                                <X size={9} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => startEditComm(r)}
                                style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(38,184,112,.08)', border: '1px solid rgba(38,184,112,.18)', borderRadius: 4, cursor: 'pointer', color: '#26B870', padding: '3px 8px', fontSize: 8.5 }}
                              >
                                <Edit2 size={9} /> Editar
                              </button>
                              <button
                                onClick={() => { if (window.confirm(`Eliminar regra "${r.name}"?`)) deleteComm.mutate(r.id); }}
                                disabled={deleteComm.isPending}
                                style={{ display: 'flex', alignItems: 'center', background: 'rgba(212,51,82,.07)', border: '1px solid rgba(212,51,82,.15)', borderRadius: 4, cursor: 'pointer', color: '#D43352', padding: '3px 6px', fontSize: 8.5 }}
                              >
                                <Trash2 size={9} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {commissions.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: '#364858', padding: '24px 0', fontSize: 11 }}>
                        Sem regras de comissão configuradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* ── Rates + Simulator ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          {/* Rate table by borrower type */}
          <Panel title="Tabela de Taxas por Tipo de Mutuário" tag="Gestão Interna · Editável">
            {saveMsg && (
              <div style={{ padding: '6px 14px', fontSize: 9.5, color: '#26B870', background: 'rgba(38,184,112,.08)', borderBottom: '1px solid rgba(38,184,112,.15)' }}>{saveMsg}</div>
            )}
            {showAddForm && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(201,168,76,.1)', background: 'rgba(201,168,76,.04)' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>Novo Tipo de Mutuário</div>
                {addErr && <div style={{ color: '#D43352', fontSize: 9.5, marginBottom: 6 }}>{addErr}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(5, 1fr)', gap: 7, marginBottom: 8 }}>
                  {[
                    { label: 'Tipo de Mutuário', key: 'entity_type', type: 'text', placeholder: 'Ex: Associações' },
                    { label: 'Taxa Mín. %', key: 'min_rate', type: 'number', placeholder: '10.0' },
                    { label: 'Taxa Base %', key: 'base_rate', type: 'number', placeholder: '12.0' },
                    { label: 'Taxa Máx. %', key: 'max_rate', type: 'number', placeholder: '15.0' },
                    { label: 'Com. Gestão %', key: 'management_commission', type: 'number', placeholder: '0.75' },
                    { label: 'Com. Abertura %', key: 'opening_commission', type: 'number', placeholder: '1.0' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 3 }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={(addForm as any)[f.key]}
                        onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 4, color: '#E5EBF2', fontSize: 10, padding: '4px 7px', boxSizing: 'border-box' as const }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => addRate.mutate(addForm)} disabled={addRate.isPending || !addForm.entity_type}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.3)', borderRadius: 5, cursor: 'pointer', color: '#C9A84C', padding: '5px 12px', fontSize: 9.5, fontWeight: 700 }}>
                    {addRate.isPending ? <Loader2 size={10} className="spin" /> : <Save size={10} />} Guardar
                  </button>
                  <button onClick={() => { setShowAddForm(false); setAddErr(''); }}
                    style={{ background: 'none', border: '1px solid rgba(120,136,160,.2)', borderRadius: 5, cursor: 'pointer', color: '#7888A0', padding: '5px 10px', fontSize: 9.5 }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {isLoading ? <LoadingSpinner /> : (
              <div style={{ overflow: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tipo de Mutuário</th><th>Mín. %</th><th>Base %</th>
                      <th>Máx. %</th><th>Com. Gestão %</th><th>Com. Abertura %</th><th>Acções</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateTables.map(r => {
                      const isEditing = editingId === r.id;
                      const numInp: React.CSSProperties = { width: 58, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 4, color: '#E5EBF2', fontSize: 10, padding: '3px 5px', textAlign: 'right' };
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{r.entity_type?.replace(/_/g, ' ')}</td>
                          {isEditing ? (
                            <>
                              <td><input type="number" step="0.1" style={numInp} value={editForm.min_rate ?? r.min_rate} onChange={e => setEditForm(p => ({ ...p, min_rate: +e.target.value }))} /></td>
                              <td><input type="number" step="0.1" style={numInp} value={editForm.base_rate ?? r.base_rate} onChange={e => setEditForm(p => ({ ...p, base_rate: +e.target.value }))} /></td>
                              <td><input type="number" step="0.1" style={numInp} value={editForm.max_rate ?? r.max_rate} onChange={e => setEditForm(p => ({ ...p, max_rate: +e.target.value }))} /></td>
                              <td><input type="number" step="0.1" style={numInp} value={editForm.management_commission ?? r.management_commission} onChange={e => setEditForm(p => ({ ...p, management_commission: +e.target.value }))} /></td>
                              <td><input type="number" step="0.1" style={numInp} value={editForm.opening_commission ?? r.opening_commission} onChange={e => setEditForm(p => ({ ...p, opening_commission: +e.target.value }))} /></td>
                            </>
                          ) : (
                            <>
                              <td className="td-mono" style={{ color: '#26B870' }}>{formatPercent(r.min_rate)}</td>
                              <td className="td-mono" style={{ color: '#C9A84C', fontWeight: 700 }}>{formatPercent(r.base_rate)}</td>
                              <td className="td-mono" style={{ color: '#E09020' }}>{formatPercent(r.max_rate)}</td>
                              <td className="td-mono">{formatPercent(r.management_commission)}</td>
                              <td className="td-mono">{formatPercent(r.opening_commission)}</td>
                            </>
                          )}
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button disabled={saveRate.isPending} onClick={() => saveRate.mutate({ ...r, ...editForm } as RateRow)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.25)', borderRadius: 4, cursor: 'pointer', color: '#26B870', padding: '3px 8px', fontSize: 8.5 }}>
                                  {saveRate.isPending ? <Loader2 size={9} className="spin" /> : <Save size={9} />} Salvar
                                </button>
                                <button onClick={() => setEditingId(null)} style={{ background: 'none', border: '1px solid rgba(120,136,160,.15)', borderRadius: 4, cursor: 'pointer', color: '#7888A0', padding: '3px 6px', fontSize: 8.5, display: 'flex', alignItems: 'center' }}><X size={9} /></button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button onClick={() => startEdit(r)} style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 4, cursor: 'pointer', color: '#C9A84C', padding: '3px 8px', fontSize: 8.5 }}>Editar</button>
                                <button onClick={() => { if (window.confirm(`Eliminar tabela de "${r.entity_type}"?`)) deleteRate.mutate(r.id); }}
                                  disabled={deleteRate.isPending}
                                  style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(212,51,82,.08)', border: '1px solid rgba(212,51,82,.15)', borderRadius: 4, cursor: 'pointer', color: '#D43352', padding: '3px 6px', fontSize: 8.5 }}>
                                  <Trash2 size={8} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {rateTables.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: '#364858', padding: '18px 0' }}>Sem tabelas de taxas configuradas</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Simulator */}
          <Panel title="Simulador de Rentabilidade" tag="Segue a Política Interna de Comissões">
            <div style={{ padding: 14 }}>

              {/* Perfil de mutuário */}
              {rateTables.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 4 }}>Perfil de Mutuário</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={selectedProfile} onChange={e => applyProfile(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                      <option value="">— Seleccionar perfil (pré-preenche taxas) —</option>
                      {rateTables.map(r => <option key={r.id} value={r.entity_type}>{r.entity_type}</option>)}
                    </select>
                    {selectedProfile && (
                      <button onClick={() => { setSelectedProfile(''); setTaxa(15.5); setComAbertura(midpoint(polAbertura) || 1.5); setComGestao(midpoint(polGestao) || 0.75); setCapitalNaoDesembolsado(0); setDiasAtraso(0); }}
                        style={{ background: 'none', border: '1px solid rgba(120,136,160,.2)', borderRadius: 6, cursor: 'pointer', color: '#7888A0', padding: '0 8px' }} title="Limpar">
                        <RefreshCw size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Parâmetros base */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                {([
                  { label: 'Capital Mutuado (M Kz)', val: capital, set: setCapital, step: 100 },
                  { label: 'Taxa de Juro Activa (%)', val: taxa, set: setTaxa, step: 0.1 },
                  { label: 'Prazo (meses)', val: prazo, set: setPrazo, step: 1 },
                ] as { label: string; val: number; set: (v: number) => void; step: number }[]).map(({ label, val, set, step }, i) => (
                  <div key={i}>
                    <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 3 }}>{label}</label>
                    <input type="number" value={val} step={step} onChange={e => set(parseFloat(e.target.value) || 0)} style={inputStyle} />
                  </div>
                ))}
              </div>

              {/* Comissões — validadas pela política */}
              <div style={{ marginBottom: 6, fontSize: 8, color: '#26B870', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Comissões (seguem a Política Interna)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {/* Comissão de Abertura */}
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: aperturaOk ? '#7888A0' : '#E09020', marginBottom: 3 }}>
                    Com. Abertura (%)
                    {polAbertura && <span style={{ marginLeft: 4, color: '#364858' }}>política: {polAbertura.rate_min}%–{polAbertura.rate_max}%</span>}
                    {!aperturaOk && <span style={{ marginLeft: 5, color: '#E09020', display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={10} /> fora do intervalo</span>}
                  </label>
                  <input type="number" step="0.1" value={comAbertura} onChange={e => setComAbertura(parseFloat(e.target.value) || 0)}
                    style={{ ...inputStyle, borderColor: aperturaOk ? 'rgba(201,168,76,.15)' : 'rgba(224,144,32,.5)' }} />
                </div>
                {/* Comissão de Gestão */}
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: gestaoOk ? '#7888A0' : '#E09020', marginBottom: 3 }}>
                    Com. Gestão Anual (%)
                    {polGestao && <span style={{ marginLeft: 4, color: '#364858' }}>política: {polGestao.rate_min}%–{polGestao.rate_max}%</span>}
                    {!gestaoOk && <span style={{ marginLeft: 5, color: '#E09020', display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={10} /> fora do intervalo</span>}
                  </label>
                  <input type="number" step="0.05" value={comGestao} onChange={e => setComGestao(parseFloat(e.target.value) || 0)}
                    style={{ ...inputStyle, borderColor: gestaoOk ? 'rgba(201,168,76,.15)' : 'rgba(224,144,32,.5)' }} />
                </div>
                {/* Capital não desembolsado */}
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 3 }}>
                    Capital Não Desembolsado (M Kz)
                    {polImob && <span style={{ marginLeft: 4, color: '#364858' }}>{polImob.rate_min}%/mês → imobilização</span>}
                  </label>
                  <input type="number" step="50" value={capitalNaoDesembolsado} onChange={e => setCapitalNaoDesembolsado(parseFloat(e.target.value) || 0)} style={inputStyle} />
                </div>
                {/* Dias em atraso */}
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 3 }}>
                    Dias em Atraso
                    {polMora && <span style={{ marginLeft: 4, color: '#364858' }}>{polMora.rate_min}%/dia → juros de mora</span>}
                  </label>
                  <input type="number" step="1" value={diasAtraso} onChange={e => setDiasAtraso(parseFloat(e.target.value) || 0)} style={inputStyle} />
                </div>
                {/* Custo passivo */}
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 3 }}>
                    Custo do Passivo (%){custoPassivoApi != null ? ' ← API' : ''}
                  </label>
                  <input type="number" step="0.1" value={custoPassivo} onChange={e => setCustoPassivo(parseFloat(e.target.value) || 0)} style={inputStyle} />
                </div>
                {/* Custos operacionais mensais */}
                <div>
                  <label style={{ display: 'block', fontSize: 8, color: '#E09020', marginBottom: 3 }}>
                    Custos Operacionais Mensais (M Kz){marginCustos.length > 0 ? ' ← API' : ''}
                  </label>
                  <input type="number" step="0.01" value={custosOpMensaisM} onChange={e => setCustosOpMensaisM(parseFloat(e.target.value) || 0)} style={{ ...inputStyle, borderColor: 'rgba(224,144,32,.3)' }} />
                </div>
              </div>

              {/* Breakdown de resultados */}
              <div style={{ borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(38,184,112,.15)' }}>
                {/* Linha de receitas */}
                {[
                  { label: 'Juros de Capital', sub: `${capital}M × ${taxa}% × ${(prazo/12).toFixed(1)}a`, val: juros, color: '#E5EBF2', sign: '+' },
                  { label: 'Comissão de Abertura', sub: `${capital}M × ${comAbertura}% — única`, val: commAberturaVal, color: aperturaOk ? '#C9A84C' : '#E09020', sign: '+' },
                  { label: 'Comissão de Gestão Anual', sub: `${capital}M × ${comGestao}% × ${(prazo/12).toFixed(1)}a`, val: commGestaoVal, color: aperturaOk ? '#C9A84C' : '#E09020', sign: '+' },
                  ...(commImobVal > 0 ? [{ label: 'Comissão de Imobilização', sub: `${capitalNaoDesembolsado}M × ${imobRate}%/mês × ${prazo}m`, val: commImobVal, color: '#7888A0', sign: '+' }] : []),
                  ...(jurosMoraVal > 0 ? [{ label: 'Juros de Mora', sub: `${capital}M × ${moraRate}%/dia × ${diasAtraso}dias`, val: jurosMoraVal, color: '#D43352', sign: '+' }] : []),
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: i % 2 === 0 ? 'rgba(7,9,12,.4)' : 'rgba(7,9,12,.2)', borderBottom: '1px solid rgba(38,184,112,.07)' }}>
                    <div>
                      <div style={{ fontSize: 9.5, color: row.color, fontWeight: 600 }}>{row.label}</div>
                      <div style={{ fontSize: 8, color: '#364858', marginTop: 1 }}>{row.sub}</div>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: row.color, fontWeight: 700 }}>
                      {row.sign} {row.val.toFixed(1)}M Kz
                    </div>
                  </div>
                ))}

                {/* Total Receitas */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(201,168,76,.08)', borderBottom: '1px solid rgba(201,168,76,.2)', borderTop: '1px solid rgba(201,168,76,.2)' }}>
                  <div style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700 }}>TOTAL RECEITAS</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#C9A84C', fontWeight: 800 }}>= {totalReceitas.toFixed(1)}M Kz</div>
                </div>

                {/* Custo passivo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(212,51,82,.05)', borderBottom: '1px solid rgba(38,184,112,.07)' }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: '#D43352', fontWeight: 600 }}>(-) Custo do Passivo</div>
                    <div style={{ fontSize: 8, color: '#364858' }}>{capital}M × {custoPassivo}% × {(prazo/12).toFixed(1)}a</div>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#D43352', fontWeight: 700 }}>− {custo.toFixed(1)}M Kz</div>
                </div>

                {/* Margem bruta (após custo passivo, antes de custos op) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(201,168,76,.08)', borderBottom: '1px solid rgba(201,168,76,.2)', borderTop: '1px solid rgba(201,168,76,.2)' }}>
                  <div style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700 }}>= MARGEM BRUTA</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#C9A84C', fontWeight: 800 }}>{margemLiquida >= 0 ? '+' : ''}{margemLiquida.toFixed(1)}M Kz</div>
                </div>

                {/* Custos operacionais */}
                {custosOpMensaisM > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(224,144,32,.05)', borderBottom: '1px solid rgba(38,184,112,.07)' }}>
                    <div>
                      <div style={{ fontSize: 9.5, color: '#E09020', fontWeight: 600 }}>(-) Custos Operacionais</div>
                      <div style={{ fontSize: 8, color: '#364858' }}>{custosOpMensaisM}M Kz/mês × {prazo} meses</div>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#E09020', fontWeight: 700 }}>− {custosOpPeriodo.toFixed(1)}M Kz</div>
                  </div>
                )}

                {/* Resultado líquido final */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: resultadoFinal >= 0 ? 'rgba(38,184,112,.1)' : 'rgba(212,51,82,.1)' }}>
                  <div>
                    <div style={{ fontSize: 11, color: resultadoFinal >= 0 ? '#26B870' : '#D43352', fontWeight: 800 }}>RESULTADO LÍQUIDO</div>
                    {custosOpMensaisM === 0 && <div style={{ fontSize: 8, color: '#364858', marginTop: 1 }}>Adicione custos operacionais para ver o resultado real</div>}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 14, color: resultadoFinal >= 0 ? '#26B870' : '#D43352', fontWeight: 900 }}>
                    {resultadoFinal >= 0 ? '+' : ''}{resultadoFinal.toFixed(1)}M Kz
                  </div>
                </div>
              </div>

              {/* Indicadores finais */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 7, marginTop: 8 }}>
                {[
                  { l: 'TIR Efectiva', v: `${tir.toFixed(1)}%`, c: '#E5EBF2' },
                  { l: 'Spread (Activo − Passivo)', v: `${spread >= 0 ? '+' : ''}${spread.toFixed(1)} pp`, c: spread >= 0 ? '#26B870' : '#D43352' },
                  { l: 'Resultado / Capital', v: `${capital > 0 ? ((resultadoFinal / capital) * 100).toFixed(1) : '—'}%`, c: resultadoFinal >= 0 ? '#C9A84C' : '#D43352' },
                  { l: 'Capital Recapitalizado (6m)', v: `${(capital * Math.pow(1 + taxa / 200, prazo / 6)).toFixed(1)}M Kz`, c: '#C9A84C' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '7px 10px', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(38,184,112,.1)', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: '#7888A0', marginBottom: 2 }}>{s.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: s.c, fontFamily: 'monospace' }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {(!aperturaOk || !gestaoOk) && (
                <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(224,144,32,.08)', border: '1px solid rgba(224,144,32,.25)', borderRadius: 6, fontSize: 9, color: '#E09020' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><AlertTriangle size={11} /> Uma ou mais comissões estão fora do intervalo definido na Política Interna. Verifique antes de submeter o contrato.</span>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* ── ANÁLISE DE INTERMEDIAÇÃO FINANCEIRA ────────────────────── */}
        <div style={{ marginTop: 12 }}>
          <Panel
            title="Análise de Intermediação Financeira"
            tag="Real · Fontes de Financiamento vs Contratos Activos vs Custos Operacionais"
          >
            {marginLoading ? <LoadingSpinner /> : (
              <div style={{ padding: 0 }}>

                {/* KPI summary strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0, borderBottom: '1px solid rgba(38,184,112,.12)' }}>
                  {[
                    { icon: TrendingUp,   label: 'Receita Activa (anual)', value: formatKz(marginTotais?.receitaActiva ?? 0), color: '#26B870', sub: `Taxa média: ${marginTotais?.taxaActivaMedia ?? 0}%` },
                    { icon: TrendingDown, label: 'Custo Passivo (anual)',  value: formatKz(marginTotais?.custoPassivo ?? 0),   color: '#D43352', sub: `Taxa passiva: ${marginTotais?.taxaPassivaMedia ?? 0}%` },
                    { icon: Activity,     label: 'Margem Bruta',           value: formatKz(marginTotais?.margemBruta ?? 0),    color: (marginTotais?.margemBruta ?? 0) >= 0 ? '#C9A84C' : '#D43352', sub: `Spread: ${marginTotais?.spread ?? 0} pp` },
                    { icon: DollarSign,   label: 'Custos Operacionais',    value: formatKz(marginTotais?.custosOperacionais ?? 0), color: '#E09020', sub: `${marginCustos.filter(c => c.is_active).length} centros activos` },
                    { icon: DollarSign,   label: 'Resultado Líquido',      value: formatKz(marginTotais?.resultadoLiquido ?? 0),   color: (marginTotais?.resultadoLiquido ?? 0) >= 0 ? '#26B870' : '#D43352', sub: 'Após todos os custos' },
                  ].map((k, i) => {
                    const Icon = k.icon;
                    return (
                      <div key={i} style={{
                        padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 10,
                        borderRight: i < 4 ? '1px solid rgba(38,184,112,.08)' : undefined,
                        background: i === 4 ? (marginTotais?.resultadoLiquido ?? 0) >= 0 ? 'rgba(38,184,112,.04)' : 'rgba(212,51,82,.04)' : undefined,
                      }}>
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={14} color={k.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 8, color: '#7888A0', marginBottom: 2 }}>{k.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: k.color, fontFamily: 'monospace' }}>{k.value}</div>
                          <div style={{ fontSize: 8, color: '#364858', marginTop: 1 }}>{k.sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Main grid: waterfall + tables */}
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 1fr', gap: 0 }}>

                  {/* ── WATERFALL ──────────────────────────────────────── */}
                  <div style={{ borderRight: '1px solid rgba(38,184,112,.1)', padding: '14px 16px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                      Cascata de Resultados
                    </div>

                    {(() => {
                      const ra = marginTotais?.receitaActiva ?? 0;
                      const cp = marginTotais?.custoPassivo ?? 0;
                      const mb = marginTotais?.margemBruta ?? 0;
                      const co = marginTotais?.custosOperacionais ?? 0;
                      const rl = marginTotais?.resultadoLiquido ?? 0;
                      const max = Math.max(ra, cp + co, 1);

                      const rows = [
                        { label: 'Receita Activa', val: ra,  sign: '+', color: '#26B870',  isTotal: false },
                        { label: 'Custo do Passivo', val: cp, sign: '−', color: '#D43352', isTotal: false },
                        { label: 'Margem Bruta', val: mb, sign: '=', color: '#C9A84C', isTotal: true },
                        { label: 'Custos Operacionais', val: co, sign: '−', color: '#E09020', isTotal: false },
                        { label: 'Resultado Líquido', val: rl, sign: '=', color: rl >= 0 ? '#26B870' : '#D43352', isTotal: true },
                      ];

                      return rows.map((r, i) => (
                        <div key={i} style={{
                          marginBottom: 6,
                          padding: r.isTotal ? '8px 10px' : '6px 10px',
                          background: r.isTotal ? `${r.color}12` : 'rgba(7,9,12,.4)',
                          border: `1px solid ${r.color}${r.isTotal ? '30' : '18'}`,
                          borderRadius: 6,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: r.isTotal ? 9 : 8.5, fontWeight: r.isTotal ? 700 : 500, color: r.color }}>
                              {r.sign} {r.label}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: r.isTotal ? 11 : 10, fontWeight: r.isTotal ? 800 : 600, color: r.color }}>
                              {formatKz(Math.abs(r.val))}
                            </span>
                          </div>
                          {!r.isTotal && (
                            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(Math.abs(r.val) / max * 100, 100)}%`, background: r.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                            </div>
                          )}
                        </div>
                      ));
                    })()}

                    {/* Spread badge */}
                    <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(201,168,76,.07)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 8, color: '#7888A0', marginBottom: 3 }}>Spread de Intermediação</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: (marginTotais?.spread ?? 0) > 0 ? '#C9A84C' : '#D43352' }}>
                        {(marginTotais?.spread ?? 0) > 0 ? '+' : ''}{marginTotais?.spread ?? 0} pp
                      </div>
                      <div style={{ fontSize: 8, color: '#364858', marginTop: 2 }}>
                        Taxa Activa {marginTotais?.taxaActivaMedia ?? 0}% − Passiva {marginTotais?.taxaPassivaMedia ?? 0}%
                      </div>
                    </div>
                  </div>

                  {/* ── FONTES vs CONTRATOS ─────────────────────────────── */}
                  <div style={{ borderRight: '1px solid rgba(38,184,112,.1)' }}>
                    {/* Fontes */}
                    <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid rgba(38,184,112,.07)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#D43352', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                        Fontes de Financiamento ({marginFontes.length})
                      </div>
                      {marginFontes.length === 0 && (
                        <div style={{ fontSize: 9.5, color: '#364858', padding: '8px 0' }}>Nenhuma fonte activa registada</div>
                      )}
                      {marginFontes.map(f => (
                        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 9.5, fontWeight: 600, color: '#E5EBF2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {f.institution || f.name}
                            </div>
                            <div style={{ fontSize: 8, color: '#7888A0' }}>
                              {formatKz(f.total_amount)} · <span style={{ color: '#D43352' }}>{formatPercent(f.interest_rate)} a.a.</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#D43352', fontWeight: 700 }}>− {formatKz(f.custo_anual)}</div>
                            <div style={{ fontSize: 8, color: '#364858' }}>{f.pct_do_total}% das fontes</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Contratos */}
                    <div style={{ padding: '10px 16px 8px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#26B870', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                        Contratos Activos ({marginContratos.length})
                      </div>
                      {marginContratos.length === 0 && (
                        <div style={{ fontSize: 9.5, color: '#364858', padding: '8px 0' }}>Nenhum contrato em vigor</div>
                      )}
                      {marginContratos.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 9.5, fontWeight: 600, color: '#E5EBF2' }}>{c.reference}</div>
                            <div style={{ fontSize: 8, color: '#7888A0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.client_name} · {formatKz(c.amount)} · <span style={{ color: '#26B870' }}>{formatPercent(c.interest_rate)} a.a.</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#26B870', fontWeight: 700 }}>+ {formatKz(c.receita_anual)}</div>
                            <div style={{ fontSize: 8, color: '#364858' }}>{c.pct_do_total}% da carteira</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── CUSTOS OPERACIONAIS ─────────────────────────────── */}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#E09020', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Custos Operacionais
                      </div>
                      <button
                        onClick={() => { setShowCostForm(v => !v); setCostErr(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: showCostForm ? 'rgba(224,144,32,.18)' : 'rgba(224,144,32,.08)', border: '1px solid rgba(224,144,32,.25)', borderRadius: 5, cursor: 'pointer', color: '#E09020', padding: '3px 10px', fontSize: 8.5, fontWeight: 700 }}
                      >
                        {showCostForm ? <X size={10} /> : <Plus size={10} />}
                        {showCostForm ? 'Cancelar' : 'Adicionar'}
                      </button>
                    </div>

                    {showCostForm && (
                      <div style={{ padding: '10px 12px', background: 'rgba(224,144,32,.05)', border: '1px solid rgba(224,144,32,.18)', borderRadius: 6, marginBottom: 10 }}>
                        {costErr && <div style={{ fontSize: 9, color: '#D43352', marginBottom: 6 }}>{costErr}</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 2 }}>Designação *</label>
                            <input value={costForm.name} onChange={e => setCostForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Salários" style={{ width: '100%', ...inpStyle }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 2 }}>Categoria *</label>
                            <select value={costForm.category} onChange={e => setCostForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', ...inpStyle }}>
                              {Object.entries(COST_CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 2 }}>Valor Mensal (Kz)</label>
                            <input type="number" value={costForm.amount_monthly} onChange={e => setCostForm(p => ({ ...p, amount_monthly: e.target.value }))} placeholder="0" style={{ width: '100%', ...inpStyle }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 2 }}>Notas</label>
                            <input value={costForm.notes} onChange={e => setCostForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opcional" style={{ width: '100%', ...inpStyle }} />
                          </div>
                        </div>
                        <button
                          onClick={() => createCost.mutate(costForm)}
                          disabled={createCost.isPending || !costForm.name}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(224,144,32,.15)', border: '1px solid rgba(224,144,32,.3)', borderRadius: 5, cursor: 'pointer', color: '#E09020', padding: '5px 12px', fontSize: 9, fontWeight: 700 }}
                        >
                          {createCost.isPending ? <Loader2 size={10} className="spin" /> : <Save size={10} />} Guardar
                        </button>
                      </div>
                    )}

                    {/* Cost list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {marginCustos.length === 0 && !showCostForm && (
                        <div style={{ fontSize: 9.5, color: '#364858', padding: '8px 0' }}>
                          Nenhum custo operacional registado.<br />
                          <span style={{ color: '#7888A0' }}>Adicione salários, custos de sistema, etc.</span>
                        </div>
                      )}
                      {marginCustos.map(c => {
                        const isEdit = editingCostId === c.id;
                        const cat = COST_CATS[c.category] || { label: c.category, color: '#7888A0' };
                        return (
                          <div key={c.id} style={{
                            padding: '7px 10px',
                            background: c.is_active ? 'rgba(7,9,12,.5)' : 'rgba(7,9,12,.2)',
                            border: `1px solid ${c.is_active ? 'rgba(224,144,32,.15)' : 'rgba(120,136,160,.1)'}`,
                            borderRadius: 5,
                            opacity: c.is_active ? 1 : 0.6,
                          }}>
                            {isEdit ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 6 }}>
                                <input value={editCostForm.name} onChange={e => setEditCostForm(p => ({ ...p, name: e.target.value }))} style={{ ...inpStyle, gridColumn: '1/-1' }} />
                                <select value={editCostForm.category} onChange={e => setEditCostForm(p => ({ ...p, category: e.target.value }))} style={inpStyle}>
                                  {Object.entries(COST_CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                                <input type="number" value={editCostForm.amount_monthly} onChange={e => setEditCostForm(p => ({ ...p, amount_monthly: +e.target.value }))} style={inpStyle} />
                                <div style={{ display: 'flex', gap: 4, gridColumn: '1/-1' }}>
                                  <button onClick={() => updateCost.mutate({ id: c.id, ...editCostForm })} disabled={updateCost.isPending}
                                    style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.25)', borderRadius: 4, cursor: 'pointer', color: '#26B870', padding: '3px 8px', fontSize: 8.5, fontWeight: 700 }}>
                                    {updateCost.isPending ? <Loader2 size={9} className="spin" /> : <Save size={9} />} Salvar
                                  </button>
                                  <button onClick={() => setEditingCostId(null)} style={{ background: 'none', border: '1px solid rgba(120,136,160,.15)', borderRadius: 4, cursor: 'pointer', color: '#7888A0', padding: '3px 6px', fontSize: 8.5 }}><X size={9} /></button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                                    <span style={{ fontSize: 9.5, fontWeight: 600, color: c.is_active ? '#E5EBF2' : '#7888A0' }}>{c.name}</span>
                                    <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 7.5, fontWeight: 600, background: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}30` }}>{cat.label}</span>
                                  </div>
                                  <div style={{ fontSize: 8, color: '#364858' }}>
                                    {formatKz(c.amount_monthly)}/mês · {formatKz(c.amount_monthly * 12)}/ano
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 3 }}>
                                  <button onClick={() => { setEditingCostId(c.id); setEditCostForm({ name: c.name, category: c.category, amount_monthly: c.amount_monthly, notes: c.notes || '' }); }}
                                    style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 4, cursor: 'pointer', color: '#C9A84C', padding: '3px 6px', fontSize: 8.5 }}><Edit2 size={9} /></button>
                                  <button onClick={() => { if (window.confirm(`Eliminar "${c.name}"?`)) deleteCost.mutate(c.id); }}
                                    style={{ background: 'rgba(212,51,82,.07)', border: '1px solid rgba(212,51,82,.15)', borderRadius: 4, cursor: 'pointer', color: '#D43352', padding: '3px 6px', fontSize: 8.5 }}><Trash2 size={9} /></button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Subtotal operacional */}
                    {marginCustos.length > 0 && (
                      <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(224,144,32,.07)', border: '1px solid rgba(224,144,32,.2)', borderRadius: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#E09020' }}>Total Anual Operacional</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: '#E09020' }}>
                            − {formatKz(marginTotais?.custosOperacionais ?? 0)}
                          </span>
                        </div>
                        <div style={{ fontSize: 8, color: '#364858', marginTop: 2 }}>
                          {formatKz((marginTotais?.custosOperacionais ?? 0) / 12)}/mês
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </Panel>
        </div>

      </div>
    </>
  );
}
