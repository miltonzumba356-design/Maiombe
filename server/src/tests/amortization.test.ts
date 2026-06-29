import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createTestDb, clearTable } from './helpers/testDb';
import type Database from 'better-sqlite3';

let db: Database.Database;

vi.mock('../database/connection', () => ({
  getDatabase: () => db,
  closeDatabase: vi.fn(),
}));

beforeAll(() => {
  db = createTestDb();
  // Seed a client and user required by contracts FK
  db.prepare(`INSERT INTO users (id,name,email,password_hash,role) VALUES ('u1','Admin','a@test.com','hash','administrador')`).run();
  db.prepare(`INSERT INTO clients (id,code,name,nif,entity_type,created_by) VALUES ('cl1','CLI-001','Empresa Teste','123456789','empresa_privada','u1')`).run();
});

afterEach(() => {
  clearTable(db, 'amortization_schedules');
  clearTable(db, 'contracts');
});

// Lazy import so the vi.mock is in place first
async function getScheduleFn() {
  const { generateAmortizationSchedule } = await import('../services/contracts.service');
  return generateAmortizationSchedule;
}

function seedContract(id: string, ref: string) {
  db.prepare(`
    INSERT INTO contracts (id,reference,contract_type,client_id,amount,interest_rate,term_months,payment_frequency,celebration_date,status)
    VALUES (?,?,'modelo_a','cl1',1000000,12,12,'mensal','2026-01-01','elaboracao')
  `).run(id, ref);
}

// ─────────────────────────────────────────────────────────────────────────────
describe('generateAmortizationSchedule', () => {

  describe('número de prestações', () => {
    it('mensal/12 meses → 12 prestações', async () => {
      seedContract('c1', 'MAI-2026-001');
      const fn = await getScheduleFn();
      const rows = fn('c1', 1_000_000, 12, 12, 'mensal', '2026-01-01', 0);
      expect(rows).toHaveLength(12);
    });

    it('trimestral/12 meses → 4 prestações', async () => {
      seedContract('c2', 'MAI-2026-002');
      const fn = await getScheduleFn();
      const rows = fn('c2', 1_000_000, 12, 12, 'trimestral', '2026-01-01', 0);
      expect(rows).toHaveLength(4);
    });

    it('semestral/24 meses → 4 prestações', async () => {
      seedContract('c3', 'MAI-2026-003');
      const fn = await getScheduleFn();
      const rows = fn('c3', 1_000_000, 12, 24, 'semestral', '2026-01-01', 0);
      expect(rows).toHaveLength(4);
    });

    it('unica_vencimento → 1 prestação', async () => {
      seedContract('c4', 'MAI-2026-004');
      const fn = await getScheduleFn();
      const rows = fn('c4', 1_000_000, 12, 12, 'unica_vencimento', '2026-01-01', 0);
      expect(rows).toHaveLength(1);
    });
  });

  describe('capital residual', () => {
    it('capital residual na última prestação deve ser 0', async () => {
      seedContract('c5', 'MAI-2026-005');
      const fn = await getScheduleFn();
      const rows = fn('c5', 1_000_000, 12, 12, 'mensal', '2026-01-01', 0);
      expect(rows[rows.length - 1].residual_capital).toBe(0);
    });

    it('capital inicial da 1ª prestação deve ser o montante total', async () => {
      seedContract('c6', 'MAI-2026-006');
      const fn = await getScheduleFn();
      const rows = fn('c6', 1_000_000, 12, 12, 'mensal', '2026-01-01', 0);
      expect(rows[0].initial_capital).toBe(1_000_000);
    });

    it('capital residual decresce monotonicamente', async () => {
      seedContract('c7', 'MAI-2026-007');
      const fn = await getScheduleFn();
      const rows = fn('c7', 1_000_000, 12, 12, 'mensal', '2026-01-01', 0);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].residual_capital).toBeLessThanOrEqual(rows[i - 1].residual_capital);
      }
    });
  });

  describe('período de carência', () => {
    it('durante a carência: amortização = 0, só juros', async () => {
      seedContract('c8', 'MAI-2026-008');
      const fn = await getScheduleFn();
      const rows = fn('c8', 1_000_000, 12, 12, 'mensal', '2026-01-01', 3);
      expect(rows[0].amortization).toBe(0);
      expect(rows[1].amortization).toBe(0);
      expect(rows[2].amortization).toBe(0);
      expect(rows[0].interest).toBeGreaterThan(0);
    });

    it('após carência: amortização > 0', async () => {
      seedContract('c9', 'MAI-2026-009');
      const fn = await getScheduleFn();
      const rows = fn('c9', 1_000_000, 12, 12, 'mensal', '2026-01-01', 3);
      expect(rows[3].amortization).toBeGreaterThan(0);
    });
  });

  describe('juros', () => {
    it('juros da 1ª prestação = capital × taxa_mensal', async () => {
      seedContract('c10', 'MAI-2026-010');
      const fn = await getScheduleFn();
      const amount = 1_000_000;
      const rate = 12; // 12% a.a.
      const rows = fn('c10', amount, rate, 12, 'mensal', '2026-01-01', 0);
      const expectedInterest = Math.round(amount * (rate / 100 / 12));
      expect(rows[0].interest).toBe(expectedInterest);
    });

    it('juros totais < juro simples (capital em declínio)', async () => {
      seedContract('c11', 'MAI-2026-011');
      const fn = await getScheduleFn();
      const amount = 1_000_000;
      const rate = 12;
      const rows = fn('c11', amount, rate, 12, 'mensal', '2026-01-01', 0);
      const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
      const simpleInterest = amount * (rate / 100);
      expect(totalInterest).toBeLessThan(simpleInterest);
    });
  });

  describe('total_installment', () => {
    it('total_installment = amortização + juros (tolerância de 1 Kz por arredondamento)', async () => {
      seedContract('c12', 'MAI-2026-012');
      const fn = await getScheduleFn();
      const rows = fn('c12', 1_000_000, 12, 12, 'mensal', '2026-01-01', 0);
      for (const row of rows) {
        const diff = Math.abs(row.total_installment - (row.amortization + row.interest));
        expect(diff).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('numeração das prestações', () => {
    it('installment_number sequencial de 1 a N', async () => {
      seedContract('c13', 'MAI-2026-013');
      const fn = await getScheduleFn();
      const rows = fn('c13', 1_000_000, 12, 6, 'mensal', '2026-01-01', 0);
      rows.forEach((r, i) => expect(r.installment_number).toBe(i + 1));
    });
  });

  describe('datas de vencimento', () => {
    it('cada due_date avança pelo período de frequência', async () => {
      seedContract('c14', 'MAI-2026-014');
      const fn = await getScheduleFn();
      const rows = fn('c14', 1_000_000, 12, 6, 'mensal', '2026-01-01', 0);
      expect(rows[0].due_date).toBe('2026-02-01');
      expect(rows[1].due_date).toBe('2026-03-01');
      expect(rows[2].due_date).toBe('2026-04-01');
    });
  });

  describe('gravação na base de dados', () => {
    it('as linhas são gravadas na tabela amortization_schedules', async () => {
      seedContract('c15', 'MAI-2026-015');
      const fn = await getScheduleFn();
      fn('c15', 1_000_000, 12, 6, 'mensal', '2026-01-01', 0);
      const count = (db.prepare('SELECT COUNT(*) as n FROM amortization_schedules WHERE contract_id = ?').get('c15') as { n: number }).n;
      expect(count).toBe(6);
    });
  });
});
