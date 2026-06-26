import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Credenciais inválidas. Verifique o email e a palavra-passe.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10"
      style={{ background: 'linear-gradient(135deg, #07090C, #0B1910)' }}>
      <div style={{ width: 420 }}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #C9A84C, #DEB96A)',
            borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: '#07090C',
            boxShadow: '0 0 24px rgba(201,168,76,.35)',
          }}>M</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>MAIOMBE</div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 2, color: '#C9A84C' }}>Capital & Credit Intelligence</div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(11,25,16,0.92)',
          border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: 16,
          padding: 32,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 64px rgba(0,0,0,.4)',
        }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Acesso à Plataforma</h1>
          <p style={{ fontSize: 10.5, color: '#7888A0', marginBottom: 24 }}>Introduza as suas credenciais para continuar</p>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: 'rgba(212,51,82,.1)', border: '1px solid rgba(212,51,82,.25)',
              borderRadius: 6, marginBottom: 16,
            }}>
              <AlertCircle size={14} color="#D43352" />
              <span style={{ fontSize: 10.5, color: '#D43352' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7888A0' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="utilizador@maiombe.ao"
                  required
                  autoComplete="username"
                  style={{ paddingLeft: 32 }}
                />
              </div>
            </div>

            <div className="field">
              <label>Palavra-passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7888A0' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingLeft: 32, paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7888A0' }}
                >
                  {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-gold"
              style={{ marginTop: 8, justifyContent: 'center', padding: '10px 0', fontSize: 11 }}
            >
              {loading ? 'A autenticar...' : 'Entrar na Plataforma'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(7,9,12,.5)', borderRadius: 8, border: '1px solid rgba(201,168,76,.08)' }}>
            <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 1.4, color: '#C9A84C', marginBottom: 6 }}>Credenciais de Demonstracao</div>
            <div style={{ fontSize: 9.5, color: '#7888A0', lineHeight: 1.8 }}>
              <span style={{ color: '#E5EBF2' }}>admin@maiombe.ao</span> — Administrador<br />
              <span style={{ color: '#E5EBF2' }}>ana.ferreira@maiombe.ao</span> — Dir. Financeiro<br />
              <span style={{ color: '#7888A0', fontSize: 9 }}>Palavra-passe: Maiombe@2026</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 9, color: '#364858' }}>
          MAIOMBE v2.0 · Plataforma de Mútuo Civil · Angola · Acesso restrito
        </div>
      </div>
    </div>
  );
}
