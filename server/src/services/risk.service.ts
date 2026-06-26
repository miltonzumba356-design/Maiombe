import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';

export class RiskService {
  getMatrix() {
    const db = getDatabase();
    return db.prepare(`
      SELECT risk_level, COUNT(*) as count,
        COALESCE(SUM(c.amount), 0) as total_amount
      FROM risk_assessments ra
      JOIN contracts c ON c.id = ra.contract_id
      WHERE c.deleted_at IS NULL
      GROUP BY risk_level
    `).all();
  }

  getWatchList() {
    const db = getDatabase();
    return db.prepare(`
      SELECT ra.*, c.reference, c.amount as contract_amount,
        cl.name as client_name, cl.entity_type
      FROM risk_assessments ra
      JOIN contracts c ON c.id = ra.contract_id
      JOIN clients cl ON cl.id = ra.client_id
      WHERE ra.risk_level IN ('alto','critico') AND c.deleted_at IS NULL
      ORDER BY ra.overall_score ASC
    `).all();
  }

  getRatingByEntityType() {
    const db = getDatabase();
    const ratings: Record<string, { rating: string; count: number; total: number }> = {
      governo_central: { rating: 'A+', count: 0, total: 0 },
      ministerio: { rating: 'A', count: 0, total: 0 },
      governo_provincial: { rating: 'B+', count: 0, total: 0 },
      administracao_municipal: { rating: 'B-', count: 0, total: 0 },
      empresa_publica: { rating: 'C+', count: 0, total: 0 },
      empresa_privada: { rating: 'C', count: 0, total: 0 },
    };

    const counts = db.prepare(`
      SELECT cl.entity_type, COUNT(*) as cnt, COALESCE(SUM(c.amount), 0) as total_amount
      FROM contracts c JOIN clients cl ON cl.id = c.client_id
      WHERE c.deleted_at IS NULL AND c.status = 'recebidos'
      GROUP BY cl.entity_type
    `).all() as Array<{ entity_type: string; cnt: number; total_amount: number }>;

    for (const row of counts) {
      if (ratings[row.entity_type]) {
        ratings[row.entity_type].count = row.cnt;
        ratings[row.entity_type].total = row.total_amount;
      }
    }

    return ratings;
  }

  getScoringIndicators() {
    return [
      { indicator: 'Histórico de Pagamento', weight: 30, avg_score: 8.2, trend: 'Estável', evaluation: 'Positivo' },
      { indicator: 'Situação Financeira', weight: 25, avg_score: 6.8, trend: 'Neutro', evaluation: 'Neutro' },
      { indicator: 'Risco Político / Institucional', weight: 20, avg_score: 6.5, trend: 'Neutro', evaluation: 'Neutro' },
      { indicator: 'Risco Contratual', weight: 10, avg_score: 7.9, trend: 'Melhoria', evaluation: 'Positivo' },
      { indicator: 'Risco de Execução', weight: 10, avg_score: 5.4, trend: 'Atenção', evaluation: 'Negativo' },
      { indicator: 'Risco de Liquidez', weight: 5, avg_score: 4.1, trend: 'Deterioração', evaluation: 'Crítico' },
    ];
  }

  createAssessment(data: Record<string, unknown>, userId: string) {
    const db = getDatabase();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO risk_assessments (id, contract_id, client_id, risk_level, overall_score,
        payment_history_score, financial_situation_score, political_risk_score,
        contractual_risk_score, execution_risk_score, liquidity_risk_score,
        recommended_action, action_deadline, notes, assessed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.contract_id, data.client_id, data.risk_level, data.overall_score,
      data.payment_history_score || null, data.financial_situation_score || null,
      data.political_risk_score || null, data.contractual_risk_score || null,
      data.execution_risk_score || null, data.liquidity_risk_score || null,
      data.recommended_action || null, data.action_deadline || null, data.notes || null, userId);

    return db.prepare('SELECT * FROM risk_assessments WHERE id = ?').get(id);
  }

  getKpis() {
    const db = getDatabase();
    const counts = db.prepare(`
      SELECT risk_level, COUNT(*) as count, COALESCE(SUM(c.amount), 0) as total
      FROM risk_assessments ra JOIN contracts c ON c.id = ra.contract_id
      WHERE c.deleted_at IS NULL GROUP BY risk_level
    `).all() as Array<{ risk_level: string; count: number; total: number }>;

    const result: Record<string, { count: number; total: number }> = {};
    for (const r of counts) result[r.risk_level] = { count: r.count, total: r.total };
    return result;
  }
}
