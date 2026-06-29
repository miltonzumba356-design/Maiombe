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
});

afterEach(() => {
  clearTable(db, 'funding_sources');
});

async function getSvc() {
  const { FundingService } = await import('../services/funding.service');
  return new FundingService();
}

// ─────────────────────────────────────────────────────────────────────────────
describe('FundingService', () => {

  describe('create()', () => {
    it('cria uma fonte de financiamento com status activa por defeito', async () => {
      const svc = await getSvc();
      const result = await svc.create({
        name: 'Linha BFA',
        source_type: 'linha_bancaria',
        institution: 'BFA',
        total_amount: 500_000_000,
        interest_rate: 8.5,
      }) as any;

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Linha BFA');
      expect(result.status).toBe('activa');
      expect(result.interest_rate).toBe(8.5);
    });

    it('utilized_amount assume 0 quando não fornecido', async () => {
      const svc = await getSvc();
      const result = await svc.create({
        name: 'Capital Próprio',
        source_type: 'capital_proprio',
        total_amount: 200_000_000,
      }) as any;

      expect(result.utilized_amount).toBe(0);
    });
  });

  describe('list()', () => {
    it('devolve lista vazia', async () => {
      const svc = await getSvc();
      const result = await svc.list() as any[];
      expect(result).toHaveLength(0);
    });

    it('devolve todas as fontes ordenadas por total_amount desc', async () => {
      const svc = await getSvc();
      await svc.create({ name: 'Pequena', source_type: 'outros', total_amount: 100_000 });
      await svc.create({ name: 'Grande', source_type: 'linha_bancaria', total_amount: 900_000_000 });

      const result = await svc.list() as any[];
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Grande');
      expect(result[1].name).toBe('Pequena');
    });
  });

  describe('getKpis()', () => {
    it('totalCaptado = soma das fontes activas', async () => {
      const svc = await getSvc();
      await svc.create({ name: 'F1', source_type: 'linha_bancaria', total_amount: 300_000_000, interest_rate: 7 });
      await svc.create({ name: 'F2', source_type: 'capital_proprio', total_amount: 200_000_000, interest_rate: 5 });

      const kpis = await svc.getKpis() as any;
      expect(kpis.totalCaptado).toBe(500_000_000);
    });

    it('linhasBancarias conta apenas source_type=linha_bancaria', async () => {
      const svc = await getSvc();
      await svc.create({ name: 'Banco A', source_type: 'linha_bancaria', total_amount: 400_000_000 });
      await svc.create({ name: 'Accionista', source_type: 'capital_proprio', total_amount: 100_000_000 });

      const kpis = await svc.getKpis() as any;
      expect(kpis.linhasBancarias).toBe(400_000_000);
      expect(kpis.numBancos).toBe(1);
    });

    it('kpis zerados quando não há fontes', async () => {
      const svc = await getSvc();
      const kpis = await svc.getKpis() as any;
      expect(kpis.totalCaptado).toBe(0);
      expect(kpis.linhasBancarias).toBe(0);
    });
  });

  describe('findById()', () => {
    it('encontra fonte por id', async () => {
      const svc = await getSvc();
      const created = await svc.create({ name: 'Fonte X', source_type: 'fundo', total_amount: 50_000_000 }) as any;
      const found = await svc.findById(created.id) as any;
      expect(found.id).toBe(created.id);
    });

    it('lança NotFoundError para id inexistente', async () => {
      const svc = await getSvc();
      expect(() => svc.findById('nao-existe')).toThrow();
    });
  });
});
