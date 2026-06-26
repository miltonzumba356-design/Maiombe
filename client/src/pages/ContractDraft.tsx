import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, Building2, Wrench, Banknote, ScrollText, FileText,
  Globe, BarChart2, RefreshCw, Home, TrendingUp, FileSignature,
  Save, Calculator, Loader2, X,
} from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import Panel from '@/components/ui/Panel';
import { formatKz } from '@/lib/utils';

interface Phase { num: number; pct: number; date: string; condition: string; }
interface SimResult {
  schedule: Array<{ installment: number; amortization: number; interest: number; total: number; residual: number }>;
  summary: { totalAmount: number; totalInterest: number; totalPayable: number; numInstallments: number };
}

type IconComp = React.ElementType;

// Meios de reembolso principais
const MEIOS_REEMBOLSO: Array<{ key: string; label: string; Icon: IconComp }> = [
  { key: 'numerario',        label: 'Numerário (Kz)',               Icon: Banknote      },
  { key: 'ot',               label: 'OT — Obrigações do Tesouro',   Icon: ScrollText    },
  { key: 'bt',               label: 'BT — Bilhetes do Tesouro',     Icon: FileText      },
  { key: 'dacao_activos',    label: 'Dação em Activos / Obras',     Icon: Wrench        },
  { key: 'dacao_imoveis',    label: 'Dação em Imóveis',             Icon: Home          },
  { key: 'cessao_creditos',  label: 'Cessão de Créditos Fiscais',   Icon: BarChart2     },
  { key: 'compensacao',      label: 'Compensação de Dívidas',       Icon: RefreshCw     },
  { key: 'receitas_futuras', label: 'Receitas Futuras / Royalties', Icon: TrendingUp    },
  { key: 'letra_cambio',     label: 'Letra de Câmbio Aceite',       Icon: FileSignature },
];

// Sub-modalidades do Numerário
const MODALIDADES_NUMERARIO: Array<{ key: string; label: string; Icon: IconComp }> = [
  { key: 'transferencia_nacional', label: 'Transferência Bancária Nacional (TPA/IBAN)', Icon: Building2     },
  { key: 'transferencia_swift',    label: 'Transferência SWIFT Internacional',           Icon: Globe         },
  { key: 'deposito_bancario',      label: 'Depósito Bancário Directo',                   Icon: Banknote      },
  { key: 'cheque_visado',          label: 'Cheque Visado / Bancário',                    Icon: FileSignature },
  { key: 'moeda_estrangeira',      label: 'Moeda Estrangeira (USD/EUR)',                 Icon: Globe         },
];

// Maturidades BT
const BT_MATURIDADES = ['91 dias', '182 dias', '364 dias'];

const PRAZO_OPTIONS = ['6 meses','12 meses','18 meses','24 meses','36 meses','48 meses','60 meses','72 meses','84 meses','120 meses'];
const prazoMonths = (s: string) => parseInt(s) || 24;
const frequencyValue = (value: string) => {
  const labels: Record<string, string> = {
    Mensal: 'mensal',
    Bimestral: 'bimestral',
    Trimestral: 'trimestral',
    Semestral: 'semestral',
    Anual: 'anual',
    'Única no Vencimento': 'unica_vencimento',
  };
  return labels[value] || 'semestral';
};

const MODEL_INFO: Record<string, { Icon: IconComp; name: string; desc: string }> = {
  modelo_a: { Icon: Landmark,  name: 'Modelo A — Financiamento Público',    desc: 'Estado, Ministérios, Gov. Provinciais, Adm. Municipais, E.P. e domínio público. Prevê reembolso em OT, BT, cash ou misto. Cláusula de imunidade soberana. Referência ao PAE 2025 (Dec. Pres. 54/25) e Dec. Exec. 385/25.' },
  modelo_b: { Icon: Building2, name: 'Modelo B — Empréstimo a Privado',     desc: 'Empresas privadas (LDA, SA, Unipessoal) e particulares (pessoas singulares). Reembolso em numerário. Garantias reais e pessoais. Condições de taxa e prazo totalmente livres — no pleno exercício da autonomia privada.' },
  modelo_c: { Icon: Wrench,    name: 'Modelo C — Financiamento de Projecto', desc: 'Desembolsos faseados condicionados à execução de cada fase. Adequado a obras, infraestrutura, concessões e PPP. Pagamento ligado a vistorias técnicas e relatórios de progresso aprovados.' },
};

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.15)',
  borderRadius: 6, padding: '6px 9px', color: '#E5EBF2', fontSize: 10.5, boxSizing: 'border-box', outline: 'none',
};
const lbl: React.CSSProperties = { display: 'block', fontSize: 8, color: '#7888A0', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.9 };
const sec: React.CSSProperties = { background: 'rgba(7,9,12,.3)', border: '1px solid rgba(201,168,76,.08)', borderRadius: 10, padding: 13, marginBottom: 10 };
const stl: React.CSSProperties = { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1.4, color: '#C9A84C', fontWeight: 700, marginBottom: 9 };
const fill: React.CSSProperties = { color: '#C9A84C', fontWeight: 600 };
const h4s: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, color: '#E5EBF2', margin: '10px 0 4px' };

export default function ContractDraft() {
  const navigate = useNavigate();
  const [model, setModel] = useState<'modelo_a'|'modelo_b'|'modelo_c'>('modelo_a');

  const [clientId, setClientId] = useState('');
  const [mutuario,   setMutuario]   = useState('');
  const [nif,        setNif]        = useState('');
  const [entityType, setEntityType] = useState('Governo Provincial');
  const [repLegal,   setRepLegal]   = useState('');
  const [morada,     setMorada]     = useState('');
  const [foro,       setForo]       = useState('Tribunal Provincial de Luanda');

  const [valor,       setValor]       = useState('');
  const [valorExt,    setValorExt]    = useState('');
  const [taxa,        setTaxa]        = useState('15.5');
  const [base,        setBase]        = useState('Mês de 30 dias');
  const [prazo,       setPrazo]       = useState('24 meses');
  const [period,      setPeriod]      = useState('Semestral');
  const [dataCel,     setDataCel]     = useState('2026-06-16');
  const [dataDesemb,  setDataDesemb]  = useState('2026-07-01');
  const [carencia,    setCarencia]    = useState('0');
  const [juroMora,    setJuroMora]    = useState('0.05');
  const [comAbrt,     setComAbrt]     = useState('1.5');
  const [revisaoTaxa, setRevisaoTaxa] = useState('Taxa Fixa — sem revisão');

  const [methods, setMethods] = useState<Set<string>>(new Set(['numerario','ot','bt']));
  const [modalidadesNum, setModalidadesNum] = useState<Set<string>>(new Set(['transferencia_nacional']));
  const [btMat, setBtMat] = useState<Set<string>>(new Set(['bt_182']));
  const [otCond,  setOtCond]  = useState('OT aceites c/ desconto máx. 15% sobre facial');
  const [otMat,   setOtMat]   = useState('5 anos');

  const [garPrinc, setGarPrinc] = useState('Cessão de Receitas / Créditos Futuros');
  const [valGar,   setValGar]   = useState('');
  const [garSec,   setGarSec]   = useState('Nenhuma');
  const [renov,    setRenov]    = useState('Sim — Alerta 30 dias antes');

  const [fases, setFases] = useState<Phase[]>([
    { num: 1, pct: 30, date: '2026-07-01', condition: 'Garantia registada + aprovação técnica' },
    { num: 2, pct: 40, date: '2026-10-01', condition: '50% de execução vistorada e aprovada' },
    { num: 3, pct: 30, date: '2027-02-01', condition: 'Vistoria final aprovada + relatório conclusão' },
  ]);

  const [sim,     setSim]     = useState<SimResult | null>(null);
  const [showSim, setShowSim] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: () => api.get('/clients', { params: { limit: 100 } }).then(r => r.data.data?.data || []),
  });
  const clients = clientsData || [];

  const simulate = useMutation({
    mutationFn: () => api.get('/contracts/simulate', {
      params: { amount: parseFloat(valor)||1e9, rate: parseFloat(taxa)||15.5, termMonths: prazoMonths(prazo), frequency: frequencyValue(period), gracePeriodMonths: parseInt(carencia)||0 },
    }).then(r => r.data.data as SimResult),
    onSuccess: d => { setSim(d); setShowSim(true); },
  });

  const create = useMutation({
    mutationFn: () => api.post('/contracts', {
      client_id: clientId,
      contract_type: model, amount: parseFloat(valor)||0, interest_rate: parseFloat(taxa)||0,
      celebration_date: dataCel, term_months: prazoMonths(prazo),
      payment_frequency: frequencyValue(period), grace_period_months: parseInt(carencia)||0,
      amount_text: valorExt || undefined,
      late_interest_rate: parseFloat(juroMora) || 0.05,
      opening_commission: parseFloat(comAbrt) || 1.5,
      rate_revision: revisaoTaxa,
      court_venue: foro,
      repayment_methods: Array.from(methods),
      ot_conditions: otCond,
      ot_max_maturity: otMat,
      main_guarantee: garPrinc,
      guarantee_value: parseFloat(valGar) || undefined,
      secondary_guarantee: garSec,
      guarantee_auto_renewal: renov.startsWith('Sim'),
      object: `Contrato de mútuo civil para ${mutuario || 'cliente selecionado'}`,
      phases: model === 'modelo_c'
        ? fases.map(f => ({ phase_number: f.num, percentage: f.pct, planned_date: f.date, release_condition: f.condition }))
        : undefined,
    }),
    onSuccess: () => navigate('/contratos'),
  });

  const toggleMethod = useCallback((k: string) => {
    setMethods(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }, []);

  const addFase    = () => setFases(p => [...p, { num: p.length+1, pct: 0, date: '', condition: '' }]);
  const removeFase = (i: number) => setFases(p => p.filter((_,j) => j!==i));
  const updFase    = (i: number, k: keyof Phase, v: string|number) =>
    setFases(p => p.map((f,j) => j===i ? {...f,[k]:v} : f));

  const pMutuario = mutuario || '[Designação do Mutuário]';
  const pNif      = nif      || '[NIF]';
  const pRepL     = repLegal || '[Rep. Legal]';
  const pValor    = valor    ? `Kz ${Number(valor).toLocaleString('pt-PT')}` : 'Kz [Valor]';
  const pExt      = valorExt || '[por extenso]';
  const pGarVal   = valGar   ? `Kz ${Number(valGar).toLocaleString('pt-PT')}` : 'Kz [Garantia]';

  const btnSecStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)',
    borderRadius: 8, cursor: 'pointer', color: '#C9A84C', padding: '10px 14px', fontSize: 10,
  };

  return (
    <>
      <TopBar title="Elaboração de Contratos" breadcrumb="MAIOMBE / Elaboração" showNewButton={false} />
      <div style={{ padding: '22px 26px' }}>

        {/* Legal notice */}
        <div style={{ background:'rgba(201,168,76,.06)', border:'1px solid rgba(201,168,76,.18)', borderRadius:9, padding:'10px 14px', marginBottom:14 }}>
          <div style={{ fontSize:8.5, fontWeight:700, color:'#C9A84C', textTransform:'uppercase', letterSpacing:1.2, marginBottom:4 }}>Regime Jurídico Aplicável</div>
          <div style={{ fontSize:9.5, color:'#7888A0', lineHeight:1.65 }}>Os contratos são celebrados ao abrigo dos artigos 1142.º e seguintes do Código Civil Angolano. Para valores acima de UCF 3.000 em Kwanzas é obrigatória escritura pública (art.º 1143.º CC, Lei n.º 9/11 de 16 de Março).</div>
        </div>

        {/* Model selection */}
        <Panel title="Seleccionar Modelo de Contrato" tag="3 Minutas Standard · Condições Gerais Pré-Estabelecidas · Direito Civil Angolano" style={{ marginBottom:14 }}>
          <div style={{ padding:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:9 }}>
              {(Object.entries(MODEL_INFO) as [string, typeof MODEL_INFO[string]][]).map(([key, info]) => {
                const active = model === key;
                return (
                  <div key={key} onClick={() => setModel(key as 'modelo_a'|'modelo_b'|'modelo_c')} style={{
                    padding:14, borderRadius:9, cursor:'pointer', transition:'all .15s',
                    background: active ? 'rgba(201,168,76,.1)' : 'rgba(7,9,12,.5)',
                    border: active ? '1.5px solid rgba(201,168,76,.4)' : '1px solid rgba(201,168,76,.08)',
                  }}>
                    <info.Icon size={22} color={active?'#DEB96A':'#7888A0'} style={{ marginBottom:8 }} />
                    <div style={{ fontSize:10.5, fontWeight:700, color: active?'#DEB96A':'#7888A0', marginBottom:3 }}>{info.name}</div>
                    <div style={{ fontSize:8.5, color:'#7888A0', lineHeight:1.55 }}>{info.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:14 }}>
          {/* ───── LEFT: Form ───── */}
          <div>

            {/* I */}
            <div style={sec}>
              <div style={stl}>I — Identificação das Partes</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 10px' }}>
                <div><label style={lbl}>Mutuante</label><input style={{...inp,opacity:.65}} value="MAIOMBE — Capital & Credit, Lda." readOnly /></div>
                <div><label style={lbl}>NIF Mutuante</label><input style={{...inp,opacity:.65}} value="5000056146" readOnly /></div>
                <div>
                  <label style={lbl}>Designação Completa do Mutuário</label>
                  <select
                    style={inp}
                    value={clientId}
                    onChange={e => {
                      const selectedClient = clients.find((c: any) => c.id === e.target.value);
                      setClientId(e.target.value);
                      setMutuario(selectedClient?.name || '');
                      setNif(selectedClient?.nif || '');
                      setEntityType(selectedClient?.entity_type || entityType);
                      setRepLegal(selectedClient?.legal_representative || repLegal);
                      setMorada(selectedClient?.address || morada);
                    }}
                  >
                    <option value="">Selecione um cliente cadastrado</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name} - {c.nif}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>NIF do Mutuário</label><input style={inp} value={nif} onChange={e=>setNif(e.target.value)} placeholder="Ex: 5000012345" readOnly /></div>
                <div>
                  <label style={lbl}>Tipo de Entidade Mutuária</label>
                  <select style={inp} value={entityType} onChange={e=>setEntityType(e.target.value)}>
                    <option>Governo Central / Executivo</option><option>Ministério / Sec. de Estado</option>
                    <option>Governo Provincial</option><option>Administração Municipal</option>
                    <option>Empresa Pública (E.P.)</option><option>Empresa de Domínio Público</option>
                    <option>Empresa Privada (LDA / SA)</option><option>Particular / Pessoa Singular</option>
                    <option>Entidade Mista (público-privada)</option>
                  </select>
                </div>
                <div><label style={lbl}>Representante Legal / Mandatário</label><input style={inp} value={repLegal} onChange={e=>setRepLegal(e.target.value)} placeholder="Nome completo e cargo" /></div>
                <div style={{ gridColumn:'span 2' }}><label style={lbl}>Morada / Sede do Mutuário</label><input style={inp} value={morada} onChange={e=>setMorada(e.target.value)} placeholder="Rua, Bairro, Município, Província" /></div>
                <div style={{ gridColumn:'span 2' }}>
                  <label style={lbl}>Foro — Tribunal Competente</label>
                  <select style={inp} value={foro} onChange={e=>setForo(e.target.value)}>
                    <option>Tribunal Provincial de Luanda</option><option>Tribunal Provincial de Benguela</option>
                    <option>Tribunal Provincial do Huambo</option><option>Tribunal Provincial de Cabinda</option>
                    <option>Tribunal de 1.ª Inst. — Belas</option><option>Tribunal de 1.ª Inst. — Viana</option>
                    <option>Centro de Arbitragem de Angola (CAA)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* II */}
            <div style={sec}>
              <div style={stl}>II — Condições Financeiras Particulares</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 10px' }}>
                <div><label style={lbl}>Valor do Mútuo (Kz)</label><input style={inp} type="number" value={valor} onChange={e=>setValor(e.target.value)} placeholder="0" /></div>
                <div><label style={lbl}>Valor por Extenso</label><input style={inp} value={valorExt} onChange={e=>setValorExt(e.target.value)} placeholder="Ex: Hum Mil Milhões de Kwanzas" /></div>
                <div><label style={lbl}>Taxa de Juro Anual (%)</label><input style={inp} type="number" step="0.1" value={taxa} onChange={e=>setTaxa(e.target.value)} /></div>
                <div>
                  <label style={lbl}>Base de Cálculo dos Juros</label>
                  <select style={inp} value={base} onChange={e=>setBase(e.target.value)}>
                    <option>Mês de 30 dias</option><option>Ano Comercial 360 dias</option><option>Ano Civil 365 dias</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Prazo Total</label>
                  <select style={inp} value={prazo} onChange={e=>setPrazo(e.target.value)}>
                    {PRAZO_OPTIONS.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Periodicidade das Prestações</label>
                  <select style={inp} value={period} onChange={e=>setPeriod(e.target.value)}>
                    <option>Mensal</option><option>Bimestral</option><option>Trimestral</option>
                    <option>Semestral</option><option>Anual</option><option>Única no Vencimento</option>
                  </select>
                </div>
                <div><label style={lbl}>Data de Celebração</label><input style={inp} type="date" value={dataCel} onChange={e=>setDataCel(e.target.value)} /></div>
                <div><label style={lbl}>Data do 1.º Desembolso</label><input style={inp} type="date" value={dataDesemb} onChange={e=>setDataDesemb(e.target.value)} /></div>
                <div><label style={lbl}>Período de Carência (meses)</label><input style={inp} type="number" value={carencia} min="0" onChange={e=>setCarencia(e.target.value)} /></div>
                <div><label style={lbl}>Juro de Mora (%/dia)</label><input style={inp} type="number" step="0.01" value={juroMora} onChange={e=>setJuroMora(e.target.value)} /></div>
                <div><label style={lbl}>Comissão de Abertura (%)</label><input style={inp} type="number" step="0.1" value={comAbrt} onChange={e=>setComAbrt(e.target.value)} /></div>
                <div>
                  <label style={lbl}>Revisão de Taxa</label>
                  <select style={inp} value={revisaoTaxa} onChange={e=>setRevisaoTaxa(e.target.value)}>
                    <option>Taxa Fixa — sem revisão</option><option>Revisão anual por acordo</option>
                    <option>Indexada à TBC + Spread</option><option>Indexada à Luibor + Spread</option>
                  </select>
                </div>
              </div>
            </div>

            {/* III */}
            <div style={sec}>
              <div style={stl}>III — Meios de Reembolso & Modalidades de Pagamento</div>

              {/* 3A — Meios de Reembolso */}
              <div style={{ fontSize: 8, color: '#C9A84C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 6 }}>
                A) Meios de Reembolso Aceites <span style={{ color:'#E09020', fontWeight:400 }}>(selecção múltipla)</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
                {MEIOS_REEMBOLSO.map(({ key, label, Icon }) => {
                  const active = methods.has(key);
                  return (
                    <label key={key} onClick={()=>toggleMethod(key)} style={{
                      display:'flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:5, cursor:'pointer', fontSize:9,
                      background: active ? 'rgba(201,168,76,.12)' : 'rgba(7,9,12,.4)',
                      border: `1px solid ${active ? 'rgba(201,168,76,.3)' : 'rgba(201,168,76,.07)'}`,
                      color: active ? '#DEB96A' : '#7888A0', transition:'all .12s',
                    }}>
                      <input type="checkbox" checked={active} onChange={()=>{}} style={{ accentColor:'#C9A84C', cursor:'pointer' }} />
                      <Icon size={10} />
                      {label}
                    </label>
                  );
                })}
              </div>

              {/* 3B — Modalidades de Numerário (condicional) */}
              {methods.has('numerario') && (
                <div style={{ background:'rgba(201,168,76,.04)', border:'1px solid rgba(201,168,76,.12)', borderRadius:7, padding:'10px 12px', marginBottom:10 }}>
                  <div style={{ fontSize: 8, color: '#C9A84C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 7 }}>
                    B) Modalidades de Pagamento em Numerário <span style={{ color:'#E09020', fontWeight:400 }}>(selecção múltipla)</span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {MODALIDADES_NUMERARIO.map(({ key, label, Icon }) => {
                      const active = modalidadesNum.has(key);
                      return (
                        <label key={key} onClick={() => setModalidadesNum(prev => {
                          const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
                        })} style={{
                          display:'flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:5, cursor:'pointer', fontSize:9,
                          background: active ? 'rgba(38,184,112,.1)' : 'rgba(7,9,12,.4)',
                          border: `1px solid ${active ? 'rgba(38,184,112,.3)' : 'rgba(38,184,112,.08)'}`,
                          color: active ? '#26B870' : '#7888A0', transition:'all .12s',
                        }}>
                          <input type="checkbox" checked={active} onChange={()=>{}} style={{ accentColor:'#26B870', cursor:'pointer' }} />
                          <Icon size={10} />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3C — Condições OT (condicional) */}
              {methods.has('ot') && (
                <div style={{ background:'rgba(91,156,246,.04)', border:'1px solid rgba(91,156,246,.12)', borderRadius:7, padding:'10px 12px', marginBottom:10 }}>
                  <div style={{ fontSize: 8, color: '#5B9CF6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 7 }}>
                    C) Condições de Aceitação de OT
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 10px' }}>
                    <div>
                      <label style={lbl}>Política de Desconto</label>
                      <select style={inp} value={otCond} onChange={e=>setOtCond(e.target.value)}>
                        <option>OT aceites c/ desconto máx. 15% sobre facial</option>
                        <option>OT ao valor facial (sem desconto)</option>
                        <option>OT+Cash: mín. 30% numerário</option>
                        <option>OT+Cash: mín. 50% numerário</option>
                        <option>Condições a negociar caso a caso</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Maturidade Máxima OT Aceite</label>
                      <select style={inp} value={otMat} onChange={e=>setOtMat(e.target.value)}>
                        <option>2 anos</option><option>3 anos</option><option>5 anos</option>
                        <option>7 anos</option><option>10 anos</option><option>Sem limite</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3D — Maturidades BT (condicional) */}
              {methods.has('bt') && (
                <div style={{ background:'rgba(38,184,112,.04)', border:'1px solid rgba(38,184,112,.12)', borderRadius:7, padding:'10px 12px' }}>
                  <div style={{ fontSize: 8, color: '#26B870', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 7 }}>
                    D) Maturidades de BT Aceites <span style={{ color:'#7888A0', fontWeight:400 }}>(selecção múltipla)</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {BT_MATURIDADES.map(m => {
                      const key = `bt_${m.split(' ')[0]}`;
                      const active = btMat.has(key);
                      return (
                        <label key={key} onClick={() => setBtMat(prev => {
                          const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
                        })} style={{
                          display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:5, cursor:'pointer', fontSize:9,
                          background: active ? 'rgba(38,184,112,.1)' : 'rgba(7,9,12,.4)',
                          border: `1px solid ${active ? 'rgba(38,184,112,.3)' : 'rgba(38,184,112,.08)'}`,
                          color: active ? '#26B870' : '#7888A0',
                        }}>
                          <input type="checkbox" checked={active} onChange={()=>{}} style={{ accentColor:'#26B870' }} />
                          BT {m}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* IV */}
            <div style={sec}>
              <div style={stl}>IV — Garantias Constituídas</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 10px' }}>
                <div>
                  <label style={lbl}>Garantia Principal</label>
                  <select style={inp} value={garPrinc} onChange={e=>setGarPrinc(e.target.value)}>
                    <option>Garantia Bancária Autónoma à 1.ª Solicitação</option>
                    <option>Cessão de Receitas / Créditos Futuros</option>
                    <option>Hipoteca — Bem Imóvel (art.º 686.º CC)</option>
                    <option>Penhor de Equipamentos (art.º 667.º CC)</option>
                    <option>Penhor de Acções / Participações</option>
                    <option>Aval / Fiança Pessoal (art.º 627.º CC)</option>
                    <option>Seguro de Crédito</option>
                    <option>Consignação de Receitas Fiscais</option>
                  </select>
                </div>
                <div><label style={lbl}>Valor da Garantia (Kz)</label><input style={inp} type="number" value={valGar} onChange={e=>setValGar(e.target.value)} placeholder="Mín. 110% do mútuo" /></div>
                <div>
                  <label style={lbl}>Garantia Secundária</label>
                  <select style={inp} value={garSec} onChange={e=>setGarSec(e.target.value)}>
                    <option>Nenhuma</option><option>Fiança Solidária de Sócios</option>
                    <option>Penhor de Veículos</option><option>Penhora de Contas Bancárias</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Renovação Automática</label>
                  <select style={inp} value={renov} onChange={e=>setRenov(e.target.value)}>
                    <option>Sim — Alerta 30 dias antes</option>
                    <option>Sim — Alerta 60 dias antes</option>
                    <option>Não</option>
                  </select>
                </div>
              </div>
            </div>

            {/* V — only modelo_c */}
            {model === 'modelo_c' && (
              <div style={sec}>
                <div style={stl}>V — Fases de Desembolso (Modelo C)</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {fases.map((f,i) => (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'38px 1fr 1fr 2fr 30px', gap:7, alignItems:'end' }}>
                      <div><label style={lbl}>Fase</label><input style={{...inp,textAlign:'center'}} value={f.num} onChange={e=>updFase(i,'num',parseInt(e.target.value)||1)} /></div>
                      <div><label style={lbl}>% do Total</label><input style={inp} type="number" value={f.pct} onChange={e=>updFase(i,'pct',parseInt(e.target.value)||0)} /></div>
                      <div><label style={lbl}>Data Prevista</label><input style={inp} type="date" value={f.date} onChange={e=>updFase(i,'date',e.target.value)} /></div>
                      <div><label style={lbl}>Condição de Libertação</label><input style={inp} value={f.condition} onChange={e=>updFase(i,'condition',e.target.value)} placeholder="Ex: Garantia registada + aprovação técnica" /></div>
                      <button type="button" onClick={()=>removeFase(i)}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(212,51,82,.1)', border:'1px solid rgba(212,51,82,.25)', borderRadius:6, cursor:'pointer', color:'#D43352', padding:'6px', marginBottom:1 }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addFase}
                  style={{ marginTop:8, background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.18)', borderRadius:6, cursor:'pointer', color:'#C9A84C', padding:'5px 12px', fontSize:9 }}>
                  + Adicionar Fase
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display:'flex', gap:9, marginBottom:18 }}>
              <button type="button" disabled={create.isPending} onClick={()=>create.mutate()}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'linear-gradient(135deg,#C9A84C,#A07830)', border:'none', borderRadius:8, cursor:'pointer', color:'#07090C', padding:'10px', fontSize:10.5, fontWeight:700 }}>
                {create.isPending ? <><Loader2 size={13} className="spin" /> A criar...</> : <><FileText size={13} /> Gerar Minuta Completa</>}
              </button>
              <button type="button" style={btnSecStyle}>
                <Save size={12} /> Rascunho
              </button>
              <button type="button" disabled={simulate.isPending} onClick={()=>simulate.mutate()} style={btnSecStyle}>
                {simulate.isPending ? <><Loader2 size={12} className="spin" /> A calcular...</> : <><Calculator size={12} /> Simular Amortização</>}
              </button>
            </div>

            {/* Simulation result */}
            {showSim && sim && (
              <div style={{ background:'rgba(7,9,12,.4)', border:'1px solid rgba(201,168,76,.14)', borderRadius:10, padding:13, marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#C9A84C', textTransform:'uppercase', letterSpacing:1 }}>Plano de Amortização Simulado</div>
                  <button onClick={()=>setShowSim(false)} style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', color:'#7888A0' }}><X size={14} /></button>
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  {[
                    {l:'Nº Prestações', v:sim.summary.numInstallments},
                    {l:'Total Juros',   v:formatKz(sim.summary.totalInterest,true)},
                    {l:'Custo Total',   v:formatKz(sim.summary.totalPayable,true)},
                  ].map((s,i) => (
                    <div key={i} style={{ padding:'7px 12px', background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.14)', borderRadius:7 }}>
                      <div style={{ fontSize:7.5, color:'#7888A0', textTransform:'uppercase', letterSpacing:1 }}>{s.l}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#DEB96A', fontFamily:'monospace' }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ maxHeight:280, overflow:'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Capital (Kz)</th><th>Juros (Kz)</th><th>Total (Kz)</th><th>Saldo (Kz)</th></tr></thead>
                    <tbody>
                      {sim.schedule.map(row => (
                        <tr key={row.installment}>
                          <td className="td-mono">{row.installment}</td>
                          <td className="td-mono">{formatKz(row.amortization)}</td>
                          <td className="td-mono">{formatKz(row.interest)}</td>
                          <td className="td-mono td-bold">{formatKz(row.total)}</td>
                          <td className="td-mono">{formatKz(row.residual)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ───── RIGHT: Live preview ───── */}
          <div>
            <div style={{ position:'sticky', top:76 }}>
              <Panel title="Pré-Visualização da Minuta" tag="Auto-actualização" tagVariant="em">
                <div style={{ maxHeight:'calc(100vh - 190px)', overflowY:'auto', margin:14, fontSize:9.5, color:'#7888A0', lineHeight:1.75 }}>
                  <h4 style={{ ...h4s, textAlign:'center', margin:'0 0 8px' }}>CONTRATO DE MÚTUO CIVIL N.º MAI-2026-_____</h4>
                  <p>Feito em Luanda, aos <span style={fill}>{dataCel||'___'}</span>.</p>
                  <p>
                    <strong style={{ color:'#E5EBF2' }}>ENTRE:</strong><br />
                    <span style={fill}>MAIOMBE — Capital &amp; Credit, Lda.</span>, NIF <span style={fill}>5000056146</span>, representada pelo seu Director Geral, adiante <strong>"MUTUANTE"</strong>;<br />
                    <strong style={{ color:'#E5EBF2' }}>E:</strong><br />
                    <span style={fill}>{pMutuario}</span>, NIF <span style={fill}>{pNif}</span>, representado por <span style={fill}>{pRepL}</span>, adiante <strong>"MUTUÁRIO"</strong>.
                  </p>
                  <h4 style={h4s}>CL.ª 1.ª — OBJECTO E REGIME JURÍDICO</h4>
                  <p>1.1. O presente instrumento é um <strong>contrato de mútuo civil</strong>, celebrado ao abrigo dos Art.ºs 1142.º e ss. do Código Civil Angolano. Constitui negócio jurídico de <strong>Direito Civil puro</strong>, ao abrigo da plena autonomia privada das partes (Art.º 405.º CC).</p>
                  <p>1.2. As partes celebram o presente contrato ao abrigo da plena autonomia privada consagrada no artigo 405.º do Código Civil Angolano, com liberdade na fixação das condições de remuneração, prazo e garantias.</p>
                  <h4 style={h4s}>CL.ª 2.ª — MONTANTE E DESEMBOLSO</h4>
                  <p>2.1. A MUTUANTE entrega ao MUTUÁRIO, a título de mútuo, <span style={fill}>{pValor} ({pExt})</span>, nos termos e condições do presente contrato e do Plano de Amortização — Anexo I.</p>
                  <h4 style={h4s}>CL.ª 3.ª — REMUNERAÇÃO E JUROS</h4>
                  <p>3.1. O MUTUÁRIO paga juros à taxa anual de <span style={fill}>{taxa||'[Taxa]'}%</span>, calculados sobre o capital em dívida com base em <span style={fill}>{base}</span>, sem capitalização automática.</p>
                  <p>3.2. Comissão de abertura: <span style={fill}>{comAbrt}%</span> do montante do mútuo, devida na data do 1.º desembolso.</p>
                  <h4 style={h4s}>CL.ª 4.ª — MORA E PENALIDADES</h4>
                  <p>4.1. Em mora, acrescem juros moratórios de <span style={fill}>{juroMora}%</span>/dia desde a data de vencimento até integral pagamento (Art.ºs 804.º e ss. CC), sem necessidade de interpelação.</p>
                  <h4 style={h4s}>CL.ª 5.ª — PRAZO E AMORTIZAÇÃO</h4>
                  <p>5.1. Prazo total: <span style={fill}>{prazo}</span>. Prestações <span style={fill}>{period.toLowerCase()}</span> conforme Plano de Amortização — Anexo I.</p>
                  <h4 style={h4s}>CL.ª 6.ª — MEIOS DE REEMBOLSO ACEITES</h4>
                  <p>
                    {Array.from(methods).map((m, i) => {
                      const opt = MEIOS_REEMBOLSO.find(o=>o.key===m);
                      return opt ? <span key={m}>{i>0?<br/>:null}{String.fromCharCode(97+i)}) <strong>{opt.label}</strong></span> : null;
                    })}
                    {methods.has('numerario') && Array.from(modalidadesNum).length > 0 && (
                      <><br/><em style={{ fontSize:8.5, color:'#7888A0' }}>Modalidades em Numerário: {Array.from(modalidadesNum).map(k => MODALIDADES_NUMERARIO.find(o=>o.key===k)?.label).filter(Boolean).join(', ')}</em></>
                    )}
                  </p>
                  <p>A aceitação de OT/BT <strong>não implica novação</strong> da obrigação.</p>
                  <h4 style={h4s}>CL.ª 7.ª — GARANTIAS</h4>
                  <p>7.1. Em garantia, o MUTUÁRIO constitui: <span style={fill}>{garPrinc}</span>, valor <span style={fill}>{pGarVal}</span>, mantida válida e eficaz durante toda a vigência. <span style={fill}>{renov}</span>.</p>
                  <h4 style={h4s}>CL.ª 8.ª — VENCIMENTO ANTECIPADO</h4>
                  <p>8.1. Ocorre vencimento antecipado por simples notificação escrita em caso de: (a) mora &gt;30 dias; (b) deterioração financeira; (c) declarações falsas; (d) oneração das garantias; (e) insolvência; (f) dissolução.</p>
                  {model==='modelo_c' && (
                    <>
                      <h4 style={h4s}>CL.ª 9.ª — DESEMBOLSOS FASEADOS (Modelo C)</h4>
                      <p>9.1. Os desembolsos são condicionados à verificação das condições de libertação definidas no Anexo II, incluindo vistorias técnicas e relatórios aprovados pela MUTUANTE.</p>
                    </>
                  )}
                  <h4 style={h4s}>CL.ª {model==='modelo_c'?'10':'9'}.ª — LEI E FORO</h4>
                  <p>Lei angolana — Código Civil. Foro eleito: <span style={fill}>{foro}</span>, com renúncia irrevogável a qualquer outro.</p>
                  <h4 style={h4s}>CL.ª {model==='modelo_c'?'11':'10'}.ª — DISPOSIÇÕES GERAIS</h4>
                  <p>Nos termos do Art.º 1143.º CC: valores &gt; UCF 3.000 exigem escritura pública. Alterações apenas por escrito e assinadas por ambas as Partes.</p>
                  <p>Integram o presente contrato: <strong>Anexo I</strong> — Plano de Amortização; {model==='modelo_c'&&<><strong>Anexo II</strong> — Condições de Desembolso por Fase; </>}<strong>Anexo {model==='modelo_c'?'III':'II'}</strong> — Instrumentos de Garantia.</p>
                  <div style={{ marginTop:18, borderTop:'1px solid rgba(120,136,160,.2)', paddingTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, textAlign:'center' }}>
                    <div>
                      <div style={{ fontSize:8.5, color:'#7888A0', marginBottom:20 }}>A MUTUANTE</div>
                      <div style={{ borderTop:'1px solid rgba(120,136,160,.2)', paddingTop:6, fontSize:9.5, color:'#C9A84C' }}>MAIOMBE — Capital &amp; Credit, Lda.</div>
                    </div>
                    <div>
                      <div style={{ fontSize:8.5, color:'#7888A0', marginBottom:20 }}>O MUTUÁRIO</div>
                      <div style={{ borderTop:'1px solid rgba(120,136,160,.2)', paddingTop:6, fontSize:9.5, color:'#C9A84C' }}>{pMutuario}</div>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
