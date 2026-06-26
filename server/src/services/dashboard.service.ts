import { getDatabase } from '../database/connection';

export class DashboardService {
  getKpis() {
    const db = getDatabase();

    const totalCaptado = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as value FROM funding_sources WHERE status = 'activa'
    `).get() as { value: number };

    const totalAplicado = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as value FROM contracts
      WHERE status = 'recebidos' AND deleted_at IS NULL
    `).get() as { value: number };

    const creditoVencido = db.prepare(`
      SELECT COALESCE(SUM(total_installment - COALESCE(paid_amount, 0)), 0) as value
      FROM amortization_schedules WHERE status = 'vencido'
    `).get() as { value: number };

    const totalContratos = db.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'recebidos' THEN 1 ELSE 0 END) as em_vigor,
        SUM(CASE WHEN status = 'recebidos' AND EXISTS(
          SELECT 1 FROM amortization_schedules a WHERE a.contract_id = contracts.id AND a.status = 'vencido'
        ) THEN 1 ELSE 0 END) as em_risco,
        SUM(CASE WHEN status = 'elaboracao' THEN 1 ELSE 0 END) as em_formalizacao
      FROM contracts WHERE deleted_at IS NULL
    `).get() as Record<string, number>;

    const totalClientes = db.prepare(`
      SELECT COUNT(*) as total FROM clients WHERE is_active = 1 AND deleted_at IS NULL
    `).get() as { total: number };

    const garantias = db.prepare(`
      SELECT COUNT(*) as total FROM guarantees WHERE status = 'activa' AND deleted_at IS NULL
    `).get() as { total: number };

    const riskMatrix = db.prepare(`
      SELECT risk_level, COUNT(*) as count, COALESCE(SUM(c.amount), 0) as total_amount
      FROM risk_assessments ra
      JOIN contracts c ON c.id = ra.contract_id
      WHERE c.deleted_at IS NULL
      GROUP BY risk_level
    `).all() as Array<{ risk_level: string; count: number; total_amount: number }>;

    const alertsCount = db.prepare(`
      SELECT severity, COUNT(*) as count FROM alerts WHERE is_resolved = 0 GROUP BY severity
    `).all() as Array<{ severity: string; count: number }>;

    const recovery = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'pago' THEN total_installment END), 0) as paid,
        COALESCE(SUM(total_installment), 0) as total
      FROM amortization_schedules
      WHERE status IN ('pago','vencido','pendente')
    `).get() as { paid: number; total: number };

    const avgContractRate = db.prepare(`
      SELECT COALESCE(AVG(interest_rate), 0) as v FROM contracts
      WHERE status = 'recebidos' AND deleted_at IS NULL
    `).get() as { v: number };

    const avgFundingRate = db.prepare(`
      SELECT COALESCE(AVG(interest_rate), 0) as v FROM funding_sources WHERE status = 'activa'
    `).get() as { v: number };

    const nplRatio = totalAplicado.value > 0
      ? (creditoVencido.value / totalAplicado.value) * 100
      : 0;

    const taxaRecuperacao = recovery.total > 0
      ? Math.round((recovery.paid / recovery.total) * 1000) / 10
      : null;

    const spread = avgContractRate.v > 0 || avgFundingRate.v > 0
      ? Math.round((avgContractRate.v - avgFundingRate.v) * 10) / 10
      : null;

    const healthScore = (() => {
      if (taxaRecuperacao === null) return null;
      let score = 50;
      score += Math.min(taxaRecuperacao / 2, 25);
      score -= Math.min(nplRatio * 2, 25);
      return Math.max(0, Math.min(100, Math.round(score)));
    })();

    return {
      capitalCaptado: totalCaptado.value,
      capitalAplicado: totalAplicado.value,
      creditoVencido: creditoVencido.value,
      nplRatio: Math.round(nplRatio * 10) / 10,
      utilizacaoCapital: totalCaptado.value > 0
        ? Math.round((totalAplicado.value / totalCaptado.value) * 1000) / 10
        : 0,
      rentabilidadeLiquida: spread,
      contratos: totalContratos,
      clientes: totalClientes.total,
      garantias: garantias.total,
      taxaRecuperacao,
      healthScore,
      riskMatrix,
      alertas: alertsCount,
    };
  }

  getContratosAtivos(limit = 10) {
    const db = getDatabase();
    return db.prepare(`
      SELECT c.id, c.reference, cl.name as client_name, cl.entity_type, c.amount,
        c.interest_rate, c.status, c.payment_frequency,
        (SELECT MIN(a.due_date) FROM amortization_schedules a WHERE a.contract_id = c.id AND a.status IN ('pendente','futuro')) as proximo_vencimento,
        c.repayment_methods,
        COALESCE(ra.risk_level, 'baixo') as risk_level,
        CAST(COALESCE(
          (SELECT CAST(COUNT(CASE WHEN a.status = 'pago' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS INTEGER)
           FROM amortization_schedules a WHERE a.contract_id = c.id), 0
        ) AS INTEGER) as execution_pct
      FROM contracts c
      JOIN clients cl ON cl.id = c.client_id
      LEFT JOIN risk_assessments ra ON ra.contract_id = c.id
      WHERE c.status = 'recebidos' AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT ?
    `).all(limit);
  }

  getPortfolioEvolution() {
    const db = getDatabase();
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return months.map((month, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      const row = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as v
        FROM contracts
        WHERE deleted_at IS NULL
        AND strftime('%Y-%m', celebration_date) <= ('2026-' || ?)
      `).get(monthNum) as { v: number };
      return { month, value: Math.round(row.v / 1e8) / 10 };
    });
  }

  getAlertas(limit = 10) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM alerts WHERE is_resolved = 0
      ORDER BY CASE severity WHEN 'urgente' THEN 1 WHEN 'atencao' THEN 2 ELSE 3 END, created_at DESC
      LIMIT ?
    `).all(limit);
  }

  getFontesResumo() {
    const db = getDatabase();
    return db.prepare(`
      SELECT name, source_type, total_amount, utilized_amount, interest_rate
      FROM funding_sources WHERE status = 'activa'
      ORDER BY total_amount DESC
      LIMIT 4
    `).all();
  }

  getCronograma2026() {
    const db = getDatabase();
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return months.map((month, i) => {
      const monthNum = String(i + 1).padStart(2, '0');

      const paid = db.prepare(`
        SELECT COALESCE(SUM(total_installment), 0) as value
        FROM amortization_schedules
        WHERE strftime('%m', due_date) = ? AND strftime('%Y', due_date) = '2026'
        AND status = 'pago'
      `).get(monthNum) as { value: number };

      const pending = db.prepare(`
        SELECT COALESCE(SUM(total_installment), 0) as value
        FROM amortization_schedules
        WHERE strftime('%m', due_date) = ? AND strftime('%Y', due_date) = '2026'
        AND status IN ('pendente','vencido','futuro')
      `).get(monthNum) as { value: number };

      const total = paid.value + pending.value;
      const status = paid.value > 0 && pending.value === 0 ? 'Recebido'
        : paid.value > 0 ? 'Em Curso'
        : pending.value > 0 ? 'Previsto'
        : 'Sem dados';

      return { month, value: total, status };
    });
  }

  getExposicaoProvincial() {
    const db = getDatabase();
    return db.prepare(`
      SELECT cl.province, COALESCE(SUM(c.amount), 0) as total
      FROM contracts c
      JOIN clients cl ON cl.id = c.client_id
      WHERE c.status = 'recebidos' AND c.deleted_at IS NULL
      GROUP BY cl.province
      ORDER BY total DESC
      LIMIT 10
    `).all();
  }
}
