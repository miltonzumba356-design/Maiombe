import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';

export type TemplateCategory = 'cobranca' | 'alerta' | 'vencimento' | 'pre_judicial' | 'assinatura' | 'geral';
export type TemplateChannel = 'whatsapp' | 'email' | 'ambos';

export interface NotificationTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  channel: TemplateChannel;
  subject: string | null;
  body: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Variáveis disponíveis nos templates
export const TEMPLATE_VARIABLES = [
  { key: '{{nome_cliente}}',       label: 'Nome do Cliente' },
  { key: '{{referencia}}',          label: 'Referência do Contrato' },
  { key: '{{numero_prestacao}}',    label: 'Número da Prestação' },
  { key: '{{valor_prestacao}}',     label: 'Valor da Prestação (Kz)' },
  { key: '{{data_vencimento}}',     label: 'Data de Vencimento' },
  { key: '{{dias_restantes}}',      label: 'Dias até Vencimento' },
  { key: '{{dias_atraso}}',         label: 'Dias em Atraso' },
  { key: '{{valor_mora}}',          label: 'Juros de Mora (Kz)' },
  { key: '{{valor_total_divida}}',  label: 'Total em Dívida (Kz)' },
  { key: '{{taxa_mora}}',           label: 'Taxa de Mora (%/dia)' },
];

// Substitui variáveis no corpo/assunto do template
export function renderTemplate(text: string, vars: Record<string, string | number>): string {
  let result = text;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, String(val));
  }
  return result;
}

export class TemplateService {
  list(category?: string, channel?: string) {
    const db = getDatabase();
    let q = 'SELECT * FROM notification_templates WHERE 1=1';
    const params: any[] = [];
    if (category) { q += ' AND category=?'; params.push(category); }
    if (channel)  { q += ' AND channel=?';  params.push(channel); }
    q += ' ORDER BY category, name';
    return db.prepare(q).all(...params) as NotificationTemplate[];
  }

  getById(id: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM notification_templates WHERE id=?').get(id) as NotificationTemplate | undefined;
  }

  create(data: { name: string; category: TemplateCategory; channel: TemplateChannel; subject?: string; body: string }, userId: string) {
    const db = getDatabase();
    const id  = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO notification_templates (id,name,category,channel,subject,body,is_active,created_at,updated_at,created_by)
      VALUES (?,?,?,?,?,?,1,?,?,?)`)
      .run(id, data.name, data.category, data.channel, data.subject || null, data.body, now, now, userId);
    return this.getById(id)!;
  }

  update(id: string, data: Partial<{ name: string; category: TemplateCategory; channel: TemplateChannel; subject: string; body: string; is_active: number }>) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at=?'];
    const params: any[] = [now];
    if (data.name      !== undefined) { sets.push('name=?');      params.push(data.name); }
    if (data.category  !== undefined) { sets.push('category=?');  params.push(data.category); }
    if (data.channel   !== undefined) { sets.push('channel=?');   params.push(data.channel); }
    if (data.subject   !== undefined) { sets.push('subject=?');   params.push(data.subject || null); }
    if (data.body      !== undefined) { sets.push('body=?');      params.push(data.body); }
    if (data.is_active !== undefined) { sets.push('is_active=?'); params.push(data.is_active); }
    params.push(id);
    db.prepare(`UPDATE notification_templates SET ${sets.join(',')} WHERE id=?`).run(...params);
    return this.getById(id);
  }

  delete(id: string) {
    const db = getDatabase();
    db.prepare('DELETE FROM notification_templates WHERE id=?').run(id);
  }

  // Regras de automação
  listRules() {
    const db = getDatabase();
    return db.prepare(`
      SELECT r.*, t.name as template_name, t.channel as template_channel
      FROM automation_rules r
      LEFT JOIN notification_templates t ON t.id = r.template_id
      ORDER BY r.trigger_type, r.days_offset
    `).all();
  }

  updateRule(id: string, data: { template_id?: string; channel?: string; is_active?: number }) {
    const db = getDatabase();
    const sets: string[] = [];
    const params: any[] = [];
    if (data.template_id !== undefined) { sets.push('template_id=?'); params.push(data.template_id); }
    if (data.channel     !== undefined) { sets.push('channel=?');     params.push(data.channel); }
    if (data.is_active   !== undefined) { sets.push('is_active=?');   params.push(data.is_active); }
    if (!sets.length) return;
    params.push(id);
    db.prepare(`UPDATE automation_rules SET ${sets.join(',')} WHERE id=?`).run(...params);
  }

  // CC recipients
  listCC() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM automation_cc ORDER BY role, name').all();
  }

  createCC(data: { name: string; email: string; role: string }) {
    const db = getDatabase();
    const id = uuidv4();
    db.prepare('INSERT INTO automation_cc (id,name,email,role) VALUES (?,?,?,?)').run(id, data.name, data.email, data.role);
    return db.prepare('SELECT * FROM automation_cc WHERE id=?').get(id);
  }

  updateCC(id: string, data: { name?: string; email?: string; role?: string; is_active?: number }) {
    const db = getDatabase();
    const sets: string[] = [];
    const params: any[] = [];
    if (data.name      !== undefined) { sets.push('name=?');      params.push(data.name); }
    if (data.email     !== undefined) { sets.push('email=?');      params.push(data.email); }
    if (data.role      !== undefined) { sets.push('role=?');       params.push(data.role); }
    if (data.is_active !== undefined) { sets.push('is_active=?');  params.push(data.is_active); }
    if (!sets.length) return;
    params.push(id);
    db.prepare(`UPDATE automation_cc SET ${sets.join(',')} WHERE id=?`).run(...params);
  }

  deleteCC(id: string) {
    const db = getDatabase();
    db.prepare('DELETE FROM automation_cc WHERE id=?').run(id);
  }
}
