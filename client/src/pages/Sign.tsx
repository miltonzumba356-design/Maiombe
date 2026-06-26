import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, FileText, User, Calendar, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const pubApi = axios.create({ baseURL: '/api/v1' });

function fmt(v: number) {
  return new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(v);
}

export default function Sign() {
  const { token } = useParams<{ token: string }>();
  const [done, setDone] = useState<'signed' | 'refused' | null>(null);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sign', token],
    queryFn: () => pubApi.get(`/public/sign/${token}`).then(r => r.data.data),
    retry: false,
  });

  const signMut = useMutation({
    mutationFn: () => pubApi.post(`/public/sign/${token}`),
    onSuccess: () => setDone('signed'),
    onError: (e: any) => setError(e.response?.data?.message || 'Erro ao assinar o documento.'),
  });

  const refuseMut = useMutation({
    mutationFn: () => pubApi.post(`/public/sign/${token}/refuse`),
    onSuccess: () => setDone('refused'),
    onError: (e: any) => setError(e.response?.data?.message || 'Erro ao processar recusa.'),
  });

  const expired = data && new Date(data.expiresAt) < new Date();

  // ── Layout base ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 600 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#1A7A3C', borderRadius: 10, padding: '10px 22px' }}>
            <ShieldCheck size={20} color="#FFC72C" />
            <span style={{ color: '#FFC72C', fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>MAIOMBE</span>
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>Sistema de Gestão de Crédito</span>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: 40, color: '#7888A0' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div>A carregar documento...</div>
            </div>
          </div>
        )}

        {/* Error / Not found */}
        {isError && (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <XCircle size={48} color="#D43352" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Link Inválido</div>
              <div style={{ color: '#7888A0', fontSize: 14 }}>Este link não existe ou já expirou. Contacte a MAIOMBE para um novo pedido.</div>
            </div>
          </div>
        )}

        {/* Already processed */}
        {data && data.status === 'assinado' && !done && (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: 32 }}>
              <CheckCircle size={48} color="#26B870" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Documento já Assinado</div>
              <div style={{ color: '#7888A0', fontSize: 14 }}>
                Este documento foi assinado em {new Date(data.signedAt).toLocaleString('pt-AO')}.
              </div>
            </div>
          </div>
        )}

        {/* Expired */}
        {data && data.status === 'pendente' && expired && (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: 32 }}>
              <AlertTriangle size={48} color="#E09020" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Link Expirado</div>
              <div style={{ color: '#7888A0', fontSize: 14 }}>Este link expirou em {new Date(data.expiresAt).toLocaleDateString('pt-AO')}. Solicite um novo pedido à MAIOMBE.</div>
            </div>
          </div>
        )}

        {/* Refused */}
        {data && data.status === 'recusado' && !done && (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: 32 }}>
              <XCircle size={48} color="#D43352" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Pedido Recusado</div>
              <div style={{ color: '#7888A0', fontSize: 14 }}>Este pedido de assinatura foi recusado. Contacte a MAIOMBE se foi um engano.</div>
            </div>
          </div>
        )}

        {/* ── MAIN: pendente e não expirado ─────────────────────────────── */}
        {data && data.status === 'pendente' && !expired && !done && (
          <div style={card}>
            {/* Título */}
            <div style={{ background: '#1A7A3C', borderRadius: '8px 8px 0 0', padding: '20px 24px', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={22} color="#FFC72C" />
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{data.documentTitle}</div>
                  <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, marginTop: 2 }}>
                    Pedido de Assinatura Digital · Válido até {new Date(data.expiresAt).toLocaleDateString('pt-AO')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Dados do signatário */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F0FFF6', border: '1px solid #26B870', borderRadius: 8, marginBottom: 20 }}>
                <User size={18} color="#26B870" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A7A3C' }}>{data.signerName}</div>
                  <div style={{ fontSize: 11, color: '#7888A0' }}>{data.signerRole}</div>
                </div>
              </div>

              {/* Resumo do documento */}
              {data.documentSummary && (
                <div style={{ padding: '14px 16px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Resumo do Documento</div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{data.documentSummary}</div>
                </div>
              )}

              {/* Dados do contrato */}
              {data.contract && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dados do Contrato</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Referência', value: data.contract.reference },
                      { label: 'Mutuário', value: data.contract.clientName },
                      { label: 'Valor', value: `${fmt(data.contract.amount)} Kz` },
                      { label: 'Taxa de Juro', value: `${data.contract.interestRate}% a.a.` },
                      { label: 'Data de Início', value: data.contract.startDate ? new Date(data.contract.startDate).toLocaleDateString('pt-AO') : '—' },
                      { label: 'Prazo', value: data.contract.termMonths ? `${data.contract.termMonths} meses` : '—' },
                    ].map((d, i) => (
                      <div key={i} style={{ padding: '10px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>{d.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{d.value || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Declaração */}
              <div style={{ padding: '14px 16px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.7 }}>
                  <strong>Declaração:</strong> Ao clicar em <strong>"Assinar Documento"</strong>, confirmo que li e aceito o conteúdo deste documento, e que a minha assinatura electrónica tem o mesmo valor jurídico que uma assinatura manuscrita, nos termos da legislação aplicável.
                </div>
              </div>

              {/* Checkbox de confirmação */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                  Li e compreendi o documento acima. Confirmo que os dados estão correctos e que pretendo assinar electronicamente.
                </span>
              </label>

              {error && (
                <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#B91C1C', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {/* Botões */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => signMut.mutate()}
                  disabled={!confirmed || signMut.isPending}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: confirmed ? '#26B870' : '#D1FAE5',
                    color: confirmed ? '#fff' : '#6B7280',
                    border: 'none', borderRadius: 8, padding: '14px 20px',
                    fontSize: 15, fontWeight: 700, cursor: confirmed ? 'pointer' : 'not-allowed',
                    transition: 'background .2s',
                  }}
                >
                  {signMut.isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={18} />}
                  Assinar Documento
                </button>
                <button
                  onClick={() => { if (window.confirm('Tem a certeza que pretende recusar este pedido?')) refuseMut.mutate(); }}
                  disabled={refuseMut.isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#FEF2F2', color: '#B91C1C',
                    border: '1px solid #FECACA', borderRadius: 8, padding: '14px 18px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <XCircle size={15} /> Recusar
                </button>
              </div>

              <div style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: '#9CA3AF' }}>
                <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Pedido criado em {new Date(data.expiresAt ? new Date(data.expiresAt).getTime() - 7 * 86400000 : Date.now()).toLocaleDateString('pt-AO')} · Válido por 7 dias
              </div>
            </div>
          </div>
        )}

        {/* ── ASSINADO ──────────────────────────────────────────────────── */}
        {done === 'signed' && (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={40} color="#26B870" />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1A7A3C', marginBottom: 8 }}>Documento Assinado!</div>
              <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
                A sua assinatura electrónica foi registada com sucesso. A MAIOMBE será notificada e o processo seguirá o seu curso normal.
              </div>
              <div style={{ marginTop: 20, padding: '12px 20px', background: '#F0FFF6', border: '1px solid #26B870', borderRadius: 8, display: 'inline-block', fontSize: 12, color: '#1A7A3C' }}>
                Assinado em {new Date().toLocaleString('pt-AO')}
              </div>
            </div>
          </div>
        )}

        {/* ── RECUSADO ──────────────────────────────────────────────────── */}
        {done === 'refused' && (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <XCircle size={48} color="#D43352" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Pedido Recusado</div>
              <div style={{ fontSize: 14, color: '#7888A0' }}>A sua recusa foi registada. A MAIOMBE será notificada.</div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#9CA3AF' }}>
          © {new Date().getFullYear()} MAIOMBE — Sistema de Gestão de Crédito · Todos os direitos reservados
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 4px 24px rgba(0,0,0,.1)',
  overflow: 'hidden',
};
