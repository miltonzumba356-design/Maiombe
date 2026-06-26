import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, ChevronUp, Mail, Download, AlertTriangle, TrendingUp, FileText, Shield, Phone, MapPin, User, Building2 } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import Panel from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatKz, formatDate, formatPercent, getEntityTypeLabel } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const RISK_CFG: Record<string, { bg: string; color: string; label: string }> = {
  baixo:  { bg: 'rgba(38,184,112,.12)',  color: '#26B870', label: 'Baixo'   },
  medio:  { bg: 'rgba(224,144,32,.1)',   color: '#E09020', label: 'Médio'   },
  alto:   { bg: 'rgba(212,51,82,.12)',   color: '#D43352', label: 'Alto'    },
  critico:{ bg: 'rgba(212,51,82,.2)',    color: '#FF2040', label: 'Crítico' },
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

interface ScheduleRow {
  installment_number: number; due_date: string; amortization: number;
  interest: number; total_installment: number; residual_capital: number; status: string;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  const { data: clientData, isLoading } = useQuery({
    queryKey: ['client-detail', id],
    queryFn: () => api.get(`/clients/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: contractsData } = useQuery({
    queryKey: ['client-all-contracts', id],
    queryFn: () => api.get('/contracts', { params: { limit: 200 } }).then(r => r.data.data || []),
    enabled: !!id,
  });

  const { data: schedule } = useQuery<ScheduleRow[]>({
    queryKey: ['client-detail-schedule', expandedContract],
    queryFn: () => api.get(`/contracts/${expandedContract}/schedule`).then(r => r.data.data),
    enabled: !!expandedContract,
  });

  if (isLoading) return (
    <>
      <TopBar title="Detalhe do Cliente" breadcrumb="MAIOMBE / Clientes / Detalhe" showNewButton={false} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <LoadingSpinner />
      </div>
    </>
  );

  if (!clientData) return (
    <>
      <TopBar title="Cliente não encontrado" breadcrumb="MAIOMBE / Clientes" showNewButton={false} />
      <div style={{ padding: '40px 26px', textAlign: 'center', color: '#7888A0' }}>Cliente não encontrado.</div>
    </>
  );

  const client = clientData;
  const allContracts = ((contractsData || []) as Array<{
    id: string; reference: string; client_id: string; amount: number;
    interest_rate: number; celebration_date: string; status: string;
    term_months: number; payment_frequency: string; risk_level: string;
  }>).filter(c => c.client_id === id);

  const riskHistory = (clientData.riskHistory || []) as Array<{
    id: string; risk_level: string; overall_score: number; notes: string;
    recommended_action: string; assessed_at: string;
  }>;

  const totalExposure = allContracts.filter(c => c.status === 'recebidos').reduce((a, c) => a + c.amount, 0);
  const ativos = allContracts.filter(c => c.status === 'recebidos').length;
  const latestRisk = riskHistory[0];
  const riskLevel = latestRisk?.risk_level || 'baixo';
  const risk = RISK_CFG[riskLevel] || RISK_CFG.baixo;

  async function handleExport() {
    const safeName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    await downloadExcel(`MAIOMBE_Cliente_${safeName}_${csvDate()}.xlsx`, [
      {
        title: 'DADOS DO CLIENTE',
        headers: ['Campo', 'Valor'],
        rows: [
          ['Nome', client.name],
          ['NIF', client.nif],
          ['Tipo de Entidade', getEntityTypeLabel(client.entity_type)],
          ['Código', client.code || '—'],
          ['Email', client.email || '—'],
          ['Telefone', client.phone || '—'],
          ['Província', client.province || '—'],
          ['Endereço', client.address || '—'],
          ['Representante Legal', client.legal_representative || '—'],
          ['Membro desde', client.created_at ? formatDate(client.created_at) : '—'],
          ['Exposição Total (Kz)', totalExposure],
          ['Contratos Activos', ativos],
          ['Nível de Risco', riskLevel],
          ['Score de Risco', latestRisk?.overall_score != null ? latestRisk.overall_score : '—'],
        ],
      },
      {
        title: 'CONTRATOS DO CLIENTE',
        headers: ['Referência', 'Estado', 'Valor (Kz)', 'Taxa (%)', 'Data Início', 'Prazo (meses)', 'Periodicidade', 'Risco'],
        rows: allContracts.map(c => [
          c.reference, c.status, c.amount, c.interest_rate,
          formatDate(c.celebration_date), c.term_months, c.payment_frequency, c.risk_level,
        ]),
      },
      ...(riskHistory.length > 0 ? [{
        title: 'HISTÓRICO DE RISCO',
        headers: ['Data Avaliação', 'Nível', 'Score', 'Notas', 'Acção Recomendada'],
        rows: riskHistory.map(r => [
          formatDate(r.assessed_at), r.risk_level, r.overall_score, r.notes || '—', r.recommended_action || '—',
        ]),
      }] : []),
    ]);
  }

  return (
    <>
      <TopBar
        title={client.name}
        breadcrumb={`MAIOMBE / Clientes / ${client.name}`}
        showNewButton={false}
      />
      <div style={{ padding: '22px 26px' }}>

        {/* Back button */}
        <button onClick={() => navigate('/clientes')} style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18,
          background: 'none', border: '1px solid rgba(201,168,76,.15)', borderRadius: 6,
          cursor: 'pointer', color: '#7888A0', padding: '5px 11px', fontSize: 9.5,
        }}>
          <ArrowLeft size={12} /> Voltar à lista de clientes
        </button>

        {/* Client Header */}
        <div style={{
          display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 18,
          background: 'rgba(7,9,12,.4)', border: '1px solid rgba(201,168,76,.12)',
          borderRadius: 12, padding: '20px 24px',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#C9A84C,#A07830)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
          }}>
            {initials(client.name)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{client.name}</div>
            <div style={{ fontSize: 10, color: '#7888A0', marginBottom: 10 }}>
              {getEntityTypeLabel(client.entity_type)} · NIF: <span style={{ color: '#DEB96A' }}>{client.nif}</span>
              {client.code && <> · <span style={{ color: '#7888A0' }}>{client.code}</span></>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', fontSize: 9.5, color: '#7888A0' }}>
              {client.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} /> {client.email}</span>}
              {client.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} /> {client.phone}</span>}
              {client.province && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} /> {client.province}</span>}
              {client.legal_representative && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={10} /> {client.legal_representative}</span>}
              {client.address && <span style={{ display: 'flex', alignItems: 'center', gap: 4, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Building2 size={10} /> {client.address}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: risk.bg, color: risk.color, border: `1px solid ${risk.color}44` }}>
              Risco {risk.label}
            </span>
            <div style={{ display: 'flex', gap: 7 }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 6, cursor: 'pointer', color: '#7888A0', padding: '5px 10px', fontSize: 8.5 }}>
                <Mail size={10} /> Enviar Email
              </button>
              <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '5px 10px', fontSize: 8.5 }}>
                <Download size={10} /> Exportar XLSX
              </button>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <div style={{ background: 'rgba(7,9,12,.4)', border: '1px solid rgba(201,168,76,.1)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 8.5, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Exposição Total</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#C9A84C', fontFamily: 'monospace' }}>{formatKz(totalExposure, true)}</div>
            <div style={{ fontSize: 8.5, color: '#7888A0', marginTop: 3 }}>{allContracts.length} contratos no total</div>
          </div>
          <div style={{ background: 'rgba(7,9,12,.4)', border: '1px solid rgba(38,184,112,.1)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 8.5, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Contratos Activos</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#26B870', fontFamily: 'monospace' }}>{ativos}</div>
            <div style={{ fontSize: 8.5, color: '#7888A0', marginTop: 3 }}>{allContracts.filter(c => c.status === 'elaboracao').length} em formalização</div>
          </div>
          <div style={{ background: 'rgba(7,9,12,.4)', border: `1px solid ${risk.color}22`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 8.5, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Score de Risco</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: risk.color, fontFamily: 'monospace' }}>
              {latestRisk?.overall_score != null ? `${latestRisk.overall_score.toFixed(1)}/10` : '—'}
            </div>
            <div style={{ fontSize: 8.5, color: '#7888A0', marginTop: 3 }}>
              {latestRisk ? formatDate(latestRisk.assessed_at) : 'Sem avaliação'}
            </div>
          </div>
          <div style={{ background: 'rgba(7,9,12,.4)', border: '1px solid rgba(201,168,76,.1)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 8.5, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Membro desde</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#DEB96A', fontFamily: 'monospace' }}>
              {client.created_at ? new Date(client.created_at).getFullYear() : '—'}
            </div>
            <div style={{ fontSize: 8.5, color: '#7888A0', marginTop: 3 }}>
              {client.created_at ? formatDate(client.created_at) : ''}
            </div>
          </div>
        </div>

        {/* Contracts */}
        <Panel title="Contratos do Cliente" tag={`${allContracts.length} contratos`}
          actions={
            <button onClick={() => navigate('/elaboracao')} style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', borderRadius: 6, cursor: 'pointer', color: '#DEB96A', padding: '4px 9px', fontSize: 8.5 }}>
              + Novo Contrato
            </button>
          }
          style={{ marginBottom: 12 }}>
          {allContracts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#364858', fontSize: 11, padding: 32 }}>
              <FileText size={28} color="#364858" style={{ marginBottom: 8 }} />
              <div>Sem contratos registados para este cliente.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {allContracts.map(c => (
                <div key={c.id} style={{ borderBottom: '1px solid rgba(201,168,76,.06)' }}>
                  <div
                    style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setExpandedContract(expandedContract === c.id ? null : c.id)}
                  >
                    <span style={{ fontFamily: 'monospace', color: '#DEB96A', fontSize: 11, fontWeight: 700, minWidth: 120 }}>{c.reference}</span>
                    <Badge value={c.status} />
                    <Badge value={c.risk_level} type="risk" />
                    <span style={{ fontSize: 9, color: '#7888A0' }}>{formatDate(c.celebration_date)}</span>
                    <span style={{ fontSize: 9, color: '#7888A0' }}>{c.term_months} meses · {c.payment_frequency}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#DEB96A', fontFamily: 'monospace', fontWeight: 700 }}>{formatKz(c.amount)} Kz</span>
                    <span style={{ fontSize: 9, color: '#7888A0' }}>{formatPercent(c.interest_rate)} a.a.</span>
                    {expandedContract === c.id ? <ChevronUp size={13} color="#7888A0" /> : <ChevronDown size={13} color="#7888A0" />}
                  </div>

                  {expandedContract === c.id && (
                    <div style={{ padding: '0 14px 16px', background: 'rgba(7,9,12,.25)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 1, margin: '10px 0 8px' }}>
                        Plano de Amortização
                      </div>
                      {schedule ? (
                        schedule.length === 0 ? (
                          <div style={{ color: '#7888A0', fontSize: 10, padding: '8px 0' }}>Plano ainda não gerado para este contrato.</div>
                        ) : (
                          <div style={{ overflow: 'auto', maxHeight: 300 }}>
                            <table className="data-table">
                              <thead>
                                <tr><th>#</th><th>Data Venc.</th><th>Amortização</th><th>Juros</th><th>Prestação Total</th><th>Cap. Residual</th><th>Estado</th></tr>
                              </thead>
                              <tbody>
                                {schedule.map(row => (
                                  <tr key={row.installment_number}>
                                    <td className="td-mono">{row.installment_number}</td>
                                    <td>{formatDate(row.due_date)}</td>
                                    <td className="td-mono">{formatKz(row.amortization)}</td>
                                    <td className="td-mono">{formatKz(row.interest)}</td>
                                    <td className="td-mono td-bold">{formatKz(row.total_installment)}</td>
                                    <td className="td-mono">{formatKz(row.residual_capital)}</td>
                                    <td><Badge value={row.status} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      ) : <LoadingSpinner text="A carregar plano..." />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Risk History */}
          <Panel title="Histórico de Avaliações de Risco" tag={`${riskHistory.length} avaliações`}>
            {riskHistory.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#364858', fontSize: 11, padding: 24 }}>
                <Shield size={24} color="#364858" style={{ marginBottom: 6 }} />
                <div>Sem avaliações de risco registadas.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {riskHistory.map((r, i) => {
                  const rc = RISK_CFG[r.risk_level] || RISK_CFG.baixo;
                  return (
                    <div key={r.id || i} style={{ padding: '11px 14px', borderBottom: '1px solid rgba(201,168,76,.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.color}33` }}>
                          {rc.label}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: rc.color, fontFamily: 'monospace' }}>
                          {r.overall_score?.toFixed(1)}/10
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 8.5, color: '#7888A0' }}>{formatDate(r.assessed_at)}</span>
                      </div>
                      {r.notes && <div style={{ fontSize: 9, color: '#7888A0', marginBottom: 2 }}>{r.notes}</div>}
                      {r.recommended_action && (
                        <div style={{ fontSize: 9, color: '#E09020', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={9} /> {r.recommended_action}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Summary stats */}
          <Panel title="Análise de Exposição">
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Contratos Activos', value: ativos, color: '#26B870' },
                { label: 'Em Formalização', value: allContracts.filter(c => c.status === 'elaboracao').length, color: '#E09020' },
                { label: 'Liquidados', value: allContracts.filter(c => c.status === 'liquidado').length, color: '#7888A0' },
                { label: 'Total de Contratos', value: allContracts.length, color: '#DEB96A' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(7,9,12,.4)', border: '1px solid rgba(201,168,76,.06)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={14} color={item.color} />
                    <span style={{ fontSize: 10, color: '#E5EBF2' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>{item.value}</span>
                </div>
              ))}

              <div style={{ marginTop: 8, padding: '12px', background: 'rgba(201,168,76,.05)', border: '1px solid rgba(201,168,76,.12)', borderRadius: 8 }}>
                <div style={{ fontSize: 8.5, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Exposição Activa Total</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#C9A84C', fontFamily: 'monospace' }}>{formatKz(totalExposure, true)}</div>
              </div>
            </div>
          </Panel>
        </div>

      </div>
    </>
  );
}
