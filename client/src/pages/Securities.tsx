import { useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate, formatPercent } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

function SecChart({ data }: { data: Array<{ series: string; face_value: number; discount_accepted: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ctx = el.getContext('2d'); if (!ctx) return;
    const w = el.width, h = el.height;
    const pad = { t: 24, r: 20, b: 36, l: 16 };
    const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
    const n = data.length || 4;
    const faceValues = data.map(d => d.face_value / 1e6);
    const creditValues = data.map(d => d.face_value * (1 + (d.discount_accepted || 0) / 100) / 1e6);
    const labels = data.map(d => d.series);
    const maxV = Math.max(...faceValues, 1) * 1.2;
    const bw = (gw / n) * 0.35;
    const gap = gw / n;

    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (gh / 4) * i;
      ctx.strokeStyle = 'rgba(201,168,76,.05)';
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gw, y); ctx.stroke();
    }

    data.forEach((d, i) => {
      const x = pad.l + (i + 0.5) * gap;
      const fh = (faceValues[i] / maxV) * gh;
      const ch = (creditValues[i] / maxV) * gh;
      ctx.fillStyle = 'rgba(201,168,76,.6)';
      ctx.fillRect(x - bw - 1, pad.t + gh - fh, bw, fh);
      ctx.fillStyle = 'rgba(38,184,112,.5)';
      ctx.fillRect(x + 1, pad.t + gh - ch, bw, ch);
      ctx.fillStyle = '#7888A0'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(labels[i] || `S${i + 1}`, x, h - 8);
    });

    ctx.font = '8.5px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(201,168,76,.6)'; ctx.fillRect(pad.l, pad.t - 16, 8, 8);
    ctx.fillStyle = '#7888A0'; ctx.fillText('Valor Facial', pad.l + 12, pad.t - 9);
    ctx.fillStyle = 'rgba(38,184,112,.5)'; ctx.fillRect(pad.l + 90, pad.t - 16, 8, 8);
    ctx.fillStyle = '#7888A0'; ctx.fillText('Crédito Abatido', pad.l + 102, pad.t - 9);
  }, [data]);

  return <canvas ref={ref} width={380} height={200} style={{ width: '100%', height: 200 }} />;
}

const EMPTY_FORM = {
  series: '',
  security_type: 'OT',
  client_id: '',
  contract_id: '',
  face_value: '',
  yield_rate: '',
  maturity_date: '',
  discount_accepted: '',
  received_at: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function Securities() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [policyValues, setPolicyValues] = useState<Record<string, string | boolean>>({});
  const [policyEntities, setPolicyEntities] = useState<Record<string, boolean>>({
    governo_central: true, ministerio: true, governo_provincial: true, empresa_publica: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['securities'],
    queryFn: () => api.get('/securities').then(r => r.data.data),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: () => api.get('/clients', { params: { limit: 100 } }).then(r => r.data.data?.data || []),
  });
  const { data: contractsData } = useQuery({
    queryKey: ['contracts-select'],
    queryFn: () => api.get('/contracts', { params: { limit: 200 } }).then(r => r.data.data || []),
  });

  const createSecurity = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/securities', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['securities'] });
      setShowForm(false);
      setFormError('');
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => setFormError(e.response?.data?.message || 'Erro ao registar entrega'),
  });

  const savePolicy = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.put('/securities/policy', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['securities'] }),
  });

  function upd(k: keyof typeof EMPTY_FORM, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function submitSecurity(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.contract_id || !form.face_value) {
      setFormError('Preencha mutuário, contrato e valor facial.');
      return;
    }
    createSecurity.mutate({
      ...form,
      face_value: +form.face_value,
      yield_rate: form.yield_rate ? +form.yield_rate : null,
      discount_accepted: form.discount_accepted ? +form.discount_accepted : 0,
    });
  }

  function handleSavePolicy() {
    const policy = data?.policy || {};
    savePolicy.mutate({
      ...policy,
      ...policyValues,
      authorizedEntities: Object.entries(policyEntities).filter(([, v]) => v).map(([k]) => k),
    });
  }

  const filteredContracts = form.client_id
    ? (contractsData || []).filter((c: { client_id: string }) => c.client_id === form.client_id)
    : contractsData || [];

  const securities = (data?.data || []) as Array<{
    id: string; series: string; security_type: string; face_value: number;
    yield_rate: number; received_at: string; maturity_date: string;
    client_name: string; client_id: string; contract_id: string;
    contract_reference?: string; discount_accepted: number; credit_deducted: number; status: string;
  }>;
  const kpis = data?.kpis;
  const policy = data?.policy;

  const otList = securities.filter(s => s.security_type?.toUpperCase() === 'OT');
  const btList = securities.filter(s => s.security_type?.toUpperCase() === 'BT');
  const avgDiscount = kpis?.descontoMedio ?? (securities.length ? securities.reduce((a, s) => a + Math.abs(s.discount_accepted || 0), 0) / securities.length : 0);
  const chartData = securities.map(s => ({ series: s.series, face_value: s.face_value, discount_accepted: s.discount_accepted || 0 }));

  const inputStyle = { width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 6, padding: '6px 10px', color: '#E5EBF2', fontSize: 11, boxSizing: 'border-box' as const };

  async function handleExport() {
    const totalFace = securities.reduce((a, s) => a + (s.face_value || 0), 0);
    const totalCredit = securities.reduce((a, s) => a + (s.credit_deducted || 0), 0);
    await downloadExcel('MAIOMBE_Titulos_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Titulos Aceites', securities.length],
          ['Valor Facial Total (Kz)', totalFace],
          ['Credito Total Abatido (Kz)', totalCredit],
          ['OT — Obrigacoes do Tesouro', otList.length],
          ['BT — Bilhetes do Tesouro', btList.length],
          ['Desconto Medio Aceite (%)', avgDiscount.toFixed(2)],
        ],
      },
      {
        title: 'OT — OBRIGACOES DO TESOURO',
        headers: ['Serie', 'Mutuario', 'Contrato', 'Valor Facial (Kz)', 'Yield (%)', 'Desconto (%)', 'Credito Abatido (Kz)', 'Vencimento', 'Estado'],
        rows: otList.map(r => [r.series, r.client_name, r.contract_reference, r.face_value, r.yield_rate, r.discount_accepted, r.credit_deducted, r.maturity_date, r.status]),
      },
      {
        title: 'BT — BILHETES DO TESOURO',
        headers: ['Serie', 'Mutuario', 'Contrato', 'Valor Facial (Kz)', 'Yield (%)', 'Desconto (%)', 'Credito Abatido (Kz)', 'Vencimento', 'Estado'],
        rows: btList.map(r => [r.series, r.client_name, r.contract_reference, r.face_value, r.yield_rate, r.discount_accepted, r.credit_deducted, r.maturity_date, r.status]),
      },
      {
        title: 'LISTAGEM COMPLETA DE TITULOS',
        headers: ['Serie', 'Tipo', 'Mutuario', 'Contrato', 'Valor Facial (Kz)', 'Vencimento', 'Yield (%)', 'Desconto (%)', 'Credito Abatido (Kz)', 'Estado'],
        rows: securities.map(r => [r.series, r.security_type, r.client_name, r.contract_reference, r.face_value, r.maturity_date, r.yield_rate, r.discount_accepted, r.credit_deducted, r.status]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Títulos da Dívida Pública — OT & BT" onExport={handleExport} breadcrumb="MAIOMBE / OT & BT"
        showNewButton newLabel="+ Registar Entrega" onNew={() => setShowForm(p => !p)} />
      <div className="ct">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="OT em Carteira (facial)" value={kpis?.otCarteira != null ? formatKz(kpis.otCarteira / 1e9, false) : '—'} unit="Mil M Kz" delta={`${otList.length} séries`} deltaType="nt" variant="gold" />
          <KpiCard label="BT em Carteira (mercado)" value={kpis?.btCarteira != null ? formatKz(kpis.btCarteira / 1e6, false) : '—'} unit="M Kz" delta={`${btList.length} emissões`} deltaType="nt" variant="em" />
          <KpiCard label="Desconto Médio Aceite" value={avgDiscount !== 0 ? `-${Math.abs(avgDiscount).toFixed(1)}` : '0'} unit="%" delta="impacto margem" deltaType="dn" variant="cr" />
          <KpiCard label="Crédito Abatido Total" value={securities.length ? formatKz(securities.reduce((a, s) => a + (s.credit_deducted || 0), 0), true) : '—'} delta="mercado secundário" deltaType="up" variant="em" />
        </div>

        {showForm && (
          <Panel title="Registar Entrega de OT / BT" style={{ marginBottom: 12 }}>
            <form onSubmit={submitSecurity} style={{ padding: 14 }}>
              {formError && <div style={{ color: '#D43352', fontSize: 10, marginBottom: 10 }}>{formError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 140px 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Tipo</label>
                  <select value={form.security_type} onChange={e => upd('security_type', e.target.value)} style={inputStyle}>
                    <option value="OT">OT</option>
                    <option value="BT">BT</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Série *</label>
                  <input type="text" value={form.series} onChange={e => upd('series', e.target.value)} placeholder="Ex: OT-2024-A" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Mutuário</label>
                  <select value={form.client_id} onChange={e => { upd('client_id', e.target.value); upd('contract_id', ''); }} style={inputStyle} required>
                    <option value="">Seleccionar cliente...</option>
                    {(clientsData || []).map((c: { id: string; name: string }) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Contrato</label>
                  <select value={form.contract_id} onChange={e => upd('contract_id', e.target.value)} style={inputStyle} required>
                    <option value="">Seleccionar contrato...</option>
                    {filteredContracts.map((c: { id: string; reference: string }) => (
                      <option key={c.id} value={c.id}>{c.reference}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 160px', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Valor Facial (Kz)</label>
                  <input type="number" value={form.face_value} onChange={e => upd('face_value', e.target.value)} placeholder="0" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Yield (% a.a.)</label>
                  <input type="number" step="0.01" value={form.yield_rate} onChange={e => upd('yield_rate', e.target.value)} placeholder="12.5" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Desconto Aceite (%)</label>
                  <input type="number" step="0.1" value={form.discount_accepted} onChange={e => upd('discount_accepted', e.target.value)} placeholder="0 ou -8" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Vencimento</label>
                  <input type="date" value={form.maturity_date} onChange={e => upd('maturity_date', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 3 }}>Data Recepção</label>
                  <input type="date" value={form.received_at} onChange={e => upd('received_at', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Observações (opcional)" style={{ ...inputStyle, flex: 1 }} />
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-gold" disabled={createSecurity.isPending}>
                  {createSecurity.isPending ? <><Loader2 size={11} className="spin" /> A salvar...</> : 'Registar Entrega'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        <Panel title="Carteira de OT e BT Recebidos como Pagamento" actions={
          <button onClick={() => setShowForm(p => !p)} style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '5px 9px', fontSize: 8.5 }}>
            + Registar Entrega
          </button>
        } style={{ marginBottom: 12 }}>
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Série</th><th>Tipo</th><th>Mutuário</th><th>Contrato</th>
                    <th>Valor Facial</th><th>Vencimento</th><th>Yield</th>
                    <th>Desconto</th><th>Crédito Abatido</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {securities.map(s => {
                    const discount = Math.abs(s.discount_accepted || 0);
                    const creditAbated = s.credit_deducted || s.face_value * (1 + (s.discount_accepted || 0) / 100);
                    const isOT = s.security_type?.toUpperCase() === 'OT';
                    return (
                      <tr key={s.id}>
                        <td className="td-mono td-bold">{s.series}</td>
                        <td>
                          <span className={isOT ? 'tag-ot' : 'tag-bt'}>
                            {s.security_type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: 9.5, color: '#7888A0' }}>{s.client_name}</td>
                        <td className="td-mono">{s.contract_reference || '—'}</td>
                        <td className="td-mono">{formatKz(s.face_value)}</td>
                        <td>{formatDate(s.maturity_date)}</td>
                        <td className="td-mono">{formatPercent(s.yield_rate)}</td>
                        <td className="td-mono" style={{ color: discount > 0 ? '#E09020' : '#26B870' }}>
                          {discount > 0 ? `-${discount}%` : '0%'}
                        </td>
                        <td className="td-mono">{formatKz(creditAbated)}</td>
                        <td><Badge value={s.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 12 }}>
          <Panel title="Política de Aceitação — Configurável pela Maiombe" actions={
            <button onClick={handleSavePolicy} disabled={savePolicy.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: savePolicy.isSuccess ? 'rgba(38,184,112,.15)' : 'rgba(201,168,76,.15)', border: `1px solid ${savePolicy.isSuccess ? 'rgba(38,184,112,.3)' : 'rgba(201,168,76,.25)'}`, borderRadius: 6, cursor: 'pointer', color: savePolicy.isSuccess ? '#26B870' : '#DEB96A', padding: '4px 9px', fontSize: 8.5 }}>
              {savePolicy.isPending ? <Loader2 size={10} className="spin" /> : <Save size={10} />}
              {savePolicy.isSuccess ? 'Salvo' : 'Salvar Política'}
            </button>
          }>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 12 }}>
                {[
                  { key: 'maxDiscount', label: 'Desconto Máximo OT (%)', type: 'number', val: policy?.maxDiscount ?? 15 },
                  { key: 'minYield',    label: 'Yield Mínima Exigida (%)', type: 'number', val: policy?.minYield ?? 11 },
                  { key: 'minCashPercentage', label: '% Mínima Cash por Prestação', type: 'number', val: policy?.minCashPercentage ?? 30 },
                  { key: 'acceptBT',   label: 'Aceitação de BT', type: 'select', val: policy?.acceptBT ? 'Sim' : 'Não' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 8.5, color: '#7888A0', marginBottom: 4 }}>{f.label}</label>
                    {f.type === 'number' ? (
                      <input type="number" defaultValue={f.val as number}
                        onChange={e => setPolicyValues(p => ({ ...p, [f.key]: e.target.value }))}
                        style={inputStyle} />
                    ) : (
                      <select defaultValue={f.val as string}
                        onChange={e => setPolicyValues(p => ({ ...p, acceptBT: e.target.value !== 'Não' }))}
                        style={inputStyle}>
                        <option>Sim — valor de mercado BNA</option>
                        <option>Sim — valor facial</option>
                        <option>Não</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 8.5, color: '#7888A0', marginBottom: 6 }}>Entidades Autorizadas a pagar com OT</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { key: 'governo_central', label: 'Estado Central' },
                  { key: 'ministerio', label: 'Ministérios' },
                  { key: 'governo_provincial', label: 'Gov. Provinciais' },
                  { key: 'empresa_publica', label: 'Emp. Públicas' },
                ].map(ent => (
                  <label key={ent.key} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 8.5, color: '#E5EBF2' }}>
                    <input type="checkbox"
                      checked={policyEntities[ent.key] ?? (policy?.authorizedEntities?.includes(ent.key) ?? false)}
                      onChange={e => setPolicyEntities(p => ({ ...p, [ent.key]: e.target.checked }))}
                      style={{ accentColor: '#C9A84C' }} />
                    {ent.label}
                  </label>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Rentabilidade dos Títulos em Carteira">
            <div style={{ padding: '14px 14px 10px' }}>
              <SecChart data={chartData} />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}






