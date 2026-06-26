import { getDatabase } from './connection';
import { runMigrations } from './migrate';
import { v4 as uuidv4 } from 'uuid';
import argon2 from 'argon2';
import { logger } from '../utils/logger';

async function seed() {
  runMigrations();
  const db = getDatabase();

  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existing.count > 0) {
    logger.info('Database already seeded, skipping...');
    return;
  }

  // USERS  — email: perfil@sistema.com  |  senha: 12345
  const SEED_USERS = [
    { id: uuidv4(), role: 'administrador',       name: 'Administrador'       },
    { id: uuidv4(), role: 'director_executivo',  name: 'Director Executivo'  },
    { id: uuidv4(), role: 'director_financeiro', name: 'Director Financeiro' },
    { id: uuidv4(), role: 'gestor_carteira',     name: 'Gestor de Carteira'  },
    { id: uuidv4(), role: 'analista_risco',      name: 'Analista de Risco'   },
    { id: uuidv4(), role: 'juridico',            name: 'Jurídico'            },
    { id: uuidv4(), role: 'contabilidade',       name: 'Contabilidade'       },
    { id: uuidv4(), role: 'auditor',             name: 'Auditor'             },
  ];

  const passwordHash = await argon2.hash('12345');
  const adminId = SEED_USERS[0].id;

  const insertUser = db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`
  );

  db.transaction(() => {
    for (const u of SEED_USERS) {
      insertUser.run(u.id, u.name, `${u.role}@sistema.com`, passwordHash, u.role);
    }
  })();

  // CLIENTS
  const clients = [
    { id: uuidv4(), code: 'CLI-001', name: 'Governo Provincial de Luanda', nif: '5000100001', entity_type: 'governo_provincial', province: 'Luanda', risk_rating: 'B+', risk_score: 7.2 },
    { id: uuidv4(), code: 'CLI-002', name: 'Empresa Nacional de Energia', nif: '5000100002', entity_type: 'empresa_publica', province: 'Luanda', risk_rating: 'C+', risk_score: 4.8 },
    { id: uuidv4(), code: 'CLI-003', name: 'Governo Provincial de Cuanza Sul', nif: '5000100003', entity_type: 'governo_provincial', province: 'Cuanza Sul', risk_rating: 'B-', risk_score: 4.2 },
    { id: uuidv4(), code: 'CLI-004', name: 'Construtora Atlântico LDA', nif: '5000100004', entity_type: 'empresa_privada', province: 'Luanda', risk_rating: 'B+', risk_score: 7.0 },
    { id: uuidv4(), code: 'CLI-005', name: 'Ministério da Saúde', nif: '5000100005', entity_type: 'ministerio', province: 'Luanda', risk_rating: 'A', risk_score: 8.5 },
    { id: uuidv4(), code: 'CLI-006', name: 'Administração Municipal de Cacuaco', nif: '5000100006', entity_type: 'administracao_municipal', province: 'Luanda', risk_rating: 'C', risk_score: 2.8 },
    { id: uuidv4(), code: 'CLI-007', name: 'Governo Provincial do Bié', nif: '5000100007', entity_type: 'governo_provincial', province: 'Bié', risk_rating: 'B', risk_score: 6.5 },
    { id: uuidv4(), code: 'CLI-008', name: 'Constroangola SA', nif: '5000100008', entity_type: 'empresa_privada', province: 'Luanda', risk_rating: 'B', risk_score: 6.0 },
    { id: uuidv4(), code: 'CLI-009', name: 'Administração Municipal de Viana', nif: '5000100009', entity_type: 'administracao_municipal', province: 'Luanda', risk_rating: 'B-', risk_score: 5.8 },
    { id: uuidv4(), code: 'CLI-010', name: 'Governo Provincial de Malanje', nif: '5000100010', entity_type: 'governo_provincial', province: 'Malanje', risk_rating: 'B+', risk_score: 7.5 },
    { id: uuidv4(), code: 'CLI-011', name: 'Transportes Maputo Lda.', nif: '5000100011', entity_type: 'empresa_privada', province: 'Luanda', risk_rating: 'C', risk_score: 3.1 },
    { id: uuidv4(), code: 'CLI-012', name: 'Administração Municipal da Samba', nif: '5000100012', entity_type: 'administracao_municipal', province: 'Luanda', risk_rating: 'C+', risk_score: 5.0 },
    { id: uuidv4(), code: 'CLI-013', name: 'Construções Sonangol SA', nif: '5000100013', entity_type: 'empresa_dominio_publico', province: 'Luanda', risk_rating: 'B+', risk_score: 7.8 },
  ];

  const insertClient = db.prepare(`
    INSERT INTO clients (id, code, name, nif, entity_type, province, risk_rating, risk_score, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const c of clients) {
      insertClient.run(c.id, c.code, c.name, c.nif, c.entity_type, c.province, c.risk_rating, c.risk_score, adminId);
    }
  })();

  const clientMap = Object.fromEntries(clients.map(c => [c.code, c.id]));

  // CONTRACTS
  const contracts = [
    {
      id: uuidv4(), reference: 'MAI-2026-024', contract_type: 'modelo_a', status: 'recebidos',
      client_id: clientMap['CLI-001'], amount: 1200000000, interest_rate: 15.5, term_months: 36,
      payment_frequency: 'semestral', celebration_date: '2026-06-16', first_disbursement_date: '2026-07-01',
      late_interest_rate: 0.05, opening_commission: 1.25, repayment_methods: '["numerario"]',
      main_guarantee: 'cessao_receitas', guarantee_value: 1450000000, object: 'Financiamento de infraestruturas',
      digital_signature: 1, signature_type: 'Digital', rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2026-021', contract_type: 'modelo_a', status: 'recebidos',
      client_id: clientMap['CLI-002'], amount: 3500000000, interest_rate: 16.0, term_months: 36,
      payment_frequency: 'semestral', celebration_date: '2026-03-10', first_disbursement_date: '2026-03-15',
      late_interest_rate: 0.05, opening_commission: 1.5, repayment_methods: '["ot"]',
      main_guarantee: 'garantia_bancaria', guarantee_value: 4000000000, object: 'Financiamento reabilitação',
      digital_signature: 1, signature_type: 'Digital', rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2025-038', contract_type: 'modelo_a', status: 'recebidos',
      client_id: clientMap['CLI-003'], amount: 850000000, interest_rate: 14.8, term_months: 24,
      payment_frequency: 'semestral', celebration_date: '2025-08-01', first_disbursement_date: '2025-08-01',
      late_interest_rate: 0.05, opening_commission: 1.25, repayment_methods: '["ot","numerario"]',
      main_guarantee: 'cessao_receitas', guarantee_value: 950000000, object: 'Equipamento hospitalar',
      digital_signature: 1, signature_type: 'Escritura', rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2025-031', contract_type: 'modelo_b', status: 'recebidos',
      client_id: clientMap['CLI-004'], amount: 2100000000, interest_rate: 17.5, term_months: 36,
      payment_frequency: 'semestral', celebration_date: '2025-06-01', first_disbursement_date: '2025-06-01',
      late_interest_rate: 0.05, opening_commission: 2.0, repayment_methods: '["numerario"]',
      main_guarantee: 'hipoteca', guarantee_value: 2800000000, object: 'Projecto habitacional',
      digital_signature: 1, signature_type: 'Digital', rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2024-018', contract_type: 'modelo_a', status: 'recebidos',
      client_id: clientMap['CLI-005'], amount: 5800000000, interest_rate: 13.9, term_months: 36,
      payment_frequency: 'semestral', celebration_date: '2024-01-01', first_disbursement_date: '2024-01-01',
      late_interest_rate: 0.05, opening_commission: 0.75, repayment_methods: '["bt"]',
      main_guarantee: 'consignacao_oge', guarantee_value: 6200000000, object: 'Material médico-hospitalar',
      digital_signature: 1, signature_type: 'Escritura', rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2024-009', contract_type: 'modelo_b', status: 'recebidos',
      client_id: clientMap['CLI-006'], amount: 480000000, interest_rate: 15.0, term_months: 24,
      payment_frequency: 'semestral', celebration_date: '2024-05-15', first_disbursement_date: '2024-05-15',
      late_interest_rate: 0.05, opening_commission: 1.5, repayment_methods: '["numerario"]',
      main_guarantee: 'penhor_equipamentos', guarantee_value: 380000000, object: 'Aquisição de equipamentos',
      digital_signature: 1, signature_type: 'Digital', rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2026-025', contract_type: 'modelo_a', status: 'elaboracao',
      client_id: clientMap['CLI-007'], amount: 620000000, interest_rate: 14.0, term_months: 24,
      payment_frequency: 'semestral', celebration_date: '2026-06-10', first_disbursement_date: '2026-07-01',
      late_interest_rate: 0.05, opening_commission: 1.25, repayment_methods: '["numerario","ot"]',
      main_guarantee: 'cessao_receitas', guarantee_value: 700000000, object: 'Financiamento público',
      digital_signature: 0, rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2026-026', contract_type: 'modelo_b', status: 'elaboracao',
      client_id: clientMap['CLI-008'], amount: 1800000000, interest_rate: 17.0, term_months: 36,
      payment_frequency: 'semestral', celebration_date: '2026-06-12', first_disbursement_date: '2026-07-15',
      late_interest_rate: 0.05, opening_commission: 2.0, repayment_methods: '["numerario"]',
      main_guarantee: 'garantia_bancaria', guarantee_value: 2100000000, object: 'Projecto privado',
      digital_signature: 0, rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2026-027', contract_type: 'modelo_a', status: 'elaboracao',
      client_id: clientMap['CLI-009'], amount: 340000000, interest_rate: 15.0, term_months: 24,
      payment_frequency: 'semestral', celebration_date: '2026-06-14', first_disbursement_date: '2026-07-01',
      late_interest_rate: 0.05, opening_commission: 1.5, repayment_methods: '["numerario"]',
      main_guarantee: 'cessao_receitas', guarantee_value: 400000000, object: 'Financiamento municipal',
      digital_signature: 0, rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2025-019', contract_type: 'modelo_a', status: 'recebidos',
      client_id: clientMap['CLI-010'], amount: 430000000, interest_rate: 14.0, term_months: 12,
      payment_frequency: 'semestral', celebration_date: '2025-01-15', first_disbursement_date: '2025-02-01',
      late_interest_rate: 0.05, opening_commission: 1.25, repayment_methods: '["ot"]',
      main_guarantee: 'cessao_receitas', guarantee_value: 500000000, object: 'Infra-estruturas',
      digital_signature: 1, signature_type: 'Escritura', rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2023-017', contract_type: 'modelo_b', status: 'recebidos',
      client_id: clientMap['CLI-011'], amount: 420000000, interest_rate: 18.0, term_months: 24,
      payment_frequency: 'mensal', celebration_date: '2023-06-01', first_disbursement_date: '2023-07-01',
      late_interest_rate: 0.05, opening_commission: 2.0, repayment_methods: '["numerario"]',
      main_guarantee: 'penhor_equipamentos', guarantee_value: 350000000, object: 'Capital de giro',
      digital_signature: 1, signature_type: 'Digital', rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2024-015', contract_type: 'modelo_b', status: 'recebidos',
      client_id: clientMap['CLI-012'], amount: 280000000, interest_rate: 15.5, term_months: 24,
      payment_frequency: 'mensal', celebration_date: '2024-03-01', first_disbursement_date: '2024-04-01',
      late_interest_rate: 0.05, opening_commission: 1.5, repayment_methods: '["numerario"]',
      main_guarantee: 'aval_fianca', guarantee_value: 300000000, object: 'Equipamentos administrativos',
      digital_signature: 1, signature_type: 'Digital', rate_revision: 'fixa',
    },
    {
      id: uuidv4(), reference: 'MAI-2022-003', contract_type: 'modelo_b', status: 'recebidos',
      client_id: clientMap['CLI-013'], amount: 4200000000, interest_rate: 16.0, term_months: 48,
      payment_frequency: 'semestral', celebration_date: '2022-02-15', first_disbursement_date: '2022-03-01',
      late_interest_rate: 0.05, opening_commission: 1.5, repayment_methods: '["numerario"]',
      main_guarantee: 'hipoteca', guarantee_value: 5000000000, object: 'Projecto habitacional',
      digital_signature: 1, signature_type: 'Escritura', rate_revision: 'fixa',
    },
  ];

  const insertContract = db.prepare(`
    INSERT INTO contracts (
      id, reference, contract_type, status, client_id, amount, interest_rate, term_months,
      payment_frequency, celebration_date, first_disbursement_date, late_interest_rate,
      opening_commission, repayment_methods, main_guarantee, guarantee_value, object,
      digital_signature, signature_type, rate_revision, created_by, approved_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const c of contracts) {
      insertContract.run(
        c.id, c.reference, c.contract_type, c.status, c.client_id,
        c.amount, c.interest_rate, c.term_months, c.payment_frequency,
        c.celebration_date, c.first_disbursement_date || null, c.late_interest_rate,
        c.opening_commission, c.repayment_methods, c.main_guarantee, c.guarantee_value,
        c.object, c.digital_signature || 0, c.signature_type || null, c.rate_revision,
        adminId, adminId
      );
    }
  })();

  // LIABILITIES
  const liabilities = [
    {
      id: uuidv4(), reference: 'MAI/PASSIVO/2023/001', liability_type: 'linha_bancaria',
      creditor_name: 'BFA — Linha Fomento Empresarial', creditor_ref: 'LFE-2023-MAI',
      total_amount: 20000000000, outstanding_amount: 17000000000, interest_rate: 14.5,
      start_date: '2023-03-15', maturity_date: '2028-03-15', payment_frequency: 'semestral',
      guarantee_given: 'Hipoteca sede', status: 'normal', late_interest_rate: 0.08,
    },
    {
      id: uuidv4(), reference: 'MAI/PASSIVO/2022/001', liability_type: 'suprimentos',
      creditor_name: 'Alpinea Investimentos — Acordo de Suprimentos',
      total_amount: 16200000000, outstanding_amount: 16200000000, interest_rate: 0,
      start_date: '2022-01-01', maturity_date: null, payment_frequency: null,
      guarantee_given: null, status: 'normal', late_interest_rate: 0,
    },
    {
      id: uuidv4(), reference: 'MAI/PASSIVO/2024/001', liability_type: 'debentures',
      creditor_name: 'Investidores Privados — Debêntures Série A',
      total_amount: 9100000000, outstanding_amount: 9100000000, interest_rate: 16,
      start_date: '2024-07-01', maturity_date: '2027-07-01', payment_frequency: 'anual',
      guarantee_given: 'Cessão carteira crédito', status: 'normal', late_interest_rate: 0,
    },
  ];

  const insertLiability = db.prepare(`
    INSERT INTO liabilities (id, reference, liability_type, creditor_name, creditor_ref, total_amount,
      outstanding_amount, interest_rate, start_date, maturity_date, payment_frequency,
      guarantee_given, status, late_interest_rate, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const l of liabilities) {
      insertLiability.run(
        l.id, l.reference, l.liability_type, l.creditor_name, l.creditor_ref || null,
        l.total_amount, l.outstanding_amount, l.interest_rate, l.start_date,
        l.maturity_date || null, l.payment_frequency || null, l.guarantee_given || null,
        l.status, l.late_interest_rate, adminId
      );
    }
  })();

  // FUNDING SOURCES
  const fundingSources = [
    { id: uuidv4(), name: 'BFA — Linha Fomento Empresarial', source_type: 'linha_bancaria', institution: 'BFA', product: 'Linha Fomento Empresarial', total_amount: 20000000000, utilized_amount: 18600000000, interest_rate: 14.5, maturity_date: '2028-03-15', guarantee_given: 'Hipoteca sede', status: 'activa' },
    { id: uuidv4(), name: 'BAI — Crédito Sindicado', source_type: 'linha_bancaria', institution: 'BAI', product: 'Crédito Sindicado', total_amount: 8500000000, utilized_amount: 5100000000, interest_rate: 15.2, maturity_date: '2027-06-01', guarantee_given: 'Carteira crédito', status: 'activa' },
    { id: uuidv4(), name: 'BPC — Linha Especial Estado', source_type: 'linha_bancaria', institution: 'BPC', product: 'Linha Especial Estado', total_amount: 5200000000, utilized_amount: 2080000000, interest_rate: 13.5, maturity_date: '2030-12-31', guarantee_given: 'Cessão receitas', status: 'activa' },
    { id: uuidv4(), name: 'Alpinea Investimentos', source_type: 'capital_proprio', institution: 'Alpinea', product: 'Acordo de Suprimentos', total_amount: 16200000000, utilized_amount: 16200000000, interest_rate: 0, maturity_date: null, guarantee_given: null, status: 'activa' },
    { id: uuidv4(), name: 'Investidor Privado A — Debêntures', source_type: 'debentures', institution: null, product: 'Debêntures Série A', total_amount: 5400000000, utilized_amount: 5400000000, interest_rate: 16, maturity_date: '2027-07-01', guarantee_given: null, status: 'activa' },
    { id: uuidv4(), name: 'Fundo de Pensões XYZ', source_type: 'obrigacoes', institution: null, product: 'Obrigações', total_amount: 3700000000, utilized_amount: 3700000000, interest_rate: 15.5, maturity_date: '2028-10-01', guarantee_given: 'Carteira crédito', status: 'activa' },
    { id: uuidv4(), name: 'Parceiros Estratégicos Regionais', source_type: 'parceiro', institution: null, product: 'Co-financiamento', total_amount: 4000000000, utilized_amount: 4000000000, interest_rate: 0, maturity_date: null, guarantee_given: null, status: 'activa' },
  ];

  const insertFunding = db.prepare(`
    INSERT INTO funding_sources (id, name, source_type, institution, product, total_amount,
      utilized_amount, interest_rate, maturity_date, guarantee_given, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const f of fundingSources) {
      insertFunding.run(
        f.id, f.name, f.source_type, f.institution || null, f.product,
        f.total_amount, f.utilized_amount, f.interest_rate, f.maturity_date || null,
        f.guarantee_given || null, f.status
      );
    }
  })();

  // RATE TABLES
  const rateTables = [
    { id: uuidv4(), entity_type: 'Governo Central', min_rate: 10.0, base_rate: 12.0, max_rate: 14.0, management_commission: 0.5, opening_commission: 0.75 },
    { id: uuidv4(), entity_type: 'Ministérios', min_rate: 11.0, base_rate: 13.0, max_rate: 15.0, management_commission: 0.5, opening_commission: 1.0 },
    { id: uuidv4(), entity_type: 'Governos Provinciais', min_rate: 12.0, base_rate: 14.8, max_rate: 17.0, management_commission: 0.75, opening_commission: 1.25 },
    { id: uuidv4(), entity_type: 'Administrações Municipais', min_rate: 13.0, base_rate: 15.5, max_rate: 18.5, management_commission: 1.0, opening_commission: 1.5 },
    { id: uuidv4(), entity_type: 'Empresas Públicas (E.P.)', min_rate: 14.0, base_rate: 16.0, max_rate: 19.0, management_commission: 1.0, opening_commission: 1.5 },
    { id: uuidv4(), entity_type: 'Empresas Privadas', min_rate: 15.0, base_rate: 17.5, max_rate: 22.0, management_commission: 1.5, opening_commission: 2.0 },
    { id: uuidv4(), entity_type: 'Particulares', min_rate: 18.0, base_rate: 20.0, max_rate: 25.0, management_commission: 2.0, opening_commission: 2.5 },
  ];

  const insertRate = db.prepare(`
    INSERT INTO rate_tables (id, entity_type, min_rate, base_rate, max_rate, management_commission, opening_commission, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const r of rateTables) {
      insertRate.run(r.id, r.entity_type, r.min_rate, r.base_rate, r.max_rate, r.management_commission, r.opening_commission, adminId);
    }
  })();

  // ALERTS
  const contractMap = Object.fromEntries(contracts.map(c => [c.reference, c.id]));

  const alerts = [
    { id: uuidv4(), alert_type: 'vencimento', severity: 'urgente', title: 'Prestação vence em 3 dias — Gov. Prov. Cuanza Sul', description: 'Contrato MAI-2025-038 · Valor: 212.500.000 Kz · 4 tentativas de contacto sem confirmação de pagamento', entity_type: 'contract', entity_id: contractMap['MAI-2025-038'] },
    { id: uuidv4(), alert_type: 'incumprimento', severity: 'urgente', title: 'Incumprimento confirmado — Adm. Mun. Cacuaco', description: 'Contrato MAI-2024-009 · 480M Kz vencidos · Processo judicial n.º 127/26 activo · Execução de garantia em curso', entity_type: 'contract', entity_id: contractMap['MAI-2024-009'] },
    { id: uuidv4(), alert_type: 'contrato', severity: 'urgente', title: 'Prazo de assinatura a expirar — MAI-2026-025', description: 'Gov. Prov. Bié · Prazo limite para assinatura: 20/Jun/2026 · Contrato de 620M Kz em risco de caducidade', entity_type: 'contract', entity_id: contractMap['MAI-2026-025'] },
    { id: uuidv4(), alert_type: 'garantia', severity: 'atencao', title: 'Garantia bancária a expirar em 29 dias — BAI', description: 'Contrato MAI-2026-021 · Carta de garantia BAI expira em 15/Jul/2026 · Solicitação de renovação necessária', entity_type: 'contract', entity_id: contractMap['MAI-2026-021'] },
    { id: uuidv4(), alert_type: 'risco', severity: 'atencao', title: 'Score de risco degradado — Emp. Nacional Energia', description: 'Score baixou de 5.8 para 4.8 após atraso de 5 dias na prestação de Junho. Reclassificação: Médio → Alto', entity_type: 'contract', entity_id: contractMap['MAI-2026-021'] },
    { id: uuidv4(), alert_type: 'ot_bt', severity: 'atencao', title: 'OT recebidas — análise de valor pendente', description: 'OT-2026-002 · Emp. Nac. Energia entregou OT no valor facial de 1.200M Kz · Desconto negociado: -8% · Diferença: 96M Kz', entity_type: 'contract', entity_id: contractMap['MAI-2026-021'] },
    { id: uuidv4(), alert_type: 'garantia', severity: 'atencao', title: 'Dotação OGE — renovação pendente', description: 'GAR-003 · Consignação dotação Min. Saúde expira a 31/Dez/2026 · Processo de renovação para 2027 deve iniciar-se agora', entity_type: 'contract', entity_id: contractMap['MAI-2024-018'] },
    { id: uuidv4(), alert_type: 'contrato', severity: 'informativo', title: 'Contrato assinado digitalmente — MAI-2026-024', description: 'Gov. Prov. Luanda · 1.200M Kz · Pronto para desembolso · Garantia registada', entity_type: 'contract', entity_id: contractMap['MAI-2026-024'] },
    { id: uuidv4(), alert_type: 'liquidez', severity: 'informativo', title: 'Nova linha de crédito BFA disponível', description: 'Linha Fomento Empresarial · 1.400M Kz disponíveis · Taxa: 14.5% · Disponível para nova aplicação', entity_type: 'funding', entity_id: null },
  ];

  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, alert_type, severity, title, description, entity_type, entity_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const a of alerts) {
      insertAlert.run(a.id, a.alert_type, a.severity, a.title, a.description, a.entity_type, a.entity_id || null);
    }
  })();

  // GUARANTEES
  const guarantees = [
    { id: uuidv4(), reference: 'GAR-001', contract_id: contractMap['MAI-2026-024'], guarantee_type: 'cessao_receitas', guarantor: 'Receitas fiscais Gov. Luanda', value: 1450000000, coverage_percentage: 121, start_date: '2026-07-01', expiry_date: '2029-07-31', status: 'activa', auto_renewal: 1 },
    { id: uuidv4(), reference: 'GAR-002', contract_id: contractMap['MAI-2026-021'], guarantee_type: 'garantia_bancaria', guarantor: 'BAI — Carta de garantia', value: 4000000000, coverage_percentage: 114, start_date: '2026-03-15', expiry_date: '2029-03-15', status: 'activa', auto_renewal: 1 },
    { id: uuidv4(), reference: 'GAR-003', contract_id: contractMap['MAI-2024-018'], guarantee_type: 'consignacao_oge', guarantor: 'Dotação Min. Saúde — OGE 2026', value: 6200000000, coverage_percentage: 107, start_date: '2024-01-01', expiry_date: '2026-12-31', status: 'renovacao_pendente', auto_renewal: 1 },
    { id: uuidv4(), reference: 'GAR-004', contract_id: contractMap['MAI-2025-031'], guarantee_type: 'hipoteca', guarantor: 'Imóvel — Rua da Missão, Luanda', value: 2800000000, coverage_percentage: 133, start_date: '2025-06-01', expiry_date: '2028-06-01', status: 'activa', auto_renewal: 0 },
    { id: uuidv4(), reference: 'GAR-005', contract_id: contractMap['MAI-2024-009'], guarantee_type: 'penhor_equipamentos', guarantor: 'Frota veículos Adm. Cacuaco', value: 380000000, coverage_percentage: 79, start_date: '2024-05-15', expiry_date: '2026-05-15', status: 'em_execucao', auto_renewal: 0 },
  ];

  const insertGuarantee = db.prepare(`
    INSERT INTO guarantees (id, reference, contract_id, guarantee_type, guarantor, value, coverage_percentage, start_date, expiry_date, status, auto_renewal, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const g of guarantees) {
      insertGuarantee.run(
        g.id, g.reference, g.contract_id, g.guarantee_type, g.guarantor,
        g.value, g.coverage_percentage, g.start_date, g.expiry_date,
        g.status, g.auto_renewal, adminId
      );
    }
  })();

  // SECURITIES (OT & BT)
  const securities = [
    { id: uuidv4(), series: 'OT-2026-001', security_type: 'OT', client_id: clientMap['CLI-010'], contract_id: contractMap['MAI-2025-019'], face_value: 500000000, yield_rate: 12.5, maturity_date: '2031-06-15', discount_accepted: 0, credit_deducted: 500000000, status: 'aceite', received_at: '2026-01-15' },
    { id: uuidv4(), series: 'OT-2026-002', security_type: 'OT', client_id: clientMap['CLI-002'], contract_id: contractMap['MAI-2026-021'], face_value: 1200000000, yield_rate: 12.0, maturity_date: '2031-01-01', discount_accepted: -8, credit_deducted: 1104000000, status: 'negociacao', received_at: '2026-06-10' },
    { id: uuidv4(), series: 'BT-2026-003', security_type: 'BT', client_id: clientMap['CLI-005'], contract_id: contractMap['MAI-2024-018'], face_value: 430000000, yield_rate: 13.2, maturity_date: '2026-09-15', discount_accepted: 0, credit_deducted: 430000000, status: 'aceite', received_at: '2026-06-15' },
    { id: uuidv4(), series: 'OT-2025-004', security_type: 'OT', client_id: clientMap['CLI-003'], contract_id: contractMap['MAI-2025-038'], face_value: 170000000, yield_rate: 11.8, maturity_date: '2028-06-01', discount_accepted: -15, credit_deducted: 144500000, status: 'analise', received_at: '2026-06-16' },
  ];

  const insertSecurity = db.prepare(`
    INSERT INTO securities (id, series, security_type, client_id, contract_id, face_value,
      yield_rate, maturity_date, discount_accepted, credit_deducted, status, received_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const s of securities) {
      insertSecurity.run(
        s.id, s.series, s.security_type, s.client_id, s.contract_id,
        s.face_value, s.yield_rate, s.maturity_date, s.discount_accepted,
        s.credit_deducted, s.status, s.received_at, adminId
      );
    }
  })();

  // PROJECTS
  const projects = [
    { id: uuidv4(), code: 'PRJ-001', name: 'Reabilitação Hospital Central de Luanda', executing_entity: 'Constroangola SA', beneficiary: 'Gov. Prov. Luanda', location: 'Luanda', province: 'Luanda', sector: 'saude', total_value: 1800000000, financed_amount: 1200000000, execution_percentage: 35, contract_id: contractMap['MAI-2026-024'], status: 'em_execucao' },
    { id: uuidv4(), code: 'PRJ-002', name: 'Rede de Distribuição Eléctrica — Cunhinga', executing_entity: 'Emp. Nac. Energia', beneficiary: 'Min. Energia', location: 'Bié', province: 'Bié', sector: 'energia', total_value: 4200000000, financed_amount: 3500000000, execution_percentage: 62, contract_id: contractMap['MAI-2026-021'], status: 'em_execucao' },
    { id: uuidv4(), code: 'PRJ-003', name: 'Mercado Municipal — Sumbe', executing_entity: 'Técnica e Obras Lda.', beneficiary: 'Gov. Prov. C. Sul', location: 'Cuanza Sul', province: 'Cuanza Sul', sector: 'infraestrutura', total_value: 1020000000, financed_amount: 850000000, execution_percentage: 88, contract_id: contractMap['MAI-2025-038'], status: 'desvio' },
    { id: uuidv4(), code: 'PRJ-004', name: 'Equipamentos Laboratoriais Nacionais', executing_entity: 'MediSupply Lda.', beneficiary: 'Min. Saúde', location: 'Nacional', province: 'Luanda', sector: 'saude', total_value: 6960000000, financed_amount: 5800000000, execution_percentage: 71, contract_id: contractMap['MAI-2024-018'], status: 'em_execucao' },
    { id: uuidv4(), code: 'PRJ-005', name: 'Conjunto Habitacional Cacuaco Norte', executing_entity: 'Atlântico Construções', beneficiary: 'Adm. Mun. Cacuaco', location: 'Luanda Norte', province: 'Luanda', sector: 'habitacao', total_value: 2520000000, financed_amount: 2100000000, execution_percentage: 45, contract_id: contractMap['MAI-2025-031'], status: 'em_execucao' },
  ];

  const insertProject = db.prepare(`
    INSERT INTO projects (id, code, name, executing_entity, beneficiary, location, province,
      sector, total_value, financed_amount, execution_percentage, contract_id, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const p of projects) {
      insertProject.run(
        p.id, p.code, p.name, p.executing_entity, p.beneficiary, p.location,
        p.province, p.sector, p.total_value, p.financed_amount, p.execution_percentage,
        p.contract_id, p.status, adminId
      );
    }
  })();

  // RISK ASSESSMENTS
  const riskAssessments = [
    { id: uuidv4(), contract_id: contractMap['MAI-2024-009'], client_id: clientMap['CLI-006'], risk_level: 'critico', overall_score: 2.8, payment_history_score: 1.5, financial_situation_score: 2.0, political_risk_score: 3.0, contractual_risk_score: 4.0, execution_risk_score: 3.0, liquidity_risk_score: 2.0, recommended_action: 'Execução de garantia', action_deadline: '2026-06-20' },
    { id: uuidv4(), contract_id: contractMap['MAI-2023-017'], client_id: clientMap['CLI-011'], risk_level: 'critico', overall_score: 3.1, payment_history_score: 2.0, financial_situation_score: 3.0, political_risk_score: 4.0, contractual_risk_score: 4.0, execution_risk_score: 2.5, liquidity_risk_score: 2.5, recommended_action: 'Negociação / reestruturação', action_deadline: '2026-06-20' },
    { id: uuidv4(), contract_id: contractMap['MAI-2025-038'], client_id: clientMap['CLI-003'], risk_level: 'alto', overall_score: 4.2, payment_history_score: 3.5, financial_situation_score: 4.0, political_risk_score: 5.0, contractual_risk_score: 5.0, execution_risk_score: 3.0, liquidity_risk_score: 3.0, recommended_action: 'Acordo de reembolso parcial', action_deadline: '2026-06-23' },
    { id: uuidv4(), contract_id: contractMap['MAI-2026-021'], client_id: clientMap['CLI-002'], risk_level: 'alto', overall_score: 4.8, payment_history_score: 4.5, financial_situation_score: 5.0, political_risk_score: 5.0, contractual_risk_score: 5.5, execution_risk_score: 4.0, liquidity_risk_score: 3.5, recommended_action: 'Monitorização diária', action_deadline: '2026-07-16' },
    { id: uuidv4(), contract_id: contractMap['MAI-2024-015'], client_id: clientMap['CLI-012'], risk_level: 'alto', overall_score: 5.0, payment_history_score: 5.0, financial_situation_score: 5.0, political_risk_score: 5.5, contractual_risk_score: 5.5, execution_risk_score: 4.5, liquidity_risk_score: 4.0, recommended_action: 'Revisão da garantia', action_deadline: '2026-07-01' },
  ];

  const insertRisk = db.prepare(`
    INSERT INTO risk_assessments (id, contract_id, client_id, risk_level, overall_score,
      payment_history_score, financial_situation_score, political_risk_score,
      contractual_risk_score, execution_risk_score, liquidity_risk_score,
      recommended_action, action_deadline, assessed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const r of riskAssessments) {
      insertRisk.run(
        r.id, r.contract_id, r.client_id, r.risk_level, r.overall_score,
        r.payment_history_score, r.financial_situation_score, r.political_risk_score,
        r.contractual_risk_score, r.execution_risk_score, r.liquidity_risk_score,
        r.recommended_action, r.action_deadline, adminId
      );
    }
  })();

  logger.info('Database seeded successfully');
  logger.info('Users created:');
  logger.info('  admin@maiombe.ao / Maiombe@2026 (Administrador)');
  logger.info('  carlos.mendonca@maiombe.ao / Maiombe@2026 (Director Executivo)');
  logger.info('  ana.ferreira@maiombe.ao / Maiombe@2026 (Director Financeiro)');
  logger.info('  pedro.neto@maiombe.ao / Maiombe@2026 (Gestor de Carteira)');
  logger.info('  sofia.cardoso@maiombe.ao / Maiombe@2026 (Analista de Risco)');
  logger.info('  miguel.santos@maiombe.ao / Maiombe@2026 (Jurídico)');
  logger.info('  rosa.lopes@maiombe.ao / Maiombe@2026 (Contabilidade)');
  logger.info('  antonio.silva@maiombe.ao / Maiombe@2026 (Auditor)');
}

seed().catch(err => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
