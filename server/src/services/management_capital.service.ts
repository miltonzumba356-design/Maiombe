import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { NotFoundError } from '../utils/errors';

function generateMCReference(): string {
  const year = new Date().getFullYear();
  const db = getDatabase();
  const count = (db.prepare(`
    SELECT COUNT(*) as cnt FROM management_capital WHERE reference LIKE 'MC-${year}-%'
  `).get() as { cnt: number }).cnt;
  return `MC-${year}-${String(count + 1).padStart(3, '0')}`;
}

export class ManagementCapitalService {
  list() {
    const db = getDatabase();
    return db.prepare(`
      SELECT m.*, u.name as created_by_name
      FROM management_capital m
      LEFT JOIN users u ON u.id = m.created_by
      ORDER BY m.received_at DESC
    `).all();
  }

  findById(id: string) {
    const db = getDatabase();
    const item = db.prepare(`
      SELECT m.*, u.name as created_by_name
      FROM management_capital m
      LEFT JOIN users u ON u.id = m.created_by
      WHERE m.id = ?
    `).get(id);
    if (!item) throw new NotFoundError('Registro de capital não encontrado');
    return item;
  }

  create(data: { provider_name: string; amount: number; category: string; received_at: string; notes?: string }, userId: string) {
    const db = getDatabase();
    const id = uuidv4();
    const reference = generateMCReference();

    db.prepare(`
      INSERT INTO management_capital (id, reference, provider_name, amount, category, received_at, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, reference, data.provider_name, data.amount, data.category, data.received_at, data.notes || null, userId);

    return this.findById(id);
  }

  getKpis() {
    const db = getDatabase();
    
    const total = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as value FROM management_capital
    `).get() as { value: number };

    const byCategory = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
      FROM management_capital
      GROUP BY category
    `).all() as Array<{ category: string; amount: number; count: number }>;

    return {
      totalCapital: total.value,
      byCategory,
    };
  }
}
