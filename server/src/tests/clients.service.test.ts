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
  db.prepare(`INSERT INTO users (id,name,email,password_hash,role) VALUES ('u1','Admin','a@test.com','hash','administrador')`).run();
});

afterEach(() => {
  clearTable(db, 'contracts');
  clearTable(db, 'clients');
});

async function getSvc() {
  const { ClientsService } = await import('../services/clients.service');
  return new ClientsService();
}

// ─────────────────────────────────────────────────────────────────────────────
describe('ClientsService', () => {

  describe('create()', () => {
    it('cria um cliente e devolve o registo com id', async () => {
      const svc = await getSvc();
      const result = await svc.create({
        name: 'Empresa Alpha Lda',
        nif: '5001234567',
        entity_type: 'empresa_privada',
      }, 'u1') as any;

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Empresa Alpha Lda');
      expect(result.nif).toBe('5001234567');
    });

    it('gera um código CLI-XXX automaticamente', async () => {
      const svc = await getSvc();
      const result = await svc.create({
        name: 'Empresa Beta',
        nif: '5009876543',
        entity_type: 'empresa_publica',
      }, 'u1') as any;

      expect(result.code).toMatch(/^CLI-\d{3}$/);
    });

    it('rejeita NIF duplicado', async () => {
      const svc = await getSvc();
      svc.create({ name: 'A', nif: '1111111111', entity_type: 'particular' }, 'u1');
      expect(() =>
        svc.create({ name: 'B', nif: '1111111111', entity_type: 'particular' }, 'u1')
      ).toThrow();
    });
  });

  describe('list()', () => {
    it('devolve lista vazia quando não há clientes', async () => {
      const svc = await getSvc();
      const result = await svc.list({}) as any;
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('devolve clientes criados', async () => {
      const svc = await getSvc();
      await svc.create({ name: 'Cliente X', nif: '2000000001', entity_type: 'particular' }, 'u1');
      await svc.create({ name: 'Cliente Y', nif: '2000000002', entity_type: 'empresa_privada' }, 'u1');

      const result = await svc.list({}) as any;
      expect(result.total).toBe(2);
    });

    it('filtra por entity_type', async () => {
      const svc = await getSvc();
      await svc.create({ name: 'Gov Central', nif: '3000000001', entity_type: 'governo_central' }, 'u1');
      await svc.create({ name: 'Empresa Priv', nif: '3000000002', entity_type: 'empresa_privada' }, 'u1');

      const result = await svc.list({ entity_type: 'governo_central' }) as any;
      expect(result.total).toBe(1);
      expect(result.data[0].name).toBe('Gov Central');
    });

    it('filtra por search (nome)', async () => {
      const svc = await getSvc();
      await svc.create({ name: 'Banco Nacional', nif: '4000000001', entity_type: 'empresa_publica' }, 'u1');
      await svc.create({ name: 'Ministério Finanças', nif: '4000000002', entity_type: 'ministerio' }, 'u1');

      const result = await svc.list({ search: 'Banco' }) as any;
      expect(result.total).toBe(1);
      expect(result.data[0].name).toBe('Banco Nacional');
    });

    it('respeita paginação', async () => {
      const svc = await getSvc();
      for (let i = 1; i <= 5; i++) {
        await svc.create({ name: `Cliente ${i}`, nif: `500000000${i}`, entity_type: 'particular' }, 'u1');
      }

      const page1 = await svc.list({ page: 1, limit: 3 }) as any;
      const page2 = await svc.list({ page: 2, limit: 3 }) as any;

      expect(page1.data).toHaveLength(3);
      expect(page2.data).toHaveLength(2);
      expect(page1.total).toBe(5);
    });
  });

  describe('findById()', () => {
    it('encontra cliente por id', async () => {
      const svc = await getSvc();
      const created = await svc.create({ name: 'Alvos SA', nif: '9991234567', entity_type: 'empresa_privada' }, 'u1') as any;
      const found = await svc.findById(created.id) as any;
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Alvos SA');
    });

    it('lança NotFoundError para id inexistente', async () => {
      const svc = await getSvc();
      expect(() => svc.findById('id-que-nao-existe')).toThrow('não encontrado');
    });
  });

  describe('update()', () => {
    it('actualiza campos do cliente', async () => {
      const svc = await getSvc();
      const created = await svc.create({ name: 'Nome Antigo', nif: '8881234567', entity_type: 'particular' }, 'u1') as any;
      const updated = await svc.update(created.id, { name: 'Nome Novo', risk_rating: 'A' }) as any;
      expect(updated.name).toBe('Nome Novo');
      expect(updated.risk_rating).toBe('A');
    });
  });
});
