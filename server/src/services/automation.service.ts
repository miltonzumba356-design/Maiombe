import { getDatabase } from '../database/connection';
import { NotificationService } from './notification.service';
import { renderTemplate } from './template.service';
import { logger } from '../utils/logger';

const notif = new NotificationService();

function fmtKz(v: number) {
  return new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(v);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-PT');
}

interface DueRow {
  schedule_id: string; contract_id: string; reference: string;
  installment_number: number; due_date: string;
  total_installment: number; status: string;
  client_name: string; client_phone: string | null; client_email: string | null;
  late_interest_rate: number;
}

export class AutomationService {
  // ── Executa todas as regras activas para a data de hoje ─────────────────────
  async runDaily(): Promise<{ sent: number; skipped: number; errors: number }> {
    const db = getDatabase();
    const stats = { sent: 0, skipped: 0, errors: 0 };

    const rules = db.prepare(`
      SELECT r.*, t.body as tmpl_body, t.subject as tmpl_subject, t.channel as tmpl_channel
      FROM automation_rules r
      JOIN notification_templates t ON t.id = r.template_id
      WHERE r.is_active = 1 AND t.is_active = 1
      ORDER BY r.trigger_type, r.days_offset
    `).all() as any[];

    const activeCC = (db.prepare('SELECT email FROM automation_cc WHERE is_active=1').all() as any[]).map(r => r.email);

    for (const rule of rules) {
      let rows: DueRow[] = [];

      if (rule.trigger_type === 'preventive') {
        // Prestações que vencem exactamente daqui a X dias
        rows = db.prepare(`
          SELECT a.id as schedule_id, a.contract_id, c.reference, a.installment_number,
            a.due_date, a.total_installment, a.status,
            cl.name as client_name, cl.phone as client_phone, cl.email as client_email,
            c.late_interest_rate
          FROM amortization_schedules a
          JOIN contracts c ON c.id = a.contract_id
          JOIN clients cl ON cl.id = c.client_id
          WHERE a.status IN ('pendente')
            AND date(a.due_date) = date('now', '+' || ? || ' days')
            AND c.status = 'recebidos'
            AND c.deleted_at IS NULL
        `).all(rule.days_offset) as DueRow[];
      } else {
        // Prestações vencidas há exactamente X dias
        rows = db.prepare(`
          SELECT a.id as schedule_id, a.contract_id, c.reference, a.installment_number,
            a.due_date, a.total_installment, a.status,
            cl.name as client_name, cl.phone as client_phone, cl.email as client_email,
            c.late_interest_rate
          FROM amortization_schedules a
          JOIN contracts c ON c.id = a.contract_id
          JOIN clients cl ON cl.id = c.client_id
          WHERE a.status = 'vencido'
            AND date(a.due_date) = date('now', '-' || ? || ' days')
            AND c.status = 'recebidos'
            AND c.deleted_at IS NULL
        `).all(rule.days_offset) as DueRow[];
      }

      for (const row of rows) {
        const daysRestantes = rule.trigger_type === 'preventive' ? rule.days_offset : 0;
        const diasAtraso    = rule.trigger_type === 'post_default' ? rule.days_offset : 0;
        const moraRate      = row.late_interest_rate || 0.05;
        const mora          = row.total_installment * (moraRate / 100) * diasAtraso;

        const vars: Record<string, string | number> = {
          nome_cliente:      row.client_name,
          referencia:        row.reference,
          numero_prestacao:  row.installment_number,
          valor_prestacao:   fmtKz(row.total_installment),
          data_vencimento:   fmtDate(row.due_date),
          dias_restantes:    daysRestantes,
          dias_atraso:       diasAtraso,
          valor_mora:        fmtKz(mora),
          valor_total_divida: fmtKz(row.total_installment + mora),
          taxa_mora:         moraRate,
        };

        const body    = renderTemplate(rule.tmpl_body,    vars);
        const subject = rule.tmpl_subject ? renderTemplate(rule.tmpl_subject, vars) : undefined;

        const channel: string = rule.channel || rule.tmpl_channel || 'ambos';

        try {
          // WhatsApp
          if ((channel === 'whatsapp' || channel === 'ambos') && row.client_phone) {
            const r = await notif.sendWhatsApp({
              phone: row.client_phone,
              message: body,
              contractId: row.contract_id,
              channel: rule.trigger_type === 'preventive' ? 'alerta' : 'cobranca',
              recipientName: row.client_name,
            });
            if (r.ok) stats.sent++; else stats.errors++;
          }

          // Email ao cliente
          if ((channel === 'email' || channel === 'ambos') && row.client_email) {
            const r = await notif.sendEmail({
              to: row.client_email,
              subject: subject || `MAIOMBE · ${row.reference}`,
              title:   subject || `MAIOMBE · ${row.reference}`,
              body,
              contractId: row.contract_id,
              channel: rule.trigger_type === 'preventive' ? 'alerta' : 'cobranca',
              recipientName: row.client_name,
              ccList: activeCC,
            });
            if (r.ok) stats.sent++; else stats.errors++;
          }

          if (!row.client_phone && !row.client_email) {
            stats.skipped++;
            logger.warn(`[Automation] Sem contactos para ${row.client_name} — contrato ${row.reference}`);
          }
        } catch (e: any) {
          stats.errors++;
          logger.error(`[Automation] Erro ao enviar para ${row.client_name}: ${e.message}`);
        }
      }
    }

    logger.info(`[Automation] runDaily: ${stats.sent} enviados, ${stats.skipped} sem contacto, ${stats.errors} erros`);
    return stats;
  }

  // ── Último envio de cada regra ───────────────────────────────────────────────
  lastSentPerRule() {
    const db = getDatabase();
    return db.prepare(`
      SELECT nl.channel, nl.created_at, nl.recipient_name, nl.recipient_email,
             nl.subject, nl.status, nl.contract_id
      FROM notification_logs nl
      WHERE nl.channel IN ('cobranca','alerta')
      ORDER BY nl.created_at DESC
      LIMIT 20
    `).all();
  }

  // ── Validação: clientes sem contactos nos contratos activos ─────────────────
  clientsWithoutContacts() {
    const db = getDatabase();
    return db.prepare(`
      SELECT DISTINCT cl.id, cl.name, cl.phone, cl.email, cl.entity_type,
        COUNT(c.id) as total_contratos
      FROM clients cl
      JOIN contracts c ON c.client_id = cl.id AND c.deleted_at IS NULL
      WHERE (cl.phone IS NULL OR cl.phone = '') AND (cl.email IS NULL OR cl.email = '')
      GROUP BY cl.id
      ORDER BY cl.name
    `).all();
  }
}
