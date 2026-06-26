import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { NotFoundError } from '../utils/errors';

export class SecuritiesService {
  private policyStore = {
    maxDiscount: 15,
    maxMaturity: '5_anos',
    minYield: 11,
    minCashPercentage: 30,
    acceptBT: true,
    authorizedEntities: ['governo_central', 'ministerio', 'governo_provincial'],
  };
  list(filters: { status?: string; security_type?: string } = {}) {
    const db = getDatabase();
    const where = ['1=1'];
    const params: unknown[] = [];
    if (filters.status) { where.push('s.status = ?'); params.push(filters.status); }
    if (filters.security_type) { where.push('s.security_type = ?'); params.push(filters.security_type); }

    return db.prepare(`
      SELECT s.*, cl.name as client_name, c.reference as contract_reference
      FROM securities s
      JOIN clients cl ON cl.id = s.client_id
      JOIN contracts c ON c.id = s.contract_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.received_at DESC
    `).all(...params);
  }

  findById(id: string) {
    const db = getDatabase();
    const s = db.prepare(`
      SELECT s.*, cl.name as client_name, c.reference as contract_reference
      FROM securities s
      JOIN clients cl ON cl.id = s.client_id
      JOIN contracts c ON c.id = s.contract_id
      WHERE s.id = ?
    `).get(id);
    if (!s) throw new NotFoundError('Título não encontrado');
    return s;
  }

  create(data: Record<string, unknown>, userId: string) {
    const db = getDatabase();
    const id = uuidv4();
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM securities').get() as { cnt: number }).cnt + 1;
    const year = new Date().getFullYear();
    const series = `${data.security_type}-${year}-${String(count).padStart(3, '0')}`;

    db.prepare(`
      INSERT INTO securities (id, series, security_type, client_id, contract_id, face_value,
        market_value, yield_rate, maturity_date, discount_accepted, credit_deducted, status, received_at, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, series, data.security_type, data.client_id, data.contract_id,
      data.face_value, data.market_value || data.face_value, data.yield_rate || null,
      data.maturity_date, data.discount_accepted || 0,
      (data.face_value as number) * (1 + (data.discount_accepted as number || 0) / 100),
      'analise', data.received_at || new Date().toISOString().split('T')[0],
      data.notes || null, userId);

    return this.findById(id);
  }

  updateStatus(id: string, status: string) {
    const db = getDatabase();
    this.findById(id);
    db.prepare('UPDATE securities SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);
    return this.findById(id);
  }

  getPolicy() {
    return { ...this.policyStore };
  }

  updatePolicy(data: Record<string, unknown>) {
    Object.assign(this.policyStore, data);
    return { ...this.policyStore };
  }

  getKpis() {
    const db = getDatabase();
    const ot = db.prepare(`SELECT COALESCE(SUM(face_value), 0) as v, COUNT(*) as c FROM securities WHERE security_type = 'OT' AND status = 'aceite'`).get() as { v: number; c: number };
    const bt = db.prepare(`SELECT COALESCE(SUM(face_value), 0) as v, COUNT(*) as c FROM securities WHERE security_type = 'BT' AND status = 'aceite'`).get() as { v: number; c: number };
    const avgDiscount = db.prepare(`SELECT AVG(discount_accepted) as v FROM securities WHERE discount_accepted < 0`).get() as { v: number };

    return {
      otCarteira: ot.v,
      otSeries: ot.c,
      btCarteira: bt.v,
      btEmissoes: bt.c,
      descontoMedio: Math.round((avgDiscount.v || 0) * 10) / 10,
    };
  }
}
