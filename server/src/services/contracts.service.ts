import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface CreateContractDto {
  contract_type: 'modelo_a' | 'modelo_b' | 'modelo_c';
  client_id: string;
  amount: number;
  amount_text?: string;
  interest_rate: number;
  interest_base?: string;
  term_months: number;
  payment_frequency: string;
  celebration_date: string;
  first_disbursement_date?: string;
  grace_period_months?: number;
  late_interest_rate?: number;
  opening_commission?: number;
  rate_revision?: string;
  court_venue?: string;
  repayment_methods?: string[];
  ot_conditions?: string;
  ot_max_maturity?: string;
  main_guarantee?: string;
  guarantee_value?: number;
  secondary_guarantee?: string;
  guarantee_auto_renewal?: boolean;
  object?: string;
  phases?: Array<{ phase_number: number; percentage: number; planned_date: string; release_condition?: string }>;
}

interface AmortizationScheduleRow {
  id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  initial_capital: number;
  amortization: number;
  interest: number;
  total_installment: number;
  residual_capital: number;
}

function generateReference(): string {
  const year = new Date().getFullYear();
  const db = getDatabase();
  const count = (db.prepare(`
    SELECT COUNT(*) as cnt FROM contracts WHERE reference LIKE 'MAI-${year}-%'
  `).get() as { cnt: number }).cnt;
  return `MAI-${year}-${String(count + 1).padStart(3, '0')}`;
}

export function generateAmortizationSchedule(
  contractId: string,
  amount: number,
  interestRate: number,
  termMonths: number,
  frequency: string,
  startDate: string,
  gracePeriodMonths: number
) {
  const db = getDatabase();
  const frequencyMonths: Record<string, number> = {
    mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12, unica_vencimento: termMonths,
  };

  const periodMonths = frequencyMonths[frequency] || 6;
  const periodsPerYear = 12 / periodMonths;
  const monthlyRate = interestRate / 100 / 12;
  const periodRate = monthlyRate * periodMonths;
  const numPeriods = Math.floor(termMonths / periodMonths);
  const gracePeriods = Math.floor(gracePeriodMonths / periodMonths);

  const installmentCapital = amount / (numPeriods - gracePeriods || 1);
  let residualCapital = amount;
  const start = new Date(startDate);

  const schedules: AmortizationScheduleRow[] = [];
  for (let i = 1; i <= numPeriods; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i * periodMonths);

    const interest = residualCapital * periodRate;
    const isGracePeriod = i <= gracePeriods;
    const capitalPayment = isGracePeriod ? 0 : installmentCapital;
    const total = capitalPayment + interest;
    const initialCapital = residualCapital;
    residualCapital = Math.max(0, residualCapital - capitalPayment);

    schedules.push({
      id: uuidv4(),
      contract_id: contractId,
      installment_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      initial_capital: Math.round(initialCapital),
      amortization: Math.round(capitalPayment),
      interest: Math.round(interest),
      total_installment: Math.round(total),
      residual_capital: Math.round(residualCapital),
    });
  }

  const insert = db.prepare(`
    INSERT INTO amortization_schedules
      (id, contract_id, installment_number, due_date, initial_capital, amortization, interest, total_installment, residual_capital)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const s of schedules) {
      insert.run(s.id, s.contract_id, s.installment_number, s.due_date,
        s.initial_capital, s.amortization, s.interest, s.total_installment, s.residual_capital);
    }
  })();

  return schedules;
}

export class ContractsService {
  list(filters: { status?: string; client_id?: string; search?: string; page?: number; limit?: number }) {
    const db = getDatabase();
    const { status, client_id, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const where: string[] = ['c.deleted_at IS NULL'];
    const params: unknown[] = [];

    if (status) { where.push('c.status = ?'); params.push(status); }
    if (client_id) { where.push('c.client_id = ?'); params.push(client_id); }
    if (search) { where.push('(c.reference LIKE ? OR cl.name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const whereStr = where.join(' AND ');
    const total = (db.prepare(`
      SELECT COUNT(*) as cnt FROM contracts c WHERE ${whereStr}
    `).get(...params) as { cnt: number }).cnt;

    const rows = db.prepare(`
      SELECT c.*, cl.name as client_name, cl.entity_type, cl.nif,
        cl.phone as client_phone, cl.email as client_email,
        COALESCE(ra.risk_level, 'baixo') as risk_level,
        COALESCE(ra.overall_score, 0) as risk_score,
        (SELECT a.due_date FROM amortization_schedules a
         WHERE a.contract_id = c.id AND a.status IN ('pendente','vencido')
         ORDER BY a.due_date ASC LIMIT 1) as proximo_vencimento,
        date(c.celebration_date, '+' || c.term_months || ' months') as end_date
      FROM contracts c
      JOIN clients cl ON cl.id = c.client_id
      LEFT JOIN risk_assessments ra ON ra.contract_id = c.id
      WHERE ${whereStr}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { data: rows, total, page, limit };
  }

  findById(id: string) {
    const db = getDatabase();
    const contract = db.prepare(`
      SELECT c.*, cl.name as client_name, cl.entity_type, cl.nif, cl.province,
        cl.email as client_email, cl.phone as client_phone,
        u1.name as created_by_name, u2.name as approved_by_name,
        COALESCE(ra.risk_level, 'baixo') as risk_level
      FROM contracts c
      JOIN clients cl ON cl.id = c.client_id
      LEFT JOIN users u1 ON u1.id = c.created_by
      LEFT JOIN users u2 ON u2.id = c.approved_by
      LEFT JOIN risk_assessments ra ON ra.contract_id = c.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `).get(id);

    if (!contract) throw new NotFoundError('Contrato não encontrado');

    const schedule = db.prepare('SELECT * FROM amortization_schedules WHERE contract_id = ? ORDER BY installment_number').all(id);
    const phases = db.prepare('SELECT * FROM contract_phases WHERE contract_id = ? ORDER BY phase_number').all(id);
    const payments = db.prepare('SELECT * FROM payments WHERE contract_id = ? ORDER BY paid_at DESC').all(id);
    const guarantee = db.prepare('SELECT * FROM guarantees WHERE contract_id = ?').all(id);

    return { ...contract, schedule, phases, payments, guarantees: guarantee };
  }

  create(data: CreateContractDto, userId: string) {
    const db = getDatabase();
    const id = uuidv4();
    const reference = generateReference();

    db.prepare(`
      INSERT INTO contracts (
        id, reference, contract_type, status, client_id, amount, amount_text, interest_rate,
        interest_base, term_months, payment_frequency, celebration_date, first_disbursement_date,
        grace_period_months, late_interest_rate, opening_commission, rate_revision, court_venue,
        repayment_methods, ot_conditions, ot_max_maturity, main_guarantee, guarantee_value,
        secondary_guarantee, guarantee_auto_renewal, object, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, reference, data.contract_type, 'elaboracao', data.client_id,
      data.amount, data.amount_text || null, data.interest_rate,
      data.interest_base || 'mes_30', data.term_months, data.payment_frequency,
      data.celebration_date, data.first_disbursement_date || null,
      data.grace_period_months || 0, data.late_interest_rate || 0.05,
      data.opening_commission || 1.5, data.rate_revision || 'fixa',
      data.court_venue || null, JSON.stringify(data.repayment_methods || []),
      data.ot_conditions || null, data.ot_max_maturity || null,
      data.main_guarantee || null, data.guarantee_value || null,
      data.secondary_guarantee || null, data.guarantee_auto_renewal ? 1 : 0,
      data.object || null, userId
    );

    if (data.first_disbursement_date) {
      generateAmortizationSchedule(
        id, data.amount, data.interest_rate, data.term_months,
        data.payment_frequency, data.first_disbursement_date,
        data.grace_period_months || 0
      );
    }

    if (data.contract_type === 'modelo_c' && data.phases) {
      const insertPhase = db.prepare(`
        INSERT INTO contract_phases (id, contract_id, phase_number, percentage, planned_date, release_condition)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      db.transaction(() => {
        for (const p of data.phases!) {
          insertPhase.run(uuidv4(), id, p.phase_number, p.percentage, p.planned_date, p.release_condition || null);
        }
      })();
    }

    return this.findById(id);
  }

  update(id: string, data: Partial<CreateContractDto> & { status?: 'elaboracao' | 'recebidos' }, userId: string) {
    const db = getDatabase();
    this.findById(id);

    db.prepare(`
      UPDATE contracts SET
        status = COALESCE(?, status), amount = COALESCE(?, amount),
        interest_rate = COALESCE(?, interest_rate), object = COALESCE(?, object),
        updated_at = ?
      WHERE id = ?
    `).run(
      data.status || null,
      data.amount || null, data.interest_rate || null, data.object || null,
      new Date().toISOString(), id
    );

    return this.findById(id);
  }

  approveDisbursement(id: string, userId: string, disbursementDate?: string) {
    const db = getDatabase();
    const contract = this.findById(id) as unknown as {
      id: string;
      status: string;
      amount: number;
      interest_rate: number;
      term_months: number;
      payment_frequency: string;
      first_disbursement_date?: string | null;
      grace_period_months?: number | null;
    };

    if (contract.status === 'recebidos') return contract;

    const effectiveDate = disbursementDate || contract.first_disbursement_date || new Date().toISOString().split('T')[0];
    const scheduleCount = (db.prepare(`
      SELECT COUNT(*) as count FROM amortization_schedules WHERE contract_id = ?
    `).get(id) as { count: number }).count;

    db.prepare(`
      UPDATE contracts
      SET status = 'recebidos', first_disbursement_date = ?, approved_by = ?, approved_at = ?, updated_at = ?
      WHERE id = ?
    `).run(effectiveDate, userId, new Date().toISOString(), new Date().toISOString(), id);

    if (scheduleCount === 0) {
      generateAmortizationSchedule(
        id,
        contract.amount,
        contract.interest_rate,
        contract.term_months,
        contract.payment_frequency,
        effectiveDate,
        contract.grace_period_months || 0
      );
    }

    return this.findById(id);
  }

  getSchedule(contractId: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM amortization_schedules WHERE contract_id = ? ORDER BY installment_number').all(contractId);
  }

  registerPayment(contractId: string, data: {
    schedule_id?: string; amount: number; payment_method: string; reference?: string; notes?: string; paid_at: string;
  }, userId: string) {
    const db = getDatabase();
    const paymentId = uuidv4();

    db.prepare(`
      INSERT INTO payments (id, contract_id, schedule_id, amount, payment_method, reference, notes, paid_at, registered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(paymentId, contractId, data.schedule_id || null, data.amount, data.payment_method,
      data.reference || null, data.notes || null, data.paid_at, userId);

    if (data.schedule_id) {
      db.prepare('UPDATE amortization_schedules SET status = ?, paid_amount = ?, paid_at = ? WHERE id = ?')
        .run('pago', data.amount, data.paid_at, data.schedule_id);
    }

    return db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
  }

  simulateAmortization(amount: number, rate: number, termMonths: number, frequency: string, gracePeriodMonths = 0) {
    const frequencyMonths: Record<string, number> = {
      mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12, unica_vencimento: termMonths,
    };
    const periodMonths = frequencyMonths[frequency] || 6;
    const periodRate = (rate / 100 / 12) * periodMonths;
    const numPeriods = Math.floor(termMonths / periodMonths);
    const gracePeriods = Math.floor(gracePeriodMonths / periodMonths);
    const installmentCapital = amount / (numPeriods - gracePeriods || 1);
    let residualCapital = amount;
    let totalInterest = 0;

    const schedule = [];
    for (let i = 1; i <= numPeriods; i++) {
      const interest = residualCapital * periodRate;
      const isGracePeriod = i <= gracePeriods;
      const capitalPayment = isGracePeriod ? 0 : installmentCapital;
      const total = capitalPayment + interest;
      totalInterest += interest;
      residualCapital = Math.max(0, residualCapital - capitalPayment);

      schedule.push({
        installment: i,
        amortization: Math.round(capitalPayment),
        interest: Math.round(interest),
        total: Math.round(total),
        residual: Math.round(residualCapital),
      });
    }

    return {
      schedule,
      summary: {
        totalAmount: amount,
        totalInterest: Math.round(totalInterest),
        totalPayable: Math.round(amount + totalInterest),
        numInstallments: numPeriods,
      },
    };
  }
}
