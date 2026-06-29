import Database from 'better-sqlite3';

/**
 * Creates an isolated in-memory SQLite database with the full application
 * schema. Each test suite should call this in beforeAll and reset between
 * tests via clearTestDb().
 */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      nif TEXT UNIQUE NOT NULL,
      entity_type TEXT NOT NULL,
      legal_representative TEXT,
      address TEXT,
      province TEXT,
      email TEXT,
      phone TEXT,
      risk_rating TEXT,
      risk_score REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      created_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      contract_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'elaboracao',
      client_id TEXT NOT NULL REFERENCES clients(id),
      lender_name TEXT NOT NULL DEFAULT 'MAIOMBE',
      lender_nif TEXT NOT NULL DEFAULT '5000056146',
      object TEXT,
      amount REAL NOT NULL,
      amount_text TEXT,
      interest_rate REAL NOT NULL,
      interest_base TEXT NOT NULL DEFAULT 'mes_30',
      term_months INTEGER NOT NULL,
      payment_frequency TEXT NOT NULL,
      celebration_date TEXT NOT NULL,
      first_disbursement_date TEXT,
      grace_period_months INTEGER NOT NULL DEFAULT 0,
      late_interest_rate REAL NOT NULL DEFAULT 0.05,
      opening_commission REAL NOT NULL DEFAULT 1.5,
      rate_revision TEXT NOT NULL DEFAULT 'fixa',
      court_venue TEXT,
      repayment_methods TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      created_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS amortization_schedules (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      installment_number INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      initial_capital REAL NOT NULL,
      amortization REAL NOT NULL,
      interest REAL NOT NULL,
      total_installment REAL NOT NULL,
      residual_capital REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'futuro',
      paid_amount REAL,
      paid_at TEXT,
      late_interest REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      overall_score REAL NOT NULL,
      assessed_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS funding_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      institution TEXT,
      product TEXT,
      total_amount REAL NOT NULL,
      utilized_amount REAL NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      maturity_date TEXT,
      guarantee_given TEXT,
      status TEXT NOT NULL DEFAULT 'activa',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operational_costs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_monthly REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      schedule_id TEXT REFERENCES amortization_schedules(id),
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      paid_at TEXT NOT NULL,
      registered_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function clearTable(db: Database.Database, table: string) {
  db.prepare(`DELETE FROM ${table}`).run();
}
