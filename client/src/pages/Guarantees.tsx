import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const GUARANTEE_TYPES = [
  'garantia_bancaria', 'cessao_receitas', 'hipoteca', 'penhor_equipamentos',
  'penhor_acoes', 'aval_fianca', 'seguro_credito',
  'consignacao_receitas_fiscais', 'consignacao_oge', 'outros',
];

const TYPE_COLORS: Record<string, string> = {
  garantia_bancaria:            'rgba(201,168,76,.85)',
  cessao_receitas:              'rgba(38,184,112,.8)',
  hipoteca:                     'rgba(91,156,246,.8)',
  penhor_equipamentos:          'rgba(224,144,32,.8)',
  penhor_acoes:                 'rgba(224,100,32,.8)',
  aval_fianca:                  'rgba(156,100,200,.8)',
  seguro_credito:               'rgba(38,184,112,.65)',
  consignacao_receitas_fiscais: 'rgba(70,130,180,.8)',
  consignacao_oge:              'rgba(70,110,160,.8)',
  outros:                       'rgba(70,85,100,.8)',
};

const EMPTY_FORM = {
  contract_id: '',
  guarantee_type: 'garantia_bancaria',
  guarantor: '',
  value: '',
  coverage_percentage: '',
  start_date: '',
  expiry_date: '',
  auto_renewal: false,
  renewal_alert_days: '30',
  notes: '',
};

export default function Guarantees() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['guarantees'],
    queryFn: () => api.get('/guarantees').then(r => r.data.data),
  });

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-select'],
    queryFn: () => api.get('/contracts', { params: { limit: 200 } }).then(r => r.data.data?.data || r.data.data || []),
    enabled: showForm,
  });
  const contracts = (contractsData || []) as Array<{ id: string; reference: string; client_name?: string }>;

  const guarantees = (data?.data || []) as Array<{
    id: string; guarantee_type: string; guarantor: string; contract_reference: string;
    client_name: string; value: number; coverage_percentage: number;
    start_date: string; expiry_date: string; status: string;
  }>;
  const kpis = data?.kpis;

  const createGuarantee = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/guarantees', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guarantees'] });
      setShowForm(false);
      setFormError('');
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => setFormError(e.response?.data?.message || 'Erro ao registar garantia'),
  });

  function upd<K extends keyof typeof EMPTY_FORM>(k: K, v: typeof EMPTY_FORM[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  function submitGuarantee(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contract_id || !form.guarantee_type || !form.guarantor || !form.value || !form.start_date || !form.expiry_date) {
      setFormError('Preencha: Contrato, Tipo, Garante/Bem, Valor, Data de Início e Validade.');
      return;
    }
    if (form.coverage_percentage && +form.coverage_percentage < 110) {
      setFormError('Atenção: A Maiombe exige cobertura mínima de 110%. O índice actual é ' + form.coverage_percentage + '%. Ajuste o valor ou confirme com a direcção.');
      return;
    }
    createGuarantee.mutate({
      contract_id: form.contract_id,
      guarantee_type: form.guarantee_type,
      guarantor: form.guarantor,
      value: +form.value,
      coverage_percentage: form.coverage_percentage ? +form.coverage_percentage : null,
      start_date: form.start_date,
      expiry_date: form.expiry_date,
      auto_renewal: form.auto_renewal,
      renewal_alert_days: form.renewal_alert_days ? +form.renewal_alert_days : 30,
      notes: form.notes || null,
    });
  }

  const byType = guarantees.reduce((acc, g) => {
    const k = g.guarantee_type || 'outro';
    if (!acc[k]) acc[k] = { count: 0, total: 0 };
    acc[k].count++;
    acc[k].total += g.value || 0;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const typeEntries = Object.entries(byType).sort((a, b) => b[1].total - a[1].total);
  const grandTotal = typeEntries.reduce((s, [, v]) => s + v.total, 0);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.15)',
    borderRadius: 6, padding: '6px 10px', color: '#E5EBF2', fontSize: 11, boxSizing: 'border-box',
  };

  async function handleExport() {
    const byType2: Record<string, { count: number; total: number }> = {};
    guarantees.forEach(g => {
      const k = g.guarantee_type || 'outro';
      if (!byType2[k]) byType2[k] = { count: 0, total: 0 };
      byType2[k].count++; byType2[k].total += g.value || 0;
    });
    const coberturaMed = guarantees.length ? Math.round(guarantees.reduce((a, g) => a + (g.coverage_percentage || 0), 0) / guarantees.length) : 0;
    await downloadExcel('MAIOMBE_Garantias_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Garantias', guarantees.length],
          ['Valor Total das Garantias (Kz)', grandTotal],
          ['Cobertura Media (%)', coberturaMed],
          ['A Renovar nos Proximos 30 dias', kpis?.aRenovar ?? 0],
          ['Garantias Executadas', kpis?.executadas ?? guarantees.filter(g => g.status === 'em_execucao').length],
          ['Indice Minimo Exigido (%)', 110],
        ],
      },
      {
        title: 'GARANTIAS POR TIPO DE INSTRUMENTO',
        headers: ['tipo', 'quantidade', 'valor_total_kz', 'percentagem'],
        rows: Object.entries(byType2).sort((a, b) => b[1].total - a[1].total).map(([t, v]) => [
          t.replace(/_/g, ' '), v.count, v.total,
          grandTotal > 0 ? (v.total / grandTotal * 100).toFixed(1) + '%' : '0%',
        ]),
      },
      {
        title: 'INDICADORES DE COBERTURA POR TIPO',
        headers: ['tipo', 'instrumentos', 'valor_kz', 'percentagem_carteira'],
        rows: typeEntries.map(([t, v]) => [t.replace(/_/g, ' '), v.count, v.total, grandTotal > 0 ? (v.total / grandTotal * 100).toFixed(1) + '%' : '0%']),
      },
      {
        title: 'LISTAGEM COMPLETA DE GARANTIAS',
        headers: ['Contrato', 'Tipo', 'Garante', 'Valor (Kz)', 'Data Inicio', 'Validade', 'Cobertura (%)', 'Estado'],
        rows: guarantees.map((r: any) => [r.contract_reference, r.guarantee_type?.replace(/_/g, ' '), r.guarantor, r.value, r.start_date, r.expiry_date, r.coverage_percentage, r.status]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Garantias" onExport={handleExport} breadcrumb="MAIOMBE / Garantias"
        showNewButton newLabel="+ Registar Garantia" onNew={() => setShowForm(p => !p)} />
      <div className="ct">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Garantias Activas" value={kpis?.garantiasAtivas ?? guarantees.filter(g => g.status === 'activa').length} delta="Instrumentos registados" deltaType="up" variant="gold" />
          <KpiCard label="A Renovar (30 dias)" value={kpis?.aRenovar ?? 0} delta="Alertas emitidos" deltaType="nt" variant="am" />
          <KpiCard label="Valor Total Garantias" value={grandTotal > 0 ? formatKz(grandTotal / 1e9, false) : '—'} unit="Mil M Kz" delta={`${guarantees.length} instrumentos`} deltaType="up" variant="em" />
          <KpiCard label="Garantias Executadas" value={kpis?.executadas ?? guarantees.filter(g => g.status === 'em_execucao').length} delta="Processos em curso" deltaType="dn" variant="cr" />
        </div>

        {showForm && (
          <Panel title="Registar Nova Garantia" style={{ marginBottom: 14 }}>
            <form onSubmit={submitGuarantee} style={{ padding: 16 }}>
              {formError && (
                <div style={{ color: '#D43352', fontSize: 10, marginBottom: 10, padding: '6px 10px', background: 'rgba(212,51,82,.08)', borderRadius: 4, border: '1px solid rgba(212,51,82,.2)' }}>
                  {formError}
                </div>
              )}

              {/* Row 1 — Contrato + Tipo + Garante */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Contrato Associado *</label>
                  <select value={form.contract_id} onChange={e => upd('contract_id', e.target.value)} required style={inputStyle}>
                    <option value="">Seleccionar contrato...</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.reference}{c.client_name ? ` — ${c.client_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Tipo de Garantia *</label>
                  <select value={form.guarantee_type} onChange={e => upd('guarantee_type', e.target.value)} style={inputStyle}>
                    {GUARANTEE_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Garante / Bem *</label>
                  <input
                    value={form.guarantor}
                    onChange={e => upd('guarantor', e.target.value)}
                    placeholder="Nome do banco garante, imóvel, bem penhorado..."
                    required style={inputStyle}
                  />
                </div>
              </div>

              {/* Row 2 — Valor + Cobertura + Datas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 150px 150px', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Valor da Garantia (Kz) *</label>
                  <input
                    type="number" min="0" value={form.value}
                    onChange={e => upd('value', e.target.value)}
                    placeholder="0" required style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Cobertura (%)</label>
                  <input
                    type="number" min="0" max="999" step="0.1" value={form.coverage_percentage}
                    onChange={e => upd('coverage_percentage', e.target.value)}
                    placeholder="Ex: 120" style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Data de Início *</label>
                  <input
                    type="date" value={form.start_date}
                    onChange={e => upd('start_date', e.target.value)}
                    required style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Data de Validade *</label>
                  <input
                    type="date" value={form.expiry_date}
                    onChange={e => upd('expiry_date', e.target.value)}
                    required style={inputStyle}
                  />
                </div>
              </div>

              {/* Row 3 — Notas + Renovação + Alerta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 130px', gap: 10, marginBottom: 10 }}>
                <input
                  value={form.notes}
                  onChange={e => upd('notes', e.target.value)}
                  placeholder="Observações (opcional)"
                  style={inputStyle}
                />
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Alerta Antecipado (dias)</label>
                  <input
                    type="number" min="0" value={form.renewal_alert_days}
                    onChange={e => upd('renewal_alert_days', e.target.value)}
                    placeholder="30" style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16 }}>
                  <input
                    type="checkbox" id="auto_renewal" checked={form.auto_renewal}
                    onChange={e => upd('auto_renewal', e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: '#C9A84C' }}
                  />
                  <label htmlFor="auto_renewal" style={{ fontSize: 9.5, color: '#E5EBF2', cursor: 'pointer' }}>
                    Renovação automática
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setFormError(''); setForm(EMPTY_FORM); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-gold" disabled={createGuarantee.isPending}>
                  {createGuarantee.isPending ? <><Loader2 size={11} className="spin" /> A salvar...</> : 'Registar Garantia'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12, marginBottom: 12 }}>
          <Panel title="Garantias por Tipo de Instrumento">
            {typeEntries.length > 0 ? (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {typeEntries.map(([type, info]) => {
                  const pct = grandTotal > 0 ? (info.total / grandTotal * 100).toFixed(1) : '0';
                  const color = TYPE_COLORS[type] || TYPE_COLORS.outro;
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: color }} />
                      <div style={{ flex: 1, fontSize: 9.5, color: '#E5EBF2', textTransform: 'capitalize' }}>
                        {type.replace(/_/g, ' ')} <span style={{ color: '#7888A0' }}>({info.count})</span>
                      </div>
                      <div style={{ fontSize: 9.5, color: '#C9A84C', fontFamily: 'monospace', fontWeight: 700 }}>
                        {formatKz(info.total, true)}
                      </div>
                      <div style={{ fontSize: 8.5, color: '#7888A0', width: 36, textAlign: 'right' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '40px 14px', textAlign: 'center', color: '#7888A0', fontSize: 10 }}>
                Nenhuma garantia registada.
              </div>
            )}
          </Panel>

          <Panel title="Indicadores de Cobertura">
            {typeEntries.length > 0 ? (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {typeEntries.slice(0, 4).map(([type, info]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: 'rgba(7,9,12,.5)', borderRadius: 6, border: '1px solid rgba(201,168,76,.08)' }}>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#E5EBF2', textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 8.5, color: '#7888A0' }}>{info.count} instrumento{info.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', fontFamily: 'monospace' }}>{formatKz(info.total)}</div>
                      <div style={{ fontSize: 8.5, color: '#26B870' }}>
                        {grandTotal > 0 ? `${(info.total / grandTotal * 100).toFixed(0)}% do total` : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 14px', textAlign: 'center', color: '#7888A0', fontSize: 10 }}>
                Registe garantias para ver os indicadores de cobertura.
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Registo de Garantias — Detalhe Completo" actions={
          <button
            onClick={() => setShowForm(p => !p)}
            style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '5px 9px', fontSize: 8.5 }}>
            + Registar Garantia
          </button>
        }>
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref.</th><th>Contrato Associado</th><th>Tipo de Garantia</th>
                    <th>Garante / Bem</th><th>Valor (Kz)</th><th>Data Início</th>
                    <th>Validade</th><th>Cobertura</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {guarantees.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: '#7888A0', padding: '24px 0' }}>
                        Nenhuma garantia registada. Clique em "+ Registar Garantia" para começar.
                      </td>
                    </tr>
                  ) : guarantees.map((g, idx) => {
                    const coveragePct = g.coverage_percentage;
                    const coverageColor = coveragePct >= 110 ? '#26B870' : coveragePct >= 90 ? '#E09020' : '#D43352';
                    return (
                      <tr key={g.id}>
                        <td className="td-mono td-bold" style={{ color: '#DEB96A' }}>GAR-{String(idx + 1).padStart(3, '0')}</td>
                        <td className="td-mono">{g.contract_reference}</td>
                        <td style={{ textTransform: 'capitalize' }}>{g.guarantee_type?.replace(/_/g, ' ')}</td>
                        <td style={{ fontSize: 9.5, color: '#7888A0', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.guarantor}</td>
                        <td className="td-mono">{formatKz(g.value)}</td>
                        <td>{formatDate(g.start_date)}</td>
                        <td>{formatDate(g.expiry_date)}</td>
                        <td style={{ color: coverageColor, fontWeight: 700, fontFamily: 'monospace' }}>
                          {coveragePct != null ? `${coveragePct.toFixed(0)}%` : '—'}
                        </td>
                        <td><Badge value={g.status} /></td>
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





