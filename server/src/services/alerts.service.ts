import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';

export class AlertsService {
  list(filters: { severity?: string; is_resolved?: string } = {}) {
    const db = getDatabase();
    const where = ['1=1'];
    const params: unknown[] = [];

    if (filters.severity) { where.push('severity = ?'); params.push(filters.severity); }
    if (filters.is_resolved !== undefined) { where.push('is_resolved = ?'); params.push(filters.is_resolved === 'true' ? 1 : 0); }
    else { where.push('is_resolved = 0'); }

    return db.prepare(`
      SELECT * FROM alerts WHERE ${where.join(' AND ')}
      ORDER BY CASE severity WHEN 'urgente' THEN 1 WHEN 'atencao' THEN 2 ELSE 3 END, created_at DESC
    `).all(...params);
  }

  resolve(id: string, userId: string) {
    const db = getDatabase();
    db.prepare('UPDATE alerts SET is_resolved = 1, resolved_by = ?, resolved_at = ? WHERE id = ?')
      .run(userId, new Date().toISOString(), id);
    return db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  }

  create(data: Record<string, unknown>) {
    const db = getDatabase();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, alert_type, severity, title, description, entity_type, entity_id, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.alert_type, data.severity, data.title, data.description,
      data.entity_type || null, data.entity_id || null, data.expires_at || null);
    return db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  }

  getKpis() {
    const db = getDatabase();
    const counts = db.prepare(`
      SELECT severity, COUNT(*) as count FROM alerts WHERE is_resolved = 0 GROUP BY severity
    `).all() as Array<{ severity: string; count: number }>;
    const resolved = db.prepare(`
      SELECT COUNT(*) as v FROM alerts WHERE is_resolved = 1 AND resolved_at >= date('now', 'start of month')
    `).get() as { v: number };

    const result: Record<string, number> = { urgente: 0, atencao: 0, informativo: 0 };
    for (const r of counts) result[r.severity] = r.count;
    return { ...result, resolvidos: resolved.v };
  }
}
