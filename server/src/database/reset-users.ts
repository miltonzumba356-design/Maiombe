import { getDatabase } from './connection';
import { runMigrations } from './migrate';
import { v4 as uuidv4 } from 'uuid';
import argon2 from 'argon2';

const USERS = [
  { role: 'administrador',       name: 'Administrador'       },
  { role: 'director_executivo',  name: 'Director Executivo'  },
  { role: 'director_financeiro', name: 'Director Financeiro' },
  { role: 'gestor_carteira',     name: 'Gestor de Carteira'  },
  { role: 'analista_risco',      name: 'Analista de Risco'   },
  { role: 'juridico',            name: 'Jurídico'            },
  { role: 'contabilidade',       name: 'Contabilidade'       },
  { role: 'auditor',             name: 'Auditor'             },
];

// email = perfil@sistema.com  |  password = 12345
const buildEmail = (role: string) => `${role}@sistema.com`;
const PASSWORD = '12345';

const DATA_TABLES = [
  'amortization_schedules',
  'payments',
  'liability_schedules',
  'risk_assessments',
  'contract_phases',
  'alerts',
  'guarantees',
  'securities',
  'projects',
  'contracts',
  'liabilities',
  'funding_sources',
  'management_capital',
  'clients',
  'refresh_tokens',
  'audit_logs',
  'rate_tables',
  'commission_types',
];

async function resetAll() {
  runMigrations();
  const db = getDatabase();

  console.log('\n========================================');
  console.log('  RESET COMPLETO DA BASE DE DADOS');
  console.log('========================================\n');

  // 1 — Limpar todos os dados (manter estrutura)
  db.transaction(() => {
    db.prepare('PRAGMA foreign_keys = OFF').run();
    for (const table of DATA_TABLES) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
        console.log(`  [LIMPO]  ${table}`);
      } catch {
        // tabela pode não existir numa versão anterior
      }
    }
    db.prepare('DELETE FROM users').run();
    console.log('  [LIMPO]  users');
    db.prepare('PRAGMA foreign_keys = ON').run();
  })();

  // 2 — Criar utilizadores com novo padrão
  console.log('\n  A criar utilizadores...\n');
  const hash = await argon2.hash(PASSWORD);

  const insert = db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`
  );

  db.transaction(() => {
    for (const u of USERS) {
      const email = buildEmail(u.role);
      insert.run(uuidv4(), u.name, email, hash, u.role);
      console.log(`  [OK]  ${email.padEnd(38)} | ${PASSWORD}`);
    }
  })();

  console.log('\n========================================');
  console.log('  CREDENCIAIS DE ACESSO — MAIOMBE');
  console.log('========================================');
  for (const u of USERS) {
    console.log(`  ${buildEmail(u.role).padEnd(38)} | ${PASSWORD}`);
  }
  console.log('========================================');
  console.log('\n  Base de dados limpa. Pronta para uso.\n');
}

resetAll().catch(err => {
  console.error('Erro no reset:', err);
  process.exit(1);
});
