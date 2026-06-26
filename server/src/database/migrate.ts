import { getDatabase } from './connection';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

function migrateContractsStatusConstraint(): void {
  const db = getDatabase();
  const table = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'contracts'
  `).get() as { sql?: string } | undefined;

  if (!table?.sql || table.sql.includes("'recebidos'")) return;

  logger.info('Migrating contracts status constraint to elaboracao/recebidos');

  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    db.exec(`
      CREATE TABLE contracts_new (
        id TEXT PRIMARY KEY,
        reference TEXT UNIQUE NOT NULL,
        contract_type TEXT NOT NULL CHECK(contract_type IN ('modelo_a','modelo_b','modelo_c')),
        status TEXT NOT NULL DEFAULT 'elaboracao' CHECK(status IN ('elaboracao','recebidos')),
        client_id TEXT NOT NULL REFERENCES clients(id),
        lender_name TEXT NOT NULL DEFAULT 'MAIOMBE - Capital & Credit, Lda.',
        lender_nif TEXT NOT NULL DEFAULT '5000056146',
        object TEXT,
        amount REAL NOT NULL,
        amount_text TEXT,
        interest_rate REAL NOT NULL,
        interest_base TEXT NOT NULL DEFAULT 'mes_30',
        term_months INTEGER NOT NULL,
        payment_frequency TEXT NOT NULL CHECK(payment_frequency IN (
          'mensal','bimestral','trimestral','semestral','anual','unica_vencimento'
        )),
        celebration_date TEXT NOT NULL,
        first_disbursement_date TEXT,
        grace_period_months INTEGER NOT NULL DEFAULT 0,
        late_interest_rate REAL NOT NULL DEFAULT 0.05,
        opening_commission REAL NOT NULL DEFAULT 1.5,
        rate_revision TEXT NOT NULL DEFAULT 'fixa',
        court_venue TEXT,
        repayment_methods TEXT NOT NULL DEFAULT '[]',
        ot_conditions TEXT,
        ot_max_maturity TEXT DEFAULT '5_anos',
        main_guarantee TEXT,
        guarantee_value REAL,
        secondary_guarantee TEXT,
        guarantee_auto_renewal INTEGER DEFAULT 1,
        digital_signature INTEGER DEFAULT 0,
        signature_type TEXT,
        signed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        created_by TEXT REFERENCES users(id),
        approved_by TEXT REFERENCES users(id),
        approved_at TEXT
      );

      INSERT INTO contracts_new (
        id, reference, contract_type, status, client_id, lender_name, lender_nif, object,
        amount, amount_text, interest_rate, interest_base, term_months, payment_frequency,
        celebration_date, first_disbursement_date, grace_period_months, late_interest_rate,
        opening_commission, rate_revision, court_venue, repayment_methods, ot_conditions,
        ot_max_maturity, main_guarantee, guarantee_value, secondary_guarantee,
        guarantee_auto_renewal, digital_signature, signature_type, signed_at, created_at,
        updated_at, deleted_at, created_by, approved_by, approved_at
      )
      SELECT
        id, reference, contract_type,
        CASE
          WHEN status IN ('elaboracao','em_formalizacao') THEN 'elaboracao'
          WHEN status IN ('recebidos','em_vigor','em_risco','vencido','liquidado') THEN 'recebidos'
          ELSE 'elaboracao'
        END,
        client_id, lender_name, lender_nif, object, amount, amount_text, interest_rate,
        interest_base, term_months, payment_frequency, celebration_date,
        first_disbursement_date, grace_period_months, late_interest_rate,
        opening_commission, rate_revision, court_venue, repayment_methods, ot_conditions,
        ot_max_maturity, main_guarantee, guarantee_value, secondary_guarantee,
        guarantee_auto_renewal, digital_signature, signature_type, signed_at, created_at,
        updated_at, deleted_at, created_by, approved_by, approved_at
      FROM contracts;

      DROP TABLE contracts;
      ALTER TABLE contracts_new RENAME TO contracts;
    `);
  })();
  db.pragma('foreign_keys = ON');
}

function migrateCommissionTypes(): void {
  const db = getDatabase();
  try { db.exec(`ALTER TABLE commission_types ADD COLUMN description TEXT`); } catch { /* already exists */ }

  const count = (db.prepare('SELECT COUNT(*) as c FROM commission_types').get() as { c: number }).c;
  if (count > 0) return;

  const ins = db.prepare(`
    INSERT INTO commission_types (id, name, calculation_base, rate_min, rate_max, periodicity, is_capitalizable, can_reinvest, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.transaction(() => {
    ins.run(uuidv4(), 'Comissão de Abertura', 'Sobre capital mutuado', 1.0, 2.5, 'Única (assinatura)', 1, 0,
      'Cobrada na data da assinatura do contrato, sobre o valor total do mútuo. Pode ser capitalizada no valor do financiamento.');
    ins.run(uuidv4(), 'Comissão de Gestão Anual', 'Sobre capital em dívida', 0.5, 2.0, 'Anual', 0, 0,
      'Cobrada anualmente sobre o capital em dívida. Remunera o acompanhamento e monitorização do contrato.');
    ins.run(uuidv4(), 'Comissão de Imobilização', 'Capital aprovado não desembolsado', 0.25, 0.25, 'Mensal', 0, 0,
      'Cobrada mensalmente sobre capital aprovado mas ainda não desembolsado. Desincentiva a paralisação dos fundos.');
    ins.run(uuidv4(), 'Comissão de Reestruturação', 'Sobre valor reestruturado', 0.5, 1.5, 'Única', 1, 0,
      'Cobrada quando o contrato é renegociado. Cobre os custos jurídicos e administrativos da alteração.');
    ins.run(uuidv4(), 'Penalidade de Pré-pagamento', 'Capital amortizado antecipadamente', 1.0, 3.0, 'Única', 0, 0,
      'Cobrada quando o mutuário paga antecipadamente. Compensa a perda de juros futuros.');
    ins.run(uuidv4(), 'Juros de Mora', 'Prestação vencida × dias em atraso', 0.05, 0.05, 'Automático (por dia)', 1, 1,
      'Acrescem automaticamente sobre qualquer prestação em atraso, desde a data de vencimento.');
  })();
  logger.info('Commission types seeded');
}

export function runMigrations(): void {
  const db = getDatabase();

  db.exec(`
    -- USERS & AUTH
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN (
        'administrador','director_executivo','director_financeiro',
        'gestor_carteira','analista_risco','juridico','contabilidade','auditor'
      )),
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT
    );

    -- AUDIT LOG
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- CLIENTS (MUTUARIOS)
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      nif TEXT UNIQUE NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN (
        'governo_central','ministerio','governo_provincial',
        'administracao_municipal','empresa_publica','empresa_dominio_publico',
        'empresa_privada','particular','entidade_mista'
      )),
      legal_representative TEXT,
      address TEXT,
      province TEXT,
      email TEXT,
      phone TEXT,
      risk_rating TEXT CHECK(risk_rating IN ('A+','A','B+','B','B-','C+','C','C-','D')),
      risk_score REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      created_by TEXT REFERENCES users(id)
    );

    -- CONTRACTS
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      contract_type TEXT NOT NULL CHECK(contract_type IN ('modelo_a','modelo_b','modelo_c')),
      status TEXT NOT NULL DEFAULT 'elaboracao' CHECK(status IN (
        'elaboracao','recebidos'
      )),
      client_id TEXT NOT NULL REFERENCES clients(id),
      lender_name TEXT NOT NULL DEFAULT 'MAIOMBE — Capital & Credit, Lda.',
      lender_nif TEXT NOT NULL DEFAULT '5000056146',
      object TEXT,
      amount REAL NOT NULL,
      amount_text TEXT,
      interest_rate REAL NOT NULL,
      interest_base TEXT NOT NULL DEFAULT 'mes_30',
      term_months INTEGER NOT NULL,
      payment_frequency TEXT NOT NULL CHECK(payment_frequency IN (
        'mensal','bimestral','trimestral','semestral','anual','unica_vencimento'
      )),
      celebration_date TEXT NOT NULL,
      first_disbursement_date TEXT,
      grace_period_months INTEGER NOT NULL DEFAULT 0,
      late_interest_rate REAL NOT NULL DEFAULT 0.05,
      opening_commission REAL NOT NULL DEFAULT 1.5,
      rate_revision TEXT NOT NULL DEFAULT 'fixa',
      court_venue TEXT,
      repayment_methods TEXT NOT NULL DEFAULT '[]',
      ot_conditions TEXT,
      ot_max_maturity TEXT DEFAULT '5_anos',
      main_guarantee TEXT,
      guarantee_value REAL,
      secondary_guarantee TEXT,
      guarantee_auto_renewal INTEGER DEFAULT 1,
      digital_signature INTEGER DEFAULT 0,
      signature_type TEXT,
      signed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      created_by TEXT REFERENCES users(id),
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT
    );

    -- CONTRACT DISBURSEMENT PHASES (Modelo C)
    CREATE TABLE IF NOT EXISTS contract_phases (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      phase_number INTEGER NOT NULL,
      percentage REAL NOT NULL,
      planned_date TEXT NOT NULL,
      release_condition TEXT,
      status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','liberado','cancelado')),
      disbursed_amount REAL,
      disbursed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- AMORTIZATION SCHEDULES
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
      status TEXT NOT NULL DEFAULT 'futuro' CHECK(status IN ('pago','pendente','vencido','futuro')),
      paid_amount REAL,
      paid_at TEXT,
      late_interest REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- PAYMENTS
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      schedule_id TEXT REFERENCES amortization_schedules(id),
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN (
        'numerario','ot','bt','transferencia','moeda_estrangeira',
        'dacao_activos','cessao_creditos','compensacao','dacao_imoveis',
        'receitas_futuras','letra_cambio'
      )),
      reference TEXT,
      notes TEXT,
      paid_at TEXT NOT NULL,
      registered_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- GUARANTEES
    CREATE TABLE IF NOT EXISTS guarantees (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      guarantee_type TEXT NOT NULL CHECK(guarantee_type IN (
        'garantia_bancaria','cessao_receitas','hipoteca','penhor_equipamentos',
        'penhor_acoes','aval_fianca','seguro_credito','consignacao_receitas_fiscais',
        'consignacao_oge','outros'
      )),
      guarantor TEXT NOT NULL,
      value REAL NOT NULL,
      coverage_percentage REAL,
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'activa' CHECK(status IN (
        'activa','expirada','em_execucao','renovacao_pendente','cancelada'
      )),
      auto_renewal INTEGER DEFAULT 1,
      renewal_alert_days INTEGER DEFAULT 30,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      created_by TEXT REFERENCES users(id)
    );

    -- LIABILITIES (PASSIVO)
    CREATE TABLE IF NOT EXISTS liabilities (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      liability_type TEXT NOT NULL CHECK(liability_type IN (
        'linha_bancaria','suprimentos','debentures','obrigacoes','co_financiamento','outros'
      )),
      creditor_name TEXT NOT NULL,
      creditor_ref TEXT,
      total_amount REAL NOT NULL,
      outstanding_amount REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0,
      interest_type TEXT DEFAULT 'fixo',
      start_date TEXT NOT NULL,
      maturity_date TEXT,
      payment_frequency TEXT,
      guarantee_given TEXT,
      status TEXT NOT NULL DEFAULT 'normal' CHECK(status IN ('normal','em_atraso','em_litigio','liquidado')),
      late_interest_rate REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      created_by TEXT REFERENCES users(id)
    );

    -- LIABILITY SCHEDULES
    CREATE TABLE IF NOT EXISTS liability_schedules (
      id TEXT PRIMARY KEY,
      liability_id TEXT NOT NULL REFERENCES liabilities(id) ON DELETE CASCADE,
      installment_number INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      capital REAL NOT NULL,
      interest REAL NOT NULL,
      total_installment REAL NOT NULL,
      residual_capital REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'futuro' CHECK(status IN ('pago','pendente','vencido','futuro')),
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- FUNDING SOURCES (FONTES)
    CREATE TABLE IF NOT EXISTS funding_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN (
        'linha_bancaria','capital_proprio','debentures','obrigacoes','parceiro','outros'
      )),
      institution TEXT,
      product TEXT,
      total_amount REAL NOT NULL,
      utilized_amount REAL NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      maturity_date TEXT,
      guarantee_given TEXT,
      status TEXT NOT NULL DEFAULT 'activa' CHECK(status IN ('activa','encerrada','pendente')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- PUBLIC DEBT SECURITIES (OT & BT)
    CREATE TABLE IF NOT EXISTS securities (
      id TEXT PRIMARY KEY,
      series TEXT UNIQUE NOT NULL,
      security_type TEXT NOT NULL CHECK(security_type IN ('OT','BT')),
      client_id TEXT NOT NULL REFERENCES clients(id),
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      face_value REAL NOT NULL,
      market_value REAL,
      yield_rate REAL,
      maturity_date TEXT NOT NULL,
      discount_accepted REAL DEFAULT 0,
      credit_deducted REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'analise' CHECK(status IN (
        'aceite','analise','negociacao','rejeitado','vencido'
      )),
      received_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    );

    -- RISK ASSESSMENTS
    CREATE TABLE IF NOT EXISTS risk_assessments (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      client_id TEXT NOT NULL REFERENCES clients(id),
      risk_level TEXT NOT NULL CHECK(risk_level IN ('baixo','medio','alto','critico')),
      overall_score REAL NOT NULL,
      payment_history_score REAL,
      financial_situation_score REAL,
      political_risk_score REAL,
      contractual_risk_score REAL,
      execution_risk_score REAL,
      liquidity_risk_score REAL,
      recommended_action TEXT,
      action_deadline TEXT,
      notes TEXT,
      assessed_at TEXT NOT NULL DEFAULT (datetime('now')),
      assessed_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- PROJECTS
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      executing_entity TEXT NOT NULL,
      beneficiary TEXT,
      location TEXT,
      province TEXT,
      sector TEXT CHECK(sector IN (
        'saude','energia','infraestrutura','habitacao','educacao',
        'agricultura','agua','transporte','outros'
      )),
      total_value REAL NOT NULL,
      financed_amount REAL NOT NULL,
      execution_percentage REAL DEFAULT 0,
      contract_id TEXT REFERENCES contracts(id),
      status TEXT NOT NULL DEFAULT 'arranque' CHECK(status IN (
        'arranque','em_execucao','concluido','suspenso','cancelado','desvio'
      )),
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    );

    -- ALERTS
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      alert_type TEXT NOT NULL CHECK(alert_type IN (
        'vencimento','incumprimento','garantia','risco','contrato',
        'ot_bt','liquidez','informativo'
      )),
      severity TEXT NOT NULL CHECK(severity IN ('urgente','atencao','informativo')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      resolved_by TEXT REFERENCES users(id),
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT
    );

    -- RATE TABLE
    CREATE TABLE IF NOT EXISTS rate_tables (
      id TEXT PRIMARY KEY,
      entity_type TEXT UNIQUE NOT NULL,
      min_rate REAL NOT NULL,
      base_rate REAL NOT NULL,
      max_rate REAL NOT NULL,
      management_commission REAL NOT NULL,
      opening_commission REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT REFERENCES users(id)
    );

    -- COMMISSION TABLE
    CREATE TABLE IF NOT EXISTS commission_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      calculation_base TEXT NOT NULL,
      rate_min REAL NOT NULL,
      rate_max REAL NOT NULL,
      periodicity TEXT NOT NULL,
      is_capitalizable INTEGER DEFAULT 0,
      can_reinvest INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- CAPITAL DE GESTÃO DA MAIOMBE
    CREATE TABLE IF NOT EXISTS management_capital (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      provider_name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('aporte_socios', 'subsidio_operacional', 'capital_proprio', 'outros')),
      received_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    );

    -- NOTIFICATION TEMPLATES
    CREATE TABLE IF NOT EXISTS notification_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('cobranca','alerta','vencimento','pre_judicial','assinatura','geral')),
      channel TEXT NOT NULL CHECK(channel IN ('whatsapp','email','ambos')),
      subject TEXT,
      body TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    );

    -- AUTOMATION RULES (triggers de envio automático)
    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      trigger_type TEXT NOT NULL CHECK(trigger_type IN ('preventive','post_default')),
      days_offset INTEGER NOT NULL,
      template_id TEXT REFERENCES notification_templates(id),
      channel TEXT NOT NULL DEFAULT 'ambos' CHECK(channel IN ('whatsapp','email','ambos')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- CC RECIPIENTS (cópia automática em emails de automação)
    CREATE TABLE IF NOT EXISTS automation_cc (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('dir_financeiro','juridico','gestor_conta','outro')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- NOTIFICATION LOGS
    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('whatsapp','email')),
      channel TEXT NOT NULL CHECK(channel IN ('cobranca','assinatura','alerta','geral')),
      recipient_name TEXT,
      recipient_phone TEXT,
      recipient_email TEXT,
      subject TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','failed','pending')),
      error TEXT,
      contract_id TEXT REFERENCES contracts(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    );

    -- DIGITAL SIGNATURES
    CREATE TABLE IF NOT EXISTS digital_signatures (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      contract_id TEXT REFERENCES contracts(id),
      document_type TEXT NOT NULL DEFAULT 'contrato',
      signer_name TEXT NOT NULL,
      signer_phone TEXT,
      signer_email TEXT,
      signer_role TEXT NOT NULL DEFAULT 'mutuario',
      document_title TEXT NOT NULL,
      document_summary TEXT,
      status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','assinado','recusado','expirado')),
      ip_address TEXT,
      user_agent TEXT,
      signed_at TEXT,
      expires_at TEXT NOT NULL,
      sent_via TEXT NOT NULL DEFAULT 'email' CHECK(sent_via IN ('whatsapp','email','ambos')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    );

    -- INDEXES
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_contracts_reference ON contracts(reference);
    CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
    CREATE INDEX IF NOT EXISTS idx_amortization_contract ON amortization_schedules(contract_id);
    CREATE INDEX IF NOT EXISTS idx_amortization_due ON amortization_schedules(due_date);
    CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
    CREATE INDEX IF NOT EXISTS idx_guarantees_contract ON guarantees(contract_id);
    CREATE INDEX IF NOT EXISTS idx_liabilities_status ON liabilities(status);
    CREATE INDEX IF NOT EXISTS idx_securities_contract ON securities(contract_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_notif_contract ON notification_logs(contract_id);
    CREATE INDEX IF NOT EXISTS idx_sig_token ON digital_signatures(token);
    CREATE INDEX IF NOT EXISTS idx_sig_contract ON digital_signatures(contract_id);
    CREATE INDEX IF NOT EXISTS idx_sig_status ON digital_signatures(status);
  `);

  migrateContractsStatusConstraint();
  migrateCommissionTypes();
  seedAutomationDefaults();

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_contracts_reference ON contracts(reference);
    CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
  `);

  logger.info('Database migrations completed');
}

function seedAutomationDefaults() {
  const db = getDatabase();
  const already = db.prepare('SELECT COUNT(*) as n FROM notification_templates').get() as { n: number };
  if (already.n > 0) return;

  const now = new Date().toISOString();

  const templates = [
    {
      id: uuidv4(), name: 'Alerta Preventivo — WhatsApp', category: 'vencimento', channel: 'whatsapp',
      subject: null,
      body: `Olá *{{nome_cliente}}*,\n\nA sua prestação nº {{numero_prestacao}} do contrato *{{referencia}}* vence em *{{dias_restantes}} dias* ({{data_vencimento}}).\n\nValor: *{{valor_prestacao}} Kz*\n\nRegularize atempadamente para evitar juros de mora.\n\n_MAIOMBE — Sistema de Gestão de Crédito_`,
    },
    {
      id: uuidv4(), name: 'Alerta Preventivo — Email', category: 'vencimento', channel: 'email',
      subject: 'MAIOMBE · Notificação de Prestação · Vencimento em {{dias_restantes}} dias',
      body: `Estimado/a {{nome_cliente}},\n\nVimos por este meio informar que a prestação nº {{numero_prestacao}} do contrato {{referencia}} tem vencimento previsto para {{data_vencimento}}, ou seja, daqui a {{dias_restantes}} dias.\n\nValor da prestação: {{valor_prestacao}} Kz\n\nAgradecemos que proceda ao pagamento até à data de vencimento para evitar a aplicação de juros de mora.\n\nPara qualquer esclarecimento, não hesite em contactar o seu gestor de conta.\n\nAtenciosamente,\nMAIOMBE — Sistema de Gestão de Crédito`,
    },
    {
      id: uuidv4(), name: 'Pós-Incumprimento — WhatsApp', category: 'cobranca', channel: 'whatsapp',
      subject: null,
      body: `Olá *{{nome_cliente}}*,\n\nA sua prestação nº {{numero_prestacao}} do contrato *{{referencia}}* encontra-se vencida há *{{dias_atraso}} dias*.\n\nValor em dívida: *{{valor_prestacao}} Kz*\nJuros de mora acumulados: *{{valor_mora}} Kz*\n\nRegularize imediatamente para evitar consequências adicionais.\n\n_MAIOMBE — Sistema de Gestão de Crédito_`,
    },
    {
      id: uuidv4(), name: 'Pós-Incumprimento — Email', category: 'cobranca', channel: 'email',
      subject: 'MAIOMBE · AVISO DE INCUMPRIMENTO · Contrato {{referencia}} · {{dias_atraso}} dias em atraso',
      body: `Estimado/a {{nome_cliente}},\n\nVimos por este meio notificar que a prestação nº {{numero_prestacao}} do contrato {{referencia}} se encontra em situação de incumprimento há {{dias_atraso}} dias.\n\nValor da prestação: {{valor_prestacao}} Kz\nJuros de mora acumulados: {{valor_mora}} Kz\nTotal em dívida: {{valor_total_divida}} Kz\n\nSolicitamos que regularize a sua situação com a maior brevidade possível.\n\nAtenciosamente,\nMAIOMBE — Sistema de Gestão de Crédito`,
    },
    {
      id: uuidv4(), name: 'Notificação Formal (D+15)', category: 'pre_judicial', channel: 'email',
      subject: 'MAIOMBE · NOTIFICAÇÃO FORMAL · Contrato {{referencia}} · Incumprimento',
      body: `Estimado/a {{nome_cliente}},\n\nServe a presente para formalmente notificar V. Exa. de que o contrato {{referencia}} se encontra em incumprimento há {{dias_atraso}} dias, com o valor total em dívida de {{valor_total_divida}} Kz.\n\nNos termos do contrato celebrado e da legislação aplicável, caso não seja efectuado o pagamento no prazo de 5 (cinco) dias úteis a contar da recepção desta notificação, a MAIOMBE reserva-se o direito de accionar os meios legais disponíveis para recuperação do crédito.\n\nAtenciosamente,\nMAIOMBE — Capital & Credit, Lda.\nDepartamento Jurídico`,
    },
    {
      id: uuidv4(), name: 'Pré-Judicial (D+30)', category: 'pre_judicial', channel: 'email',
      subject: 'MAIOMBE · ÚLTIMA NOTIFICAÇÃO PRÉ-JUDICIAL · Contrato {{referencia}}',
      body: `Estimado/a {{nome_cliente}},\n\nEsta é a última notificação antes de ser dado início ao processo judicial de recuperação de crédito.\n\nContrato: {{referencia}}\nDias em atraso: {{dias_atraso}}\nTotal em dívida: {{valor_total_divida}} Kz\n\nCaso não seja efectuado o pagamento integral no prazo de 3 (três) dias úteis, o processo será remetido para o nosso departamento jurídico para efeitos de acção judicial.\n\nMAIOMBE — Capital & Credit, Lda.\nDepartamento Jurídico`,
    },
  ];

  const tmpl = db.prepare(`INSERT OR IGNORE INTO notification_templates (id,name,category,channel,subject,body,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)`);
  templates.forEach(t => tmpl.run(t.id, t.name, t.category, t.channel, t.subject || null, t.body, now, now));

  // Regras de automação padrão
  const rules = [
    // Preventivos
    { label: '30 dias antes', trigger_type: 'preventive', days_offset: 30, channel: 'email', tmplIdx: 1 },
    { label: '15 dias antes', trigger_type: 'preventive', days_offset: 15, channel: 'email', tmplIdx: 1 },
    { label: '7 dias antes',  trigger_type: 'preventive', days_offset: 7,  channel: 'ambos', tmplIdx: 0 },
    { label: '3 dias antes',  trigger_type: 'preventive', days_offset: 3,  channel: 'ambos', tmplIdx: 0 },
    { label: '1 dia antes',   trigger_type: 'preventive', days_offset: 1,  channel: 'ambos', tmplIdx: 0 },
    // Pós-incumprimento
    { label: 'D+1',           trigger_type: 'post_default', days_offset: 1,  channel: 'ambos', tmplIdx: 2 },
    { label: 'D+7',           trigger_type: 'post_default', days_offset: 7,  channel: 'ambos', tmplIdx: 2 },
    { label: 'D+15 (formal)', trigger_type: 'post_default', days_offset: 15, channel: 'email', tmplIdx: 4 },
    { label: 'D+30 (pré-judicial)', trigger_type: 'post_default', days_offset: 30, channel: 'email', tmplIdx: 5 },
  ];

  const rule = db.prepare(`INSERT OR IGNORE INTO automation_rules (id,label,trigger_type,days_offset,template_id,channel,is_active,created_at) VALUES (?,?,?,?,?,?,1,?)`);
  rules.forEach(r => rule.run(uuidv4(), r.label, r.trigger_type, r.days_offset, templates[r.tmplIdx].id, r.channel, now));
}

if (require.main === module) {
  runMigrations();
  process.exit(0);
}
