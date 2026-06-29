import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import Sidebar from './Sidebar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/ui/Toast';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

function AppLayoutInner() {
  useRealtimeEvents();
  const location = useLocation();
  const { isOpen, isMobile, close } = useSidebar();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <main style={{
        marginLeft: isMobile ? 0 : 264,
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
        flex: 1,
        width: isMobile ? '100%' : undefined,
        minWidth: 0,
      }}>
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <ToastContainer />
    </div>
  );
}

export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <SidebarProvider>
      <AppLayoutInner />
    </SidebarProvider>
  );
}
