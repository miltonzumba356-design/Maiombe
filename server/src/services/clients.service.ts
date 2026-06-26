import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { NotFoundError } from '../utils/errors';

export class ClientsService {
  list(filters: { entity_type?: string; search?: string; page?: number; limit?: number }) {
    const db = getDatabase();
    const { entity_type, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const where = ['deleted_at IS NULL', 'is_active = 1'];
    const params: unknown[] = [];

    if (entity_type) { where.push('entity_type = ?'); params.push(entity_type); }
    if (search) { where.push('(name LIKE ? OR nif LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const whereStr = where.join(' AND ');
    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM clients WHERE ${whereStr}`).get(...params) as { cnt: number }).cnt;
    const data = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM contracts ct WHERE ct.client_id = c.id AND ct.deleted_at IS NULL) as total_contracts,
        (SELECT COALESCE(SUM(amount), 0) FROM contracts ct WHERE ct.client_id = c.id AND ct.status = 'recebidos' AND ct.deleted_at IS NULL) as total_exposure
      FROM clients c WHERE ${whereStr}
      ORDER BY total_exposure DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { data, total, page, limit };
  }

  findById(id: string) {
    const db = getDatabase();
    const client = db.prepare('SELECT * FROM clients WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!client) throw new NotFoundError('Cliente não encontrado');

    const contracts = db.prepare(`
      SELECT id, reference, amount, interest_rate, status, celebration_date
      FROM contracts WHERE client_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
    `).all(id);

    const riskHistory = db.prepare(`
      SELECT * FROM risk_assessments WHERE client_id = ? ORDER BY assessed_at DESC LIMIT 5
    `).all(id);

    return { ...client, contracts, riskHistory };
  }

  create(data: Record<string, unknown>, userId: string) {
    const db = getDatabase();
    const id = uuidv4();
    const code = `CLI-${String((db.prepare('SELECT COUNT(*) as cnt FROM clients').get() as { cnt: number }).cnt + 1).padStart(3, '0')}`;

    db.prepare(`
      INSERT INTO clients (id, code, name, nif, entity_type, legal_representative, address, province, email, phone, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, data.name, data.nif, data.entity_type,
      data.legal_representative || null, data.address || null, data.province || null,
      data.email || null, data.phone || null, userId);

    return this.findById(id);
  }

  update(id: string, data: Record<string, unknown>) {
    const db = getDatabase();
    this.findById(id);
    db.prepare(`
      UPDATE clients SET name = COALESCE(?, name), email = COALESCE(?, email),
        phone = COALESCE(?, phone), address = COALESCE(?, address),
        risk_rating = COALESCE(?, risk_rating), risk_score = COALESCE(?, risk_score),
        updated_at = ? WHERE id = ?
    `).run(data.name || null, data.email || null, data.phone || null, data.address || null,
      data.risk_rating || null, data.risk_score || null, new Date().toISOString(), id);
    return this.findById(id);
  }
}
