import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { NotFoundError } from '../utils/errors';

export class LiabilitiesService {
  list() {
    const db = getDatabase();
    return db.prepare(`
      SELECT l.*,
        (SELECT COUNT(*) FROM liability_schedules ls WHERE ls.liability_id = l.id AND ls.status = 'pago') as paid_installments,
        (SELECT COUNT(*) FROM liability_schedules ls WHERE ls.liability_id = l.id) as total_installments
      FROM liabilities l WHERE l.deleted_at IS NULL ORDER BY l.outstanding_amount DESC
    `).all();
  }

  findById(id: string) {
    const db = getDatabase();
    const liability = db.prepare('SELECT * FROM liabilities WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!liability) throw new NotFoundError('Passivo não encontrado');
    const schedule = db.prepare('SELECT * FROM liability_schedules WHERE liability_id = ? ORDER BY installment_number').all(id);
    return { ...liability, schedule };
  }

  create(data: Record<string, unknown>, userId: string) {
    const db = getDatabase();
    const id = uuidv4();
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM liabilities').get() as { cnt: number }).cnt + 1;
    const reference = `MAI/PASSIVO/${new Date().getFullYear()}/${String(count).padStart(3, '0')}`;

    db.prepare(`
      INSERT INTO liabilities (id, reference, liability_type, creditor_name, creditor_ref, total_amount,
        outstanding_amount, interest_rate, start_date, maturity_date, payment_frequency, guarantee_given,
        status, late_interest_rate, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, reference, data.liability_type, data.creditor_name, data.creditor_ref || null,
      data.total_amount, data.outstanding_amount || data.total_amount, data.interest_rate || 0,
      data.start_date, data.maturity_date || null, data.payment_frequency || null,
      data.guarantee_given || null, 'normal', data.late_interest_rate || 0, data.notes || null, userId);

    return this.findById(id);
  }

  registerAction(id: string, body: { action: string; notes: string; value?: number }) {
    const db = getDatabase();
    this.findById(id);
    let newStatus: string | null = null;
    if (body.action === 'litigio') newStatus = 'em_litigio';
    const penaltyNote = body.value ? ` | Valor: ${body.value.toLocaleString('pt-PT')} Kz` : '';
    const note = `[${body.action.toUpperCase()} ${new Date().toISOString().split('T')[0]}] ${body.notes}${penaltyNote}`;
    db.prepare(`
      UPDATE liabilities SET
        notes = CASE WHEN notes IS NULL THEN ? ELSE notes || char(10) || ? END,
        status = COALESCE(?, status),
        updated_at = ?
      WHERE id = ?
    `).run(note, note, newStatus, new Date().toISOString(), id);
    return this.findById(id);
  }

  getKpis() {
    const db = getDatabase();
    const total = db.prepare(`SELECT COALESCE(SUM(outstanding_amount), 0) as v FROM liabilities WHERE deleted_at IS NULL`).get() as { v: number };
    const avgRate = db.prepare(`
      SELECT COALESCE(AVG(interest_rate), 0) as v FROM liabilities WHERE status != 'liquidado' AND interest_rate > 0 AND deleted_at IS NULL
    `).get() as { v: number };
    const sources = db.prepare(`SELECT COUNT(*) as v FROM liabilities WHERE status NOT IN ('liquidado','cancelada') AND deleted_at IS NULL`).get() as { v: number };
    const reembolsos30d = db.prepare(`
      SELECT COALESCE(SUM(ls.total_installment), 0) as v
      FROM liability_schedules ls
      JOIN liabilities l ON l.id = ls.liability_id
      WHERE ls.status IN ('pendente','vencido','futuro')
        AND ls.due_date BETWEEN date('now') AND date('now', '+30 days')
        AND l.deleted_at IS NULL
    `).get() as { v: number };

    return {
      totalPassivo: total.v || null,
      custoMedioPassivo: avgRate.v > 0 ? Math.round(avgRate.v * 10) / 10 : null,
      fontesAtivas: sources.v,
      reembolsos30d: reembolsos30d.v || null,
    };
  }
}
