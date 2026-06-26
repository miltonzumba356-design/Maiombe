import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, FileText, FilePen, Percent,
  TrendingDown, Building2, ShieldAlert, Shield, RefreshCw,
  Users, FolderOpen, Landmark, BarChart3, Bell, LogOut, ChevronDown, Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, canAccess, type Module } from '@/types';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState, useEffect } from 'react';

interface SubItem {
  to: string;       // pathname usado para detecção de estado activo
  href?: string;    // URL de navegação (pode incluir query params)
  label: string;
  icon: React.ReactNode;
  requireWrite?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  module: Module;
  requireWrite?: boolean;
  sectionLabel: string;
  children?: SubItem[];
}

const NAV_ITEMS: NavItem[] = [
  { sectionLabel: 'Núcleo Operacional',  to: '/',          label: 'Dashboard Executivo',        icon: <LayoutDashboard size={13} />, module: 'dashboard' },
  { sectionLabel: 'Núcleo Operacional',  to: '/carteira',  label: 'Carteira de Crédito',         icon: <CreditCard size={13} />,      module: 'carteira' },
  { sectionLabel: 'Núcleo Operacional',  to: '/contratos', label: 'Gestão de Contratos',         icon: <FileText size={13} />,        module: 'contratos',
    children: [
      { to: '/elaboracao', label: 'Elaboração de Contrato', icon: <FilePen size={11} />, requireWrite: true },
    ],
  },
  { sectionLabel: 'Núcleo Operacional',  to: '/taxas',     label: 'Taxas, Juros & Comissões',    icon: <Percent size={13} />,         module: 'taxas' },
  { sectionLabel: 'Gestão do Passivo',   to: '/passivo',   label: 'Gestão do Passivo',           icon: <TrendingDown size={13} />,    module: 'passivo' },
  { sectionLabel: 'Gestão do Passivo',   to: '/fontes',    label: 'Fontes de Financiamento',     icon: <Building2 size={13} />,       module: 'fontes' },
  { sectionLabel: 'Gestão do Passivo',   to: '/capital-gestao', label: 'Capital de Gestão',      icon: <Landmark size={13} />,        module: 'passivo' },
  { sectionLabel: 'Análise & Risco',     to: '/risco',     label: 'Gestão de Risco',             icon: <ShieldAlert size={13} />,     module: 'risco' },
  { sectionLabel: 'Análise & Risco',     to: '/garantias', label: 'Garantias',                   icon: <Shield size={13} />,          module: 'garantias' },
  { sectionLabel: 'Análise & Risco',     to: '/cobranca',  label: 'Cobrança & Recuperação',      icon: <RefreshCw size={13} />,       module: 'cobranca' },
  { sectionLabel: 'Entidades & Crédito', to: '/clientes',  label: 'Crédito Cedido — Clientes',   icon: <Users size={13} />,           module: 'clientes' },
  { sectionLabel: 'Entidades & Crédito', to: '/projetos',  label: 'Projetos Financiados',        icon: <FolderOpen size={13} />,      module: 'projetos' },
  { sectionLabel: 'Entidades & Crédito', to: '/titulos',   label: 'Títulos da Dívida Pública',   icon: <Landmark size={13} />,        module: 'titulos' },
  { sectionLabel: 'Inteligência',        to: '/bi',          label: 'Business Intelligence',       icon: <BarChart3 size={13} />,       module: 'bi' },
  { sectionLabel: 'Inteligência',        to: '/alertas',     label: 'Alertas & Notificações',      icon: <Bell size={13} />,            module: 'alertas' },
  { sectionLabel: 'Inteligência',        to: '/automacoes',  label: 'Automação de Notificações',   icon: <Zap size={13} />,             module: 'alertas' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: alertsData } = useQuery({
    queryKey: ['alerts-count'],
    queryFn: () => api.get('/alerts').then(r => r.data.data?.kpis),
    refetchInterval: 30000,
    enabled: !!user && canAccess(user.role, 'alertas'),
  });

  const totalAlerts = alertsData
    ? (alertsData.urgente || 0) + (alertsData.atencao || 0) + (alertsData.informativo || 0)
    : 0;

  // Track which parent items are expanded; auto-expand if a child is active
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const init = new Set<string>();
    NAV_ITEMS.forEach(item => {
      if (item.children?.some(c => location.pathname === c.to)) init.add(item.to);
    });
    return init;
  });

  // Auto-expand when navigating to a child route
  useEffect(() => {
    NAV_ITEMS.forEach(item => {
      if (item.children?.some(c => location.pathname === c.to)) {
        setExpanded(prev => { const s = new Set(prev); s.add(item.to); return s; });
      }
    });
  }, [location.pathname]);

  function toggleExpand(to: string) {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(to) ? s.delete(to) : s.add(to);
      return s;
    });
  }

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const visibleItems = user
    ? NAV_ITEMS.filter(item => canAccess(user.role, item.module, item.requireWrite ? 'write' : 'read'))
    : [];

  const rendered = visibleItems.map((item, idx) => ({
    ...item,
    showSection: idx === 0 || item.sectionLabel !== visibleItems[idx - 1].sectionLabel,
  }));

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 264, zIndex: 100,
      background: 'linear-gradient(180deg, #0C1B0F, #060907)',
      borderRight: '1px solid rgba(201,168,76,0.16)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}
      className="[&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-sl2"
    >
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(201,168,76,0.16)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, background: 'linear-gradient(135deg, #C9A84C, #DEB96A)',
            borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900, color: '#07090C', boxShadow: '0 0 18px rgba(201,168,76,.28)', flexShrink: 0,
          }}>M</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>MAIOMBE</div>
            <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 2, color: '#C9A84C' }}>Capital & Credit Intelligence</div>
          </div>
        </div>
        <div style={{
          marginTop: 5, fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 1.5,
          padding: '2px 7px', borderRadius: 3, background: 'rgba(201,168,76,.1)',
          color: '#C9A84C', border: '1px solid rgba(201,168,76,.22)', display: 'inline-block',
        }}>v2.0 · Gestão de Carteira · Angola</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingBottom: 8 }}>
        {rendered.map(item => {
          const badgeCount = item.to === '/alertas' ? totalAlerts : undefined;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = expanded.has(item.to);
          const isParentActive = location.pathname === item.to || item.children?.some(c => location.pathname === c.to);

          return (
            <div key={item.to}>
              {item.showSection && (
                <div style={{
                  padding: '16px 18px 5px', fontSize: 7.5, textTransform: 'uppercase',
                  letterSpacing: 2.5, color: '#364858', fontWeight: 700,
                }}>
                  {item.sectionLabel}
                </div>
              )}

              {hasChildren ? (
                /* Parent navigates to its own route; chevron-only toggles submenu */
                <div>
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <NavLink
                      to={item.to}
                      end
                      onClick={() => setExpanded(prev => { const s = new Set(prev); s.add(item.to); return s; })}
                      style={({ isActive }) => ({
                        flex: 1, display: 'flex', alignItems: 'center', gap: 9,
                        padding: '8px 0 8px 18px', cursor: 'pointer', transition: 'all .15s',
                        borderLeft: `3px solid ${isActive || item.children?.some(c => location.pathname === c.to) ? '#C9A84C' : 'transparent'}`,
                        background: isActive || item.children?.some(c => location.pathname === c.to) ? 'linear-gradient(90deg, rgba(201,168,76,.09), transparent)' : 'transparent',
                        textDecoration: 'none',
                      })}
                    >
                      {({ isActive }) => {
                        const anyChildActive = item.children?.some(c => location.pathname === c.to) ?? false;
                        const active = isActive || anyChildActive;
                        return (
                          <>
                            <span style={{ fontSize: 13, width: 16, textAlign: 'center', color: active ? '#DEB96A' : '#7888A0' }}>
                              {item.icon}
                            </span>
                            <span style={{ fontSize: 11.5, fontWeight: 500, color: active ? '#DEB96A' : '#7888A0' }}>
                              {item.label}
                            </span>
                          </>
                        );
                      }}
                    </NavLink>
                    <button
                      onClick={() => toggleExpand(item.to)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '8px 14px 8px 6px', display: 'flex', alignItems: 'center',
                        color: isParentActive ? '#DEB96A' : '#7888A0',
                        transition: 'color .15s',
                      }}
                      title={isOpen ? 'Colapsar' : 'Expandir'}
                    >
                      <span style={{ transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'flex' }}>
                        <ChevronDown size={11} />
                      </span>
                    </button>
                  </div>

                  {/* Sub-items */}
                  {isOpen && (
                    <div style={{ borderLeft: '1px solid rgba(201,168,76,.12)', marginLeft: 29, marginBottom: 2 }}>
                      {item.children!
                        .filter(child => !child.requireWrite || (user && canAccess(user.role, item.module, 'write')))
                        .map(child => {
                          const isChildActive = location.pathname === child.to;
                          return (
                            <Link
                              key={child.to}
                              to={child.href ?? child.to}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '6px 10px 6px 14px', cursor: 'pointer', transition: 'all .15s',
                                borderLeft: `2px solid ${isChildActive ? '#C9A84C' : 'transparent'}`,
                                background: isChildActive ? 'rgba(201,168,76,.07)' : 'transparent',
                                textDecoration: 'none',
                              }}
                            >
                              <span style={{ fontSize: 11, width: 13, textAlign: 'center', color: isChildActive ? '#DEB96A' : '#556070' }}>
                                {child.icon}
                              </span>
                              <span style={{ fontSize: 10.5, fontWeight: 500, color: isChildActive ? '#DEB96A' : '#556070' }}>
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px 8px 18px',
                    cursor: 'pointer', transition: 'all .15s',
                    borderLeft: `3px solid ${isActive ? '#C9A84C' : 'transparent'}`,
                    background: isActive ? 'linear-gradient(90deg, rgba(201,168,76,.09), transparent)' : 'transparent',
                    textDecoration: 'none',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{ fontSize: 13, width: 16, textAlign: 'center', color: isActive ? '#DEB96A' : '#7888A0', transition: 'color .15s' }}>
                        {item.icon}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: isActive ? '#DEB96A' : '#7888A0', transition: 'color .15s', flex: 1 }}>
                        {item.label}
                      </span>
                      {badgeCount ? (
                        <span style={{ background: '#D43352', color: '#fff', fontSize: 7.5, fontWeight: 700, padding: '1px 5px', borderRadius: 7 }}>
                          {badgeCount}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(201,168,76,0.16)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #C9A84C, #178A4A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#07090C', flexShrink: 0,
        }}>
          {user ? getInitials(user.name) : 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#E5EBF2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <div style={{ fontSize: 9, color: '#7888A0' }}>{user ? ROLE_LABELS[user.role] : ''}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#364858', padding: 4, borderRadius: 4 }}
          title="Terminar sessão"
        >
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  );
}
