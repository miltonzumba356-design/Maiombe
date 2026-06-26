import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Download, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface TopBarProps {
  title: string;
  breadcrumb?: string;
  showNewButton?: boolean;
  onNew?: () => void;
  newLabel?: string;
  onExport?: () => void;
}

export default function TopBar({ title, breadcrumb, showNewButton = true, onNew, newLabel = '+ Nova Operação', onExport }: TopBarProps) {
  const navigate = useNavigate();
  const [clock, setClock] = useState('');

  const { data: alertsData } = useQuery({
    queryKey: ['alerts-count-topbar'],
    queryFn: () => api.get('/alerts').then(r => r.data.data?.kpis),
    refetchInterval: 30000,
  });

  const totalAlerts = alertsData
    ? (alertsData.urgente || 0) + (alertsData.atencao || 0)
    : 0;

  useEffect(() => {
    function tick() {
      const now = new Date();
      setClock(now.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' · ' + now.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 90, display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 26px', background: 'rgba(7,9,12,.9)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(201,168,76,0.16)',
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</h1>
          <div style={{ fontSize: 9.5, color: '#7888A0', marginTop: 1 }}>
            {breadcrumb || `MAIOMBE / ${title} · ${new Date().toLocaleDateString('pt-AO', { month: 'short', year: 'numeric' })}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <button
            className="btn btn-outline"
            style={{ gap: 5, opacity: onExport ? 1 : 0.4, cursor: onExport ? 'pointer' : 'default' }}
            onClick={onExport}
            disabled={!onExport}
            title={onExport ? 'Exportar dados em CSV' : 'Sem dados para exportar'}
          >
            <Download size={11} /> Exportar CSV
          </button>
          {showNewButton && (
            <button
              className="btn btn-gold"
              onClick={onNew || (() => navigate('/elaboracao'))}
            >
              {newLabel}
            </button>
          )}
          <button
            onClick={() => navigate('/alertas')}
            style={{
              width: 32, height: 32, borderRadius: 6, background: 'rgba(11,25,16,0.9)',
              border: '1px solid rgba(201,168,76,0.16)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', position: 'relative',
            }}
          >
            <Bell size={14} color="#E5EBF2" />
            {totalAlerts > 0 && (
              <span style={{
                position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%',
                background: '#D43352', border: '2px solid #07090C',
                animation: 'pulse 2s infinite',
              }} />
            )}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 26px',
        background: 'rgba(10,26,16,.6)', borderBottom: '1px solid rgba(38,184,112,.18)',
        fontSize: 9.5, color: '#26B870',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#26B870', animation: 'pulse 2s infinite', flexShrink: 0 }} />
        Sistema Operacional · Plataforma de Gestão de Carteira e Risco · Motor de Análise activo · Assinatura Digital certificada
        <span style={{ marginLeft: 'auto', color: '#7888A0' }}>{clock}</span>
      </div>
    </>
  );
}
