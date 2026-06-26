export default function LoadingSpinner({ text = 'A carregar...' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
      <div style={{
        width: 32, height: 32, border: '2px solid rgba(201,168,76,.2)',
        borderTopColor: '#C9A84C', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 10.5, color: '#7888A0', textTransform: 'uppercase', letterSpacing: 1 }}>{text}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8 }}>
      <span style={{ fontSize: 20, color: '#D43352' }}>!</span>
      <span style={{ fontSize: 10.5, color: '#D43352' }}>{message || 'Erro ao carregar dados'}</span>
    </div>
  );
}
