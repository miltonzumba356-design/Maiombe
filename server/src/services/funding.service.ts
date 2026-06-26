import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { NotFoundError } from '../utils/errors';

export class FundingService {
  list() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM funding_sources ORDER BY total_amount DESC').all();
  }

  findById(id: string) {
    const db = getDatabase();
    const f = db.prepare('SELECT * FROM funding_sources WHERE id = ?').get(id);
    if (!f) throw new NotFoundError('Fonte não encontrada');
    return f;
  }

  create(data: Record<string, unknown>) {
    const db = getDatabase();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO funding_sources (id, name, source_type, institution, product, total_amount,
        utilized_amount, interest_rate, maturity_date, guarantee_given, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.source_type, data.institution || null, data.product || null,
      data.total_amount, data.utilized_amount || 0, data.interest_rate || 0,
      data.maturity_date || null, data.guarantee_given || null, 'activa', data.notes || null);
    return this.findById(id);
  }

  getKpis() {
    const db = getDatabase();
    const total = db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as v FROM funding_sources WHERE status = 'activa'`).get() as { v: number };
    const banks = db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as v, COUNT(*) as c FROM funding_sources WHERE source_type = 'linha_bancaria' AND status = 'activa'`).get() as { v: number; c: number };
    const equity = db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as v FROM funding_sources WHERE source_type = 'capital_proprio' AND status = 'activa'`).get() as { v: number };
    const investors = db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as v FROM funding_sources WHERE source_type IN ('debentures','obrigacoes') AND status = 'activa'`).get() as { v: number };

    return {
      totalCaptado: total.v,
      linhasBancarias: banks.v,
      numBancos: banks.c,
      capitalProprio: equity.v,
      investidoresPrivados: investors.v,
    };
  }
}
