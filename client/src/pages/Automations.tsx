import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Mail, MessageSquare, Plus, Trash2, Pencil, Save, X,
  Play, Clock, Users, AlertTriangle, CheckCircle, Loader2, Copy,
  Smartphone, Check, Download,
} from 'lucide-react';
import api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import Panel from '@/components/ui/Panel';
import { formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Template {
  id: string; name: string; category: string; channel: string;
  subject: string | null; body: string; is_active: number;
  created_at: string;
}
interface Rule {
  id: string; label: string; trigger_type: string;
  days_offset: number; template_id: string | null; channel: string;
  is_active: number; template_name: string | null;
}
interface CC {
  id: string; name: string; email: string; role: string; is_active: number;
}
interface Variable { key: string; label: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  vencimento: 'Vencimento', cobranca: 'Cobrança', alerta: 'Alerta',
  pre_judicial: 'Pré-Judicial', assinatura: 'Assinatura', geral: 'Geral',
};
const CHANNEL_ICON: Record<string, JSX.Element> = {
  whatsapp: <MessageSquare size={10} style={{ verticalAlign: 'middle' }} />,
  email:    <Mail size={10} style={{ verticalAlign: 'middle' }} />,
  ambos:    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}><Smartphone size={9} /><Mail size={9} /></span>,
};
const ROLE_LABELS: Record<string, string> = {
  dir_financeiro: 'Dir. Financeiro', juridico: 'Jurídico',
  gestor_conta: 'Gestor de Conta', outro: 'Outro',
};
const CAT_COLOR: Record<string, string> = {
  vencimento: '#26B870', cobranca: '#E09020', alerta: '#7AA6FF',
  pre_judicial: '#D43352', assinatura: '#C9A84C', geral: '#7888A0',
};

const TABS = ['Templates', 'Regras de Automação', 'CC Internos', 'Logs'];

const EMPTY_TMPL = { name: '', category: 'vencimento', channel: 'email', subject: '', body: '' };

// ─── Component ────────────────────────────────────────────────────────────────
export default function Automations() {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: tmplData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data.data as { templates: Template[]; variables: Variable[] }),
  });
  const { data: rules = [] } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => api.get('/automation/rules').then(r => r.data.data as Rule[]),
  });
  const { data: ccList = [] } = useQuery({
    queryKey: ['automation-cc'],
    queryFn: () => api.get('/automation/cc').then(r => r.data.data as CC[]),
  });
  const { data: lastSent = [] } = useQuery({
    queryKey: ['automation-last-sent'],
    queryFn: () => api.get('/automation/last-sent').then(r => r.data.data as any[]),
  });
  const { data: noContact = [] } = useQuery({
    queryKey: ['clients-without-contacts'],
    queryFn: () => api.get('/automation/clients-without-contacts').then(r => r.data.data as any[]),
  });

  const templates = tmplData?.templates || [];
  const variables = tmplData?.variables || [];

  // ── Template CRUD ──────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_TMPL);
  const [showNew, setShowNew] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createTmpl = useMutation({
    mutationFn: (d: typeof EMPTY_TMPL) => api.post('/templates', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setShowNew(false); setForm(EMPTY_TMPL); setMutationError(null); },
    onError: (e: any) => setMutationError(e.response?.data?.message || 'Erro ao guardar template'),
  });
  const updateTmpl = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<Template> }) => api.put(`/templates/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setEditing(null); setMutationError(null); },
    onError: (e: any) => setMutationError(e.response?.data?.message || 'Erro ao actualizar template'),
  });
  const deleteTmpl = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
    onError: (e: any) => setMutationError(e.response?.data?.message || 'Erro ao eliminar template'),
  });
  const toggleTmpl = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: number }) => api.put(`/templates/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  // ── Rules ──────────────────────────────────────────────────────────────────
  const toggleRule = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: number }) => api.patch(`/automation/rules/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
    onError: (e: any) => setMutationError(e.response?.data?.message || 'Erro ao actualizar regra'),
  });
  const updateRuleTmpl = useMutation({
    mutationFn: ({ id, template_id, channel }: { id: string; template_id: string; channel: string }) => api.patch(`/automation/rules/${id}`, { template_id, channel }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
    onError: (e: any) => setMutationError(e.response?.data?.message || 'Erro ao actualizar regra'),
  });

  // ── CC ────────────────────────────────────────────────────────────────────
  const [ccForm, setCcForm] = useState({ name: '', email: '', role: 'gestor_conta' });
  const [showCcNew, setShowCcNew] = useState(false);
  const createCC = useMutation({
    mutationFn: (d: typeof ccForm) => api.post('/automation/cc', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-cc'] }); setShowCcNew(false); setCcForm({ name: '', email: '', role: 'gestor_conta' }); setMutationError(null); },
    onError: (e: any) => setMutationError(e.response?.data?.message || 'Erro ao adicionar CC'),
  });
  const toggleCC = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: number }) => api.patch(`/automation/cc/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-cc'] }),
  });
  const deleteCC = useMutation({
    mutationFn: (id: string) => api.delete(`/automation/cc/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-cc'] }),
  });

  // ── Run manual ────────────────────────────────────────────────────────────
  const [runResult, setRunResult] = useState<{ sent: number; skipped: number; errors: number } | null>(null);
  const runNow = useMutation({
    mutationFn: () => api.post('/automation/run'),
    onSuccess: (r) => { setRunResult(r.data.data); qc.invalidateQueries({ queryKey: ['automation-last-sent'] }); },
    onError: (e: any) => setMutationError(e.response?.data?.message || 'Erro ao executar automação'),
  });

  // ── Template form ────────────────────────────────────────────────────────
  const TemplateForm = ({ initial, onSave, onCancel }: { initial: typeof EMPTY_TMPL; onSave: (d: any) => void; onCancel: () => void }) => {
    const [f, setF] = useState(initial);
    const insertVar = (v: string) => setF(p => ({ ...p, body: p.body + v }));
    return (
      <div style={{ background: 'rgba(7,9,12,.6)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 10, padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[
            { key: 'name', label: 'Nome do Template *', type: 'text' },
          ].map(fd => (
            <div key={fd.key} style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 10, color: '#7888A0', marginBottom: 4 }}>{fd.label}</label>
              <input value={(f as any)[fd.key]} onChange={e => setF(p => ({ ...p, [fd.key]: e.target.value }))}
                style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#E5EBF2', padding: '6px 10px', fontSize: 12 }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#7888A0', marginBottom: 4 }}>Categoria</label>
            <select value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}
              style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#E5EBF2', padding: '6px 10px', fontSize: 12 }}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#7888A0', marginBottom: 4 }}>Canal</label>
            <select value={f.channel} onChange={e => setF(p => ({ ...p, channel: e.target.value }))}
              style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#E5EBF2', padding: '6px 10px', fontSize: 12 }}>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="ambos">WhatsApp + Email</option>
            </select>
          </div>
          {(f.channel === 'email' || f.channel === 'ambos') && (
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 10, color: '#7888A0', marginBottom: 4 }}>Assunto (Email)</label>
              <input value={f.subject} onChange={e => setF(p => ({ ...p, subject: e.target.value }))}
                style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#E5EBF2', padding: '6px 10px', fontSize: 12 }} />
            </div>
          )}
        </div>

        {/* Variáveis disponíveis */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9.5, color: '#7888A0', marginBottom: 6 }}>Variáveis disponíveis — clique para inserir:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {variables.map(v => (
              <button key={v.key} onClick={() => insertVar(v.key)}
                style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)', color: '#DEB96A', cursor: 'pointer' }}
                title={v.label}>
                {v.key}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, color: '#7888A0', marginBottom: 4 }}>Mensagem / Corpo *</label>
          <textarea value={f.body} onChange={e => setF(p => ({ ...p, body: e.target.value }))} rows={7}
            style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#E5EBF2', padding: '8px 10px', fontSize: 12, resize: 'vertical', fontFamily: 'monospace' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid rgba(120,136,160,.2)', borderRadius: 6, color: '#7888A0', padding: '6px 12px', cursor: 'pointer', fontSize: 11 }}>
            <X size={12} /> Cancelar
          </button>
          <button onClick={() => onSave(f)} disabled={!f.name || !f.body}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 6, color: '#26B870', padding: '6px 14px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
            <Save size={12} /> Guardar Template
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <TopBar title="Automação de Notificações" breadcrumb="MAIOMBE / Automação" />
      <div className="ct">

        {/* Erros de mutação */}
        {mutationError && (
          <div style={{ padding: '10px 14px', background: 'rgba(212,51,82,.1)', border: '1px solid rgba(212,51,82,.3)', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={13} color="#D43352" />
            <span style={{ fontSize: 11, color: '#D43352', flex: 1 }}>{mutationError}</span>
            <button onClick={() => setMutationError(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7888A0', fontSize: 14, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Aviso de clientes sem contactos */}
        {noContact.length > 0 && (
          <div style={{ padding: '12px 16px', background: 'rgba(212,51,82,.1)', border: '1px solid rgba(212,51,82,.3)', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertTriangle size={16} color="#D43352" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#D43352', marginBottom: 4 }}>
                {noContact.length} cliente{noContact.length > 1 ? 's' : ''} sem telefone nem email — as notificações automáticas não serão enviadas
              </div>
              <div style={{ fontSize: 10, color: '#7888A0' }}>
                {noContact.map((c: any) => c.name).join(' · ')}
              </div>
              <div style={{ fontSize: 10, color: '#E09020', marginTop: 4 }}>Aceda a Clientes → edite cada cliente e adicione os contactos.</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid rgba(201,168,76,.1)', paddingBottom: 0 }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              style={{ padding: '8px 16px', fontSize: 11, fontWeight: tab === i ? 700 : 400, cursor: 'pointer', border: 'none', borderBottom: tab === i ? '2px solid #26B870' : '2px solid transparent', background: 'transparent', color: tab === i ? '#26B870' : '#7888A0', borderRadius: '6px 6px 0 0' }}>
              {t}
              {t === 'CC Internos' && ccList.length > 0 && <span style={{ marginLeft: 5, fontSize: 9, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 10, padding: '1px 5px', color: '#26B870' }}>{ccList.filter((c: CC) => c.is_active).length}</span>}
            </button>
          ))}
        </div>

        {/* ── TAB 0: TEMPLATES ─────────────────────────────────────────────── */}
        {tab === 0 && (
          <Panel title="Templates de Mensagem" tag={`${templates.length} templates`}
            actions={
              <button onClick={() => { setShowNew(true); setForm(EMPTY_TMPL); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(38,184,112,.12)', border: '1px solid rgba(38,184,112,.25)', borderRadius: 6, color: '#26B870', padding: '4px 10px', fontSize: 9.5, cursor: 'pointer' }}>
                <Plus size={11} /> Novo Template
              </button>
            }>
            {showNew && (
              <div style={{ padding: '14px 14px 0' }}>
                <TemplateForm initial={form} onSave={d => createTmpl.mutate(d)} onCancel={() => setShowNew(false)} />
              </div>
            )}
            {editing && (
              <div style={{ padding: '14px 14px 0' }}>
                <TemplateForm
                  initial={{ name: editing.name, category: editing.category, channel: editing.channel, subject: editing.subject || '', body: editing.body }}
                  onSave={d => updateTmpl.mutate({ id: editing.id, d })}
                  onCancel={() => setEditing(null)} />
              </div>
            )}
            <div style={{ padding: '10px 0' }}>
              {templates.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#7888A0', fontSize: 11 }}>Nenhum template. Clique em "+ Novo Template" para criar.</div>}
              {templates.map(t => (
                <div key={t.id} style={{ padding: '12px 14px', borderBottom: '1px solid rgba(201,168,76,.06)', opacity: t.is_active ? 1 : 0.45 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#E5EBF2' }}>{t.name}</span>
                        <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 10, background: `${CAT_COLOR[t.category] || '#7888A0'}18`, color: CAT_COLOR[t.category] || '#7888A0', border: `1px solid ${CAT_COLOR[t.category] || '#7888A0'}33` }}>
                          {CATEGORY_LABELS[t.category]}
                        </span>
                        <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 10, background: 'rgba(120,136,160,.1)', color: '#7888A0', border: '1px solid rgba(120,136,160,.15)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          {CHANNEL_ICON[t.channel]} {t.channel}
                        </span>
                        {!t.is_active && <span style={{ fontSize: 9, color: '#7888A0' }}>— Inactivo</span>}
                      </div>
                      {t.subject && <div style={{ fontSize: 10, color: '#C9A84C', marginBottom: 4 }}>Assunto: {t.subject}</div>}
                      <div style={{ fontSize: 10, color: '#7888A0', lineHeight: 1.5, whiteSpace: 'pre-line', maxHeight: 48, overflow: 'hidden' }}>
                        {t.body.substring(0, 120)}{t.body.length > 120 ? '…' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button onClick={() => toggleTmpl.mutate({ id: t.id, is_active: t.is_active ? 0 : 1 })}
                        style={{ padding: '3px 7px', background: t.is_active ? 'rgba(38,184,112,.1)' : 'rgba(120,136,160,.1)', border: `1px solid ${t.is_active ? 'rgba(38,184,112,.2)' : 'rgba(120,136,160,.2)'}`, borderRadius: 5, cursor: 'pointer', color: t.is_active ? '#26B870' : '#7888A0', fontSize: 9 }}>
                        {t.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                      <button onClick={() => setEditing(t)}
                        style={{ padding: '3px 7px', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 5, cursor: 'pointer', color: '#DEB96A', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Pencil size={9} /> Editar
                      </button>
                      <button onClick={() => { setForm({ name: t.name + ' (cópia)', category: t.category, channel: t.channel, subject: t.subject || '', body: t.body }); setShowNew(true); }}
                        style={{ padding: '3px 7px', background: 'rgba(120,136,160,.08)', border: '1px solid rgba(120,136,160,.15)', borderRadius: 5, cursor: 'pointer', color: '#7888A0', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Copy size={9} />
                      </button>
                      <button onClick={() => { if (window.confirm('Eliminar este template?')) deleteTmpl.mutate(t.id); }}
                        style={{ padding: '3px 7px', background: 'rgba(212,51,82,.08)', border: '1px solid rgba(212,51,82,.15)', borderRadius: 5, cursor: 'pointer', color: '#D43352', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Trash2 size={9} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* ── TAB 1: REGRAS DE AUTOMAÇÃO ────────────────────────────────────── */}
        {tab === 1 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Preventivos */}
              <Panel title="Alertas Preventivos" tag="Antes do Vencimento">
                {rules.filter(r => r.trigger_type === 'preventive').map(r => (
                  <RuleRow key={r.id} rule={r} templates={templates} onToggle={toggleRule} onUpdate={updateRuleTmpl} />
                ))}
              </Panel>
              {/* Pós-Incumprimento */}
              <Panel title="Alertas Pós-Incumprimento" tag="Após Vencimento">
                {rules.filter(r => r.trigger_type === 'post_default').map(r => (
                  <RuleRow key={r.id} rule={r} templates={templates} onToggle={toggleRule} onUpdate={updateRuleTmpl} />
                ))}
              </Panel>
            </div>

            {/* Executar agora */}
            <Panel title="Execução Manual" style={{ marginTop: 14 }}>
              <div style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, fontSize: 11, color: '#7888A0', lineHeight: 1.6 }}>
                  O sistema corre automaticamente todos os dias às <strong style={{ color: '#DEB96A' }}>09:00</strong> (hora de Angola).<br />
                  Pode também executar manualmente para forçar o envio imediato de todas as regras activas.
                </div>
                <button onClick={() => runNow.mutate()} disabled={runNow.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 8, color: '#26B870', padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {runNow.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
                  Executar Agora
                </button>
              </div>
              {runResult && (
                <div style={{ margin: '0 14px 14px', padding: '10px 14px', background: 'rgba(38,184,112,.08)', border: '1px solid rgba(38,184,112,.2)', borderRadius: 8, display: 'flex', gap: 20 }}>
                  <span style={{ fontSize: 11, color: '#26B870', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> {runResult.sent} enviados</span>
                  {runResult.skipped > 0 && <span style={{ fontSize: 11, color: '#E09020', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> {runResult.skipped} sem contacto</span>}
                  {runResult.errors  > 0 && <span style={{ fontSize: 11, color: '#D43352', display: 'flex', alignItems: 'center', gap: 4 }}><X size={12} /> {runResult.errors} erros</span>}
                </div>
              )}
            </Panel>
          </>
        )}

        {/* ── TAB 2: CC INTERNOS ────────────────────────────────────────────── */}
        {tab === 2 && (
          <Panel title="Cópia Automática (CC) em Emails" tag="Destinatários Internos"
            actions={
              <button onClick={() => setShowCcNew(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(38,184,112,.12)', border: '1px solid rgba(38,184,112,.25)', borderRadius: 6, color: '#26B870', padding: '4px 10px', fontSize: 9.5, cursor: 'pointer' }}>
                <Plus size={11} /> Adicionar CC
              </button>
            }>
            <div style={{ padding: '12px 14px', fontSize: 11, color: '#7888A0', background: 'rgba(122,166,255,.05)', borderBottom: '1px solid rgba(201,168,76,.06)' }}>
              Todos os emails de cobrança automáticos serão enviados em cópia para estes destinatários internos.
            </div>
            {showCcNew && (
              <div style={{ padding: 14, borderBottom: '1px solid rgba(201,168,76,.08)', background: 'rgba(7,9,12,.4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {[
                    { key: 'name', label: 'Nome *', placeholder: 'João Silva' },
                    { key: 'email', label: 'Email *', placeholder: 'joao@maiombe.ao' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 10, color: '#7888A0', marginBottom: 3 }}>{f.label}</label>
                      <input value={(ccForm as any)[f.key]} placeholder={f.placeholder} onChange={e => setCcForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#E5EBF2', padding: '5px 9px', fontSize: 12 }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#7888A0', marginBottom: 3 }}>Cargo</label>
                    <select value={ccForm.role} onChange={e => setCcForm(p => ({ ...p, role: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#E5EBF2', padding: '5px 9px', fontSize: 12 }}>
                      {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowCcNew(false)} style={{ background: 'transparent', border: '1px solid rgba(120,136,160,.2)', borderRadius: 6, color: '#7888A0', padding: '5px 10px', cursor: 'pointer', fontSize: 10 }}>Cancelar</button>
                  <button onClick={() => createCC.mutate(ccForm)} disabled={!ccForm.name || !ccForm.email}
                    style={{ background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 6, color: '#26B870', padding: '5px 12px', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                    Adicionar
                  </button>
                </div>
              </div>
            )}
            {ccList.length === 0 && !showCcNew && (
              <div style={{ padding: 24, textAlign: 'center', color: '#7888A0', fontSize: 11 }}>Nenhum destinatário em CC. Adicione o Director Financeiro, Jurídico ou Gestor de Conta.</div>
            )}
            {ccList.map((c: CC) => (
              <div key={c.id} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(201,168,76,.05)', display: 'flex', alignItems: 'center', gap: 10, opacity: c.is_active ? 1 : 0.4 }}>
                <Users size={14} color={c.is_active ? '#26B870' : '#7888A0'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#E5EBF2' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: '#7888A0' }}>{c.email} · {ROLE_LABELS[c.role] || c.role}</div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => toggleCC.mutate({ id: c.id, is_active: c.is_active ? 0 : 1 })}
                    style={{ padding: '3px 8px', background: c.is_active ? 'rgba(38,184,112,.1)' : 'rgba(120,136,160,.1)', border: `1px solid ${c.is_active ? 'rgba(38,184,112,.2)' : 'rgba(120,136,160,.2)'}`, borderRadius: 5, cursor: 'pointer', color: c.is_active ? '#26B870' : '#7888A0', fontSize: 9 }}>
                    {c.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                  <button onClick={() => { if (window.confirm('Remover?')) deleteCC.mutate(c.id); }}
                    style={{ padding: '3px 7px', background: 'rgba(212,51,82,.08)', border: '1px solid rgba(212,51,82,.15)', borderRadius: 5, cursor: 'pointer', color: '#D43352', fontSize: 9 }}>
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            ))}
          </Panel>
        )}

        {/* ── TAB 3: LOGS ─────────────────────────────────────────────────── */}
        {tab === 3 && (
          <Panel title="Últimos Envios Automáticos" tag={`${lastSent.length} registos`}>
            {lastSent.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#7888A0', fontSize: 11 }}>Nenhum envio registado ainda. Execute a automação para ver os logs aqui.</div>
            )}
            {lastSent.map((l: any, i: number) => (
              <div key={i} style={{ padding: '11px 14px', borderBottom: '1px solid rgba(201,168,76,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ marginTop: 2 }}>
                    {l.channel === 'alerta' ? <Bell size={13} color="#7AA6FF" /> : <Mail size={13} color="#E09020" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#E5EBF2', marginBottom: 2 }}>
                      Para: <strong>{l.recipient_name || l.recipient_email}</strong>
                      {l.recipient_email && l.recipient_name && <span style={{ color: '#7888A0' }}> · {l.recipient_email}</span>}
                    </div>
                    {l.subject && <div style={{ fontSize: 10, color: '#C9A84C', marginBottom: 2 }}>Assunto: {l.subject}</div>}
                    <div style={{ fontSize: 9, color: '#7888A0' }}>
                      {formatDate(l.created_at)} às {new Date(l.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 10, background: l.status === 'sent' ? 'rgba(38,184,112,.1)' : 'rgba(212,51,82,.1)', color: l.status === 'sent' ? '#26B870' : '#D43352', border: `1px solid ${l.status === 'sent' ? 'rgba(38,184,112,.2)' : 'rgba(212,51,82,.2)'}` }}>
                        {l.status === 'sent' ? 'Enviado' : 'Falhou'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Panel>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── RuleRow sub-component ────────────────────────────────────────────────────
function RuleRow({ rule, templates, onToggle, onUpdate }: {
  rule: Rule;
  templates: Template[];
  onToggle: any;
  onUpdate: any;
}) {
  const [editMode, setEditMode] = useState(false);
  const [tmplId, setTmplId] = useState(rule.template_id || '');
  const [chan, setChan]   = useState(rule.channel);

  const isPost = rule.trigger_type === 'post_default';
  const label  = isPost
    ? rule.label
    : `${rule.days_offset}d antes`;

  const severityColor = isPost
    ? (rule.days_offset >= 15 ? '#D43352' : rule.days_offset >= 7 ? '#E09020' : '#7AA6FF')
    : (rule.days_offset <= 3  ? '#E09020' : '#26B870');

  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(201,168,76,.05)', opacity: rule.is_active ? 1 : 0.4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: editMode ? 10 : 0 }}>
        <button
          onClick={() => onToggle.mutate({ id: rule.id, is_active: rule.is_active ? 0 : 1 })}
          style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: rule.is_active ? '#26B870' : 'rgba(120,136,160,.3)', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: rule.is_active ? 19 : 3, transition: 'left .2s' }} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: severityColor, minWidth: 90 }}>{label}</span>
        <span style={{ fontSize: 9, color: '#7888A0', flex: 1 }}>{rule.template_name || '— sem template —'}</span>
        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: 'rgba(120,136,160,.1)', color: '#7888A0', border: '1px solid rgba(120,136,160,.15)', display: 'flex', alignItems: 'center', gap: 3 }}>
          {CHANNEL_ICON[rule.channel]} {rule.channel}
        </span>
        <button onClick={() => setEditMode(e => !e)}
          style={{ padding: '2px 6px', background: 'transparent', border: '1px solid rgba(201,168,76,.15)', borderRadius: 4, cursor: 'pointer', color: '#DEB96A', fontSize: 9 }}>
          <Pencil size={9} />
        </button>
      </div>
      {editMode && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 9, color: '#7888A0', marginBottom: 3 }}>Template</label>
            <select value={tmplId} onChange={e => setTmplId(e.target.value)}
              style={{ width: '100%', background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 5, color: '#E5EBF2', padding: '4px 8px', fontSize: 10 }}>
              <option value="">— sem template —</option>
              {templates.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 9, color: '#7888A0', marginBottom: 3 }}>Canal</label>
            <select value={chan} onChange={e => setChan(e.target.value)}
              style={{ background: 'rgba(7,9,12,.5)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 5, color: '#E5EBF2', padding: '4px 8px', fontSize: 10 }}>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>
          <button onClick={() => { onUpdate.mutate({ id: rule.id, template_id: tmplId, channel: chan }); setEditMode(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(38,184,112,.15)', border: '1px solid rgba(38,184,112,.3)', borderRadius: 5, color: '#26B870', padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
            <CheckCircle size={11} /> Guardar
          </button>
        </div>
      )}
    </div>
  );
}
