import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, Users, FileText, DollarSign } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  aporte_socios:         Users,
  subsidio_operacional:  Landmark,
  capital_proprio:       DollarSign,
  outros:                FileText,
};

const CATEGORY_LABELS: Record<string, string> = {
  aporte_socios: 'Aporte de Sócios',
  subsidio_operacional: 'Subsídio Operacional',
  capital_proprio: 'Capital Próprio',
  outros: 'Outros Recursos',
};

export default function ManagementCapital() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      navigate('/capital-gestao', { replace: true });
    }
  }, [searchParams, navigate]);
  const [providerName, setProviderName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('aporte_socios');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['management-capital'],
    queryFn: () => api.get('/management-capital').then(r => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (newContribution: { provider_name: string; amount: number; category: string; received_at: string; notes?: string }) => {
      return api.post('/management-capital', newContribution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-capital'] });
      setShowForm(false);
      setProviderName('');
      setAmount('');
      setCategory('aporte_socios');
      setReceivedAt(new Date().toISOString().split('T')[0]);
      setNotes('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Erro ao registrar capital de gestão');
    }
  });

  const listData = data?.data || [];
  const kpis = data?.kpis;

  const totalCapital = kpis?.totalCapital || 0;
  const sociasAmt = kpis?.byCategory?.find((c: any) => c.category === 'aporte_socios')?.amount || 0;
  const subsidiosAmt = kpis?.byCategory?.find((c: any) => c.category === 'subsidio_operacional')?.amount || 0;
  const outrosAmt = kpis?.byCategory?.find((c: any) => c.category === 'outros')?.amount || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName || !amount || !receivedAt) {
      setErrorMsg('Por favor preencha todos os campos obrigatórios.');
      return;
    }
    mutation.mutate({
      provider_name: providerName,
      amount: parseFloat(amount),
      category,
      received_at: receivedAt,
      notes,
    });
  };

  async function handleExport() {
    const byCategory: Record<string, { count: number; total: number }> = {};
    listData.forEach((r: any) => {
      const k = r.category || 'outro';
      if (!byCategory[k]) byCategory[k] = { count: 0, total: 0 };
      byCategory[k].count++; byCategory[k].total += r.amount || 0;
    });
    const byMonth: Record<string, number> = {};
    listData.forEach((r: any) => {
      const m = r.received_at ? r.received_at.substring(0, 7) : 'N/A';
      byMonth[m] = (byMonth[m] || 0) + (r.amount || 0);
    });
    await downloadExcel('MAIOMBE_Capital_Gestao_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Entradas de Capital', listData.length],
          ['Capital Total Captado (Kz)', totalCapital],
          ['Aportes de Socios (Kz)', sociasAmt],
          ['Subsidios Operacionais (Kz)', subsidiosAmt],
          ['Outros Aportes (Kz)', outrosAmt],
        ],
      },
      {
        title: 'APORTES POR CATEGORIA',
        headers: ['categoria', 'entradas', 'valor_total_kz'],
        rows: Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total).map(([c, v]) => [c.replace(/_/g, ' '), v.count, v.total]),
      },
      {
        title: 'HISTORICO DE APORTES POR MES',
        headers: ['mes', 'valor_kz'],
        rows: Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([m, v]) => [m, v]),
      },
      {
        title: 'LISTAGEM COMPLETA',
        headers: ['Referencia', 'Origem', 'Categoria', 'Valor (Kz)', 'Data Recebimento'],
        rows: listData.map((r: any) => [r.reference, r.provider_name, r.category?.replace(/_/g, ' '), r.amount, r.received_at]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Capital de Gestão Interna" onExport={handleExport} 
        breadcrumb="MAIOMBE / Capital de Gestão" 
        showNewButton={true}
        newLabel="+ Registar Entrada"
        onNew={() => setShowForm(!showForm)}
      />
      <div className="ct">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Total de Fundos Recebidos" value={formatKz(totalCapital, true)} unit="Kz" delta={`${listData.length} aportes`} deltaType="up" variant="gold" />
          <KpiCard label="Aporte de Sócios" value={formatKz(sociasAmt, true)} unit="Kz" delta="Interno" deltaType="nt" variant="em" />
          <KpiCard label="Subsídios Operacionais" value={formatKz(subsidiosAmt, true)} unit="Kz" delta="Gestão" deltaType="up" variant="am" />
          <KpiCard label="Outros Recursos" value={formatKz(outrosAmt, true)} unit="Kz" delta="Geral" deltaType="nt" variant="gold" />
        </div>

        {showForm && (
          <Panel title="Registar Entrada de Capital para Gestão" style={{ marginBottom: 18 }}>
            <form onSubmit={handleSubmit} style={{ padding: 16 }}>
              {errorMsg && <div style={{ color: '#D43352', fontSize: 11, marginBottom: 12 }}>{errorMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Fornecedor do Capital *</label>
                  <input 
                    type="text" 
                    value={providerName} 
                    onChange={e => setProviderName(e.target.value)} 
                    placeholder="Ex: Alpinea Investimentos / Sócio Carlos" 
                    style={{ width: '100%', padding: '7px 10px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Valor do Capital (Kz) *</label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="Ex: 50000000" 
                    style={{ width: '100%', padding: '7px 10px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4 }}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Categoria *</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    style={{ width: '100%', padding: '7px 10px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4 }}
                  >
                    <option value="aporte_socios">Aporte de Sócios</option>
                    <option value="subsidio_operacional">Subsídio Operacional</option>
                    <option value="capital_proprio">Capital Próprio</option>
                    <option value="outros">Outros Recursos</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Data de Recebimento *</label>
                  <input 
                    type="date" 
                    value={receivedAt} 
                    onChange={e => setReceivedAt(e.target.value)} 
                    style={{ width: '100%', padding: '7px 10px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4 }}
                    required
                  />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 9, color: '#7888A0', marginBottom: 4, textTransform: 'uppercase' }}>Notas / Observações</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Detalhes adicionais..." 
                  style={{ width: '100%', padding: '7px 10px', fontSize: 11, background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', color: '#fff', borderRadius: 4, minHeight: 60 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">Cancelar</button>
                <button type="submit" disabled={mutation.isPending} className="btn btn-gold">
                  {mutation.isPending ? 'A registar...' : 'Salvar Entrada'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
          <Panel title="Histórico de Aportes Recebidos" tag={`${listData.length} Lançamentos`}>
            {isLoading ? <LoadingSpinner /> : (
              <div style={{ overflow: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Referência</th><th>Origem / Fornecedor</th><th>Categoria</th><th>Valor Recebido</th><th>Data Recebido</th><th>Registador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listData.map((item: any) => {
                      return (
                        <tr key={item.id}>
                          <td className="td-mono td-bold">{item.reference}</td>
                          <td style={{ fontWeight: 600, color: '#fff' }}>{item.provider_name}</td>
                          <td style={{ fontSize: 9.5, color: '#7888A0' }}>{CATEGORY_LABELS[item.category] || item.category}</td>
                          <td className="td-mono" style={{ color: '#DEB96A', fontWeight: 'bold' }}>{formatKz(item.amount)}</td>
                          <td>{formatDate(item.received_at)}</td>
                          <td style={{ fontSize: 9, color: '#7888A0' }}>{item.created_by_name || '—'}</td>
                        </tr>
                      );
                    })}
                    {listData.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#7888A0', padding: 20 }}>Nenhum aporte operacionale registrado até ao momento.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Distribuição por Categoria">
            {isLoading ? <LoadingSpinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '10px 0' }}>
                {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
                  const dataCat = kpis?.byCategory?.find((c: any) => c.category === catKey);
                  const amountCat = dataCat?.amount || 0;
                  const countCat = dataCat?.count || 0;
                  const pct = totalCapital ? ((amountCat / totalCapital) * 100).toFixed(1) : '0';
                  const Icon = CATEGORY_ICONS[catKey] || FileText;
                  return (
                    <div key={catKey} style={{
                      display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px',
                      borderBottom: '1px solid rgba(201,168,76,.06)',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: 'rgba(201,168,76,.1)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon size={16} color="#C9A84C" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: '#E5EBF2', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 8.5, color: '#7888A0' }}>
                          {countCat} lançamento(s) operacional(ais)
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', fontFamily: 'monospace' }}>
                          {formatKz(amountCat, true)}
                        </div>
                        <div style={{ fontSize: 8.5, color: '#7888A0' }}>{pct}% do capital</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}





