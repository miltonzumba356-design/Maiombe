import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { NotFoundError } from '../utils/errors';

export class GuaranteesService {
  list(filters: { contract_id?: string; status?: string } = {}) {
    const db = getDatabase();
    const where = ['g.deleted_at IS NULL'];
    const params: unknown[] = [];
    if (filters.contract_id) { where.push('g.contract_id = ?'); params.push(filters.contract_id); }
    if (filters.status) { where.push('g.status = ?'); params.push(filters.status); }

    return db.prepare(`
      SELECT g.*, c.reference as contract_reference, cl.name as client_name
      FROM guarantees g
      JOIN contracts c ON c.id = g.contract_id
      JOIN clients cl ON cl.id = c.client_id
      WHERE ${where.join(' AND ')}
      ORDER BY g.expiry_date ASC
    `).all(...params);
  }

  findById(id: string) {
    const db = getDatabase();
    const g = db.prepare(`
      SELECT g.*, c.reference as contract_reference, cl.name as client_name
      FROM guarantees g
      JOIN contracts c ON c.id = g.contract_id
      JOIN clients cl ON cl.id = c.client_id
      WHERE g.id = ? AND g.deleted_at IS NULL
    `).get(id);
    if (!g) throw new NotFoundError('Garantia não encontrada');
    return g;
  }

  create(data: Record<string, unknown>, userId: string) {
    const db = getDatabase();
    const id = uuidv4();
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM guarantees').get() as { cnt: number }).cnt + 1;
    const reference = `GAR-${String(count).padStart(3, '0')}`;

    db.prepare(`
      INSERT INTO guarantees (id, reference, contract_id, guarantee_type, guarantor, value, coverage_percentage,
        start_date, expiry_date, status, auto_renewal, renewal_alert_days, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, reference, data.contract_id, data.guarantee_type, data.guarantor, data.value,
      data.coverage_percentage || null, data.start_date, data.expiry_date, 'activa',
      data.auto_renewal ? 1 : 0, data.renewal_alert_days || 30, data.notes || null, userId);

    return this.findById(id);
  }

  update(id: string, data: Record<string, unknown>) {
    const db = getDatabase();
    this.findById(id);
    db.prepare(`
      UPDATE guarantees SET status = COALESCE(?, status), expiry_date = COALESCE(?, expiry_date),
        notes = COALESCE(?, notes), updated_at = ? WHERE id = ?
    `).run(data.status || null, data.expiry_date || null, data.notes || null, new Date().toISOString(), id);
    return this.findById(id);
  }

  getKpis() {
    const db = getDatabase();
    const total = db.prepare(`SELECT COUNT(*) as v FROM guarantees WHERE status = 'activa' AND deleted_at IS NULL`).get() as { v: number };
    const expiring = db.prepare(`
      SELECT COUNT(*) as v FROM guarantees
      WHERE status = 'activa' AND expiry_date <= date('now', '+30 days') AND deleted_at IS NULL
    `).get() as { v: number };
    const totalValue = db.prepare(`SELECT COALESCE(SUM(value), 0) as v FROM guarantees WHERE status = 'activa' AND deleted_at IS NULL`).get() as { v: number };
    const executed = db.prepare(`SELECT COUNT(*) as v FROM guarantees WHERE status = 'em_execucao' AND deleted_at IS NULL`).get() as { v: number };

    return {
      garantiasAtivas: total.v,
      aRenovar: expiring.v,
      valorTotal: totalValue.v,
      executadas: executed.v,
    };
  }
}
