import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Phone, Gavel, Clock, UserCheck } from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import KpiCard from '@/components/ui/KpiCard';
import Panel from '@/components/ui/Panel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import { downloadExcel, csvDate } from '@/lib/export';

const SEV: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
  urgente:    { color: '#D43352', bg: 'rgba(212,51,82,.07)', border: 'rgba(212,51,82,.2)', dot: '#D43352', label: 'Urgente' },
  atencao:    { color: '#E09020', bg: 'rgba(224,144,32,.05)', border: 'rgba(224,144,32,.15)', dot: '#E09020', label: 'Atenção' },
  informativo:{ color: '#5B9CF6', bg: 'rgba(91,156,246,.04)', border: 'rgba(91,156,246,.12)', dot: '#5B9CF6', label: 'Informação' },
  positivo:   { color: '#26B870', bg: 'rgba(38,184,112,.05)', border: 'rgba(38,184,112,.12)', dot: '#26B870', label: 'Positivo' },
};

const BADGE_STYLE: Record<string, React.CSSProperties> = {
  urgente:    { background: 'rgba(212,51,82,.15)', color: '#D43352', border: '1px solid rgba(212,51,82,.25)' },
  atencao:    { background: 'rgba(224,144,32,.12)', color: '#E09020', border: '1px solid rgba(224,144,32,.2)' },
  informativo:{ background: 'rgba(91,156,246,.1)', color: '#5B9CF6', border: '1px solid rgba(91,156,246,.2)' },
  positivo:   { background: 'rgba(38,184,112,.1)', color: '#26B870', border: '1px solid rgba(38,184,112,.18)' },
};

const FILTERS = ['Todos', 'Urgentes', 'Atenção', 'Informativos', 'Positivos'];

export default function Alerts() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Todos');

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts').then(r => r.data.data),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => api.patch(`/alerts/${id}/resolve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const alerts: Array<{
    id: string; title: string; description: string; severity: string;
    category: string; contract_reference: string; created_at: string; resolved_at: string;
  }> = data?.data || [];
  const kpis = data?.kpis;

  const urgente = alerts.filter(a => a.severity === 'urgente');
  const atencao = alerts.filter(a => a.severity === 'atencao');
  const informativo = alerts.filter(a => a.severity === 'informativo');
  const positivo = alerts.filter(a => a.severity === 'positivo');
  const resolvidos = alerts.filter(a => !!a.resolved_at).length;

  const filtered = filter === 'Todos' ? alerts
    : filter === 'Urgentes' ? urgente
    : filter === 'Atenção' ? atencao
    : filter === 'Positivos' ? positivo
    : informativo;

  async function handleExport() {
    const byCategory: Record<string, number> = {};
    alerts.forEach(a => { byCategory[a.category || 'outro'] = (byCategory[a.category || 'outro'] || 0) + 1; });
    await downloadExcel('MAIOMBE_Alertas_' + csvDate() + '.xlsx', [
      {
        title: 'KPIs PRINCIPAIS',
        headers: ['metrica', 'valor'],
        rows: [
          ['Total de Alertas', alerts.length],
          ['Urgentes / Criticos', urgente.length],
          ['Requerem Atencao', atencao.length],
          ['Informativos', informativo.length],
          ['Positivos / Resolvidos', positivo.length + resolvidos],
        ],
      },
      {
        title: 'ALERTAS POR CATEGORIA',
        headers: ['categoria', 'quantidade'],
        rows: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([c, n]) => [c.replace(/_/g, ' '), n]),
      },
      {
        title: 'ALERTAS URGENTES',
        headers: ['Severidade', 'Titulo', 'Descricao', 'Categoria', 'Contrato', 'Data'],
        rows: urgente.map(r => [r.severity, r.title, r.description, r.category, r.contract_reference, r.created_at]),
      },
      {
        title: 'LISTAGEM COMPLETA DE ALERTAS',
        headers: ['Severidade', 'Titulo', 'Descricao', 'Categoria', 'Contrato', 'Data'],
        rows: alerts.map(r => [r.severity, r.title, r.description, r.category, r.contract_reference, r.created_at]),
      },
    ]);
  }
  return (
    <>
      <TopBar title="Alertas & Notificações" breadcrumb="MAIOMBE / Alertas" showNewButton={false} onExport={handleExport} />
      <div className="ct">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Alertas Urgentes" value={kpis?.urgente ?? urgente.length} delta="Acção imediata" deltaType="dn" variant="cr" />
          <KpiCard label="Alertas de Atenção" value={kpis?.atencao ?? atencao.length} delta="Monitorização" deltaType="nt" variant="am" />
          <KpiCard label="Alertas Informativos" value={kpis?.informativo ?? informativo.length} delta="Sem urgência" deltaType="nt" variant="em" />
          <KpiCard label="Positivos / Resolvidos" value={positivo.length + resolvidos} delta={`${positivo.length} positivos · ${resolvidos} resolvidos`} deltaType="up" variant="gold" />
        </div>

        <Panel
          title="Todos os Alertas Activos — Centro de Notificações"
          actions={
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ background: 'rgba(7,9,12,.7)', border: '1px solid rgba(201,168,76,.18)', borderRadius: 6, padding: '4px 8px', color: '#E5EBF2', fontSize: 9.5 }}
            >
              {FILTERS.map(f => (
                <option key={f}>{f} {f === 'Todos' ? `(${alerts.length})` : f === 'Urgentes' ? `(${urgente.length})` : f === 'Atenção' ? `(${atencao.length})` : f === 'Positivos' ? `(${positivo.length})` : `(${informativo.length})`}</option>
              ))}
            </select>
          }
        >
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map(a => {
                const cfg = SEV[a.severity] || SEV.informativo;
                const badge = BADGE_STYLE[a.severity] || BADGE_STYLE.informativo;
                const isUrgent = a.severity === 'urgente';
                return (
                  <div key={a.id} style={{
                    display: 'flex', gap: 12, padding: '13px 16px', alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(201,168,76,.06)',
                    background: a.resolved_at ? 'transparent' : cfg.bg,
                    opacity: a.resolved_at ? 0.5 : 1,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                      background: cfg.dot,
                      boxShadow: isUrgent ? `0 0 6px ${cfg.dot}` : 'none',
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{a.title}</span>
                        <span style={{ ...badge, padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 600 }}>{cfg.label}</span>
                        {a.contract_reference && (
                          <span style={{ fontSize: 9, color: '#C9A84C', fontFamily: 'monospace' }}>{a.contract_reference}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 9.5, color: '#7888A0', lineHeight: 1.5 }}>{a.description}</div>
                      <div style={{ fontSize: 8, color: '#364858', marginTop: 3 }}>
                        {a.category?.replace(/_/g, ' ')} · {formatDate(a.created_at)}
                      </div>
                      {(a.severity === 'urgente' || a.severity === 'atencao') && !a.resolved_at && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                          {[
                            { Icon: Phone, label: 'Contactar Mutuário', color: '#C9A84C', bg: 'rgba(201,168,76,.12)', border: 'rgba(201,168,76,.25)', action: () => a.contract_reference && navigate('/cobranca') },
                            { Icon: UserCheck, label: 'Registar Contacto', color: '#5B9CF6', bg: 'rgba(91,156,246,.1)', border: 'rgba(91,156,246,.2)', action: () => resolve.mutate(a.id) },
                            { Icon: Gavel, label: 'Escalar para Jurídico', color: '#E09020', bg: 'rgba(224,144,32,.1)', border: 'rgba(224,144,32,.2)', action: () => navigate('/passivo') },
                            ...(a.severity === 'urgente' ? [
                              { Icon: Clock, label: 'Prorrogar Prazo', color: '#7888A0', bg: 'rgba(7,9,12,.5)', border: 'rgba(120,136,160,.2)', action: () => resolve.mutate(a.id) },
                              { Icon: Gavel, label: 'Cobrança Coerciva', color: '#D43352', bg: 'rgba(212,51,82,.1)', border: 'rgba(212,51,82,.22)', action: () => navigate('/cobranca') },
                            ] : []),
                          ].map(({ Icon, label, color, bg, border, action }, bi) => (
                            <button key={bi} onClick={action} style={{ display:'flex', alignItems:'center', gap:3, background:bg, border:`1px solid ${border}`, borderRadius:5, cursor:'pointer', color, padding:'3px 8px', fontSize:8.5 }}>
                              <Icon size={9} /> {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{ fontSize: 8.5, color: '#364858', whiteSpace: 'nowrap' }}>{formatDate(a.created_at)}</span>
                      {!a.resolved_at ? (
                        <button
                          onClick={() => resolve.mutate(a.id)}
                          style={{ background: 'none', border: '1px solid rgba(201,168,76,.2)', borderRadius: 5, cursor: 'pointer', color: '#7888A0', padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}
                        >
                          <CheckCircle size={11} /> Resolver
                        </button>
                      ) : (
                        <span style={{ fontSize: 9, color: '#26B870', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <CheckCircle size={10} /> Resolvido
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#364858', fontSize: 11 }}>
                  Sem alertas nesta categoria
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}





