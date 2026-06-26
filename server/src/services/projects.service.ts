import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { NotFoundError } from '../utils/errors';

export class ProjectsService {
  list(filters: { status?: string; sector?: string; province?: string } = {}) {
    const db = getDatabase();
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.status) { where.push('p.status = ?'); params.push(filters.status); }
    if (filters.sector) { where.push('p.sector = ?'); params.push(filters.sector); }
    if (filters.province) { where.push('p.province = ?'); params.push(filters.province); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    return db.prepare(`
      SELECT p.*, c.reference as contract_reference
      FROM projects p LEFT JOIN contracts c ON c.id = p.contract_id
      ${whereClause} ORDER BY p.total_value DESC
    `).all(...params);
  }

  findById(id: string) {
    const db = getDatabase();
    const p = db.prepare(`
      SELECT p.*, c.reference as contract_reference, c.amount as contract_amount
      FROM projects p LEFT JOIN contracts c ON c.id = p.contract_id
      WHERE p.id = ?
    `).get(id);
    if (!p) throw new NotFoundError('Projecto não encontrado');
    return p;
  }

  create(data: Record<string, unknown>, userId: string) {
    const db = getDatabase();
    const id = uuidv4();
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM projects').get() as { cnt: number }).cnt + 1;
    const code = `PRJ-${String(count).padStart(3, '0')}`;

    db.prepare(`
      INSERT INTO projects (id, code, name, executing_entity, beneficiary, location, province,
        sector, total_value, financed_amount, execution_percentage, contract_id, status, start_date, end_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, data.name, data.executing_entity, data.beneficiary || null,
      data.location || null, data.province || null, data.sector || null,
      data.total_value, data.financed_amount, data.execution_percentage || 0,
      data.contract_id || null, data.status || 'arranque', data.start_date || null,
      data.end_date || null, data.notes || null, userId);

    return this.findById(id);
  }

  update(id: string, data: Record<string, unknown>) {
    const db = getDatabase();
    this.findById(id);
    db.prepare(`
      UPDATE projects SET execution_percentage = COALESCE(?, execution_percentage),
        status = COALESCE(?, status), notes = COALESCE(?, notes), updated_at = ? WHERE id = ?
    `).run(data.execution_percentage || null, data.status || null, data.notes || null,
      new Date().toISOString(), id);
    return this.findById(id);
  }

  getKpis() {
    const db = getDatabase();
    const total = db.prepare('SELECT COUNT(*) as v FROM projects').get() as { v: number };
    const running = db.prepare(`SELECT COUNT(*) as v FROM projects WHERE status = 'em_execucao'`).get() as { v: number };
    const starting = db.prepare(`SELECT COUNT(*) as v FROM projects WHERE status = 'arranque'`).get() as { v: number };
    const deviated = db.prepare(`SELECT COUNT(*) as v FROM projects WHERE status = 'desvio'`).get() as { v: number };
    return { total: total.v, emExecucao: running.v, emArranque: starting.v, comDesvios: deviated.v };
  }

  getAnalytics() {
    const db = getDatabase();

    const sectorDistribution = db.prepare(`
      SELECT sector,
             COUNT(*) as count,
             COALESCE(SUM(financed_amount), 0) as total_financed
      FROM projects
      WHERE sector IS NOT NULL
      GROUP BY sector
      ORDER BY total_financed DESC
    `).all() as Array<{ sector: string; count: number; total_financed: number }>;

    const allFinanced = sectorDistribution.reduce((s, r) => s + r.total_financed, 0);

    const provinceDistribution = db.prepare(`
      SELECT province,
             COUNT(*) as count,
             COALESCE(SUM(financed_amount), 0) as total_financed
      FROM projects
      WHERE province IS NOT NULL AND province != ''
      GROUP BY province
      ORDER BY count DESC, total_financed DESC
    `).all() as Array<{ province: string; count: number; total_financed: number }>;

    const maxCount = provinceDistribution.reduce((m, r) => Math.max(m, r.count), 0);

    return {
      sectorDistribution: sectorDistribution.map(r => ({
        ...r,
        pct: allFinanced > 0 ? Math.round((r.total_financed / allFinanced) * 100) : 0,
      })),
      provinceDistribution: provinceDistribution.map(r => ({
        ...r,
        pct: maxCount > 0 ? Math.round((r.count / maxCount) * 100) : 0,
      })),
    };
  }
}
