// ─── Mock data — modo apresentação ────────────────────────────────────────────
// GETs são interceptados antes de chegar à rede.
// Mutações (POST/PUT/PATCH/DELETE) vão sempre ao servidor real.

// ─── Shared IDs ───────────────────────────────────────────────────────────────
const IDS = {
  clients:   ['cl-001','cl-002','cl-003','cl-004','cl-005','cl-006','cl-007','cl-008'],
  contracts: ['ct-001','ct-002','ct-003','ct-004','ct-005','ct-006','ct-007','ct-008'],
  funding:   ['fn-001','fn-002','fn-003','fn-004'],
};

// ─── Risk histories (for /clients/:id → ClientDetail.tsx) ─────────────────────
const RISK_HISTORY: Record<string, Array<{ id: string; risk_level: string; overall_score: number; notes: string; recommended_action: string; assessed_at: string }>> = {
  'cl-001': [{ id: 'rh-001', risk_level: 'baixo',   overall_score: 8.2, notes: 'Histórico de pagamento exemplar. OT em custódia.',              recommended_action: 'Manter monitorização trimestral.',         assessed_at: '2026-06-01' }],
  'cl-002': [{ id: 'rh-002', risk_level: 'baixo',   overall_score: 7.9, notes: 'Empresa pública sólida. Garantia bancária válida.',             recommended_action: 'Revisão semestral do score.',              assessed_at: '2026-06-01' }],
  'cl-003': [{ id: 'rh-003', risk_level: 'medio',   overall_score: 5.8, notes: 'Score subiu 12 pts após revisão. Monitorização reforçada.',     recommended_action: 'Pedido de relatório de execução mensal.',  assessed_at: '2026-06-10' }],
  'cl-004': [{ id: 'rh-004', risk_level: 'medio',   overall_score: 5.2, notes: 'Formalização pendente há 119 dias. Risco operacional.',         recommended_action: 'Pressionar escritura notarial.',           assessed_at: '2026-06-01' }],
  'cl-005': [{ id: 'rh-005', risk_level: 'baixo',   overall_score: 8.5, notes: 'Ministério com OT em custódia e OGE consignado.',              recommended_action: 'Manter monitorização trimestral.',         assessed_at: '2026-05-15' }],
  'cl-006': [{ id: 'rh-006', risk_level: 'medio',   overall_score: 6.1, notes: 'Empresa em reestruturação. Frota em renovação.',               recommended_action: 'Verificar evolução do plano de negócios.', assessed_at: '2026-06-01' }],
  'cl-007': [{ id: 'rh-007', risk_level: 'alto',    overall_score: 3.2, notes: 'Prestação vencida há 59 dias. Hipoteca expirada.',             recommended_action: 'Activar hipoteca e escalar ao jurídico.',  assessed_at: '2026-06-15' }],
  'cl-008': [{ id: 'rh-008', risk_level: 'baixo',   overall_score: 8.0, notes: 'Contrato em arranque. Garantias OT constituídas.',             recommended_action: 'Monitorização semestral pós-desembolso.',  assessed_at: '2026-06-20' }],
};

// ─── Clients ──────────────────────────────────────────────────────────────────
// Includes both contact_email (Clients.tsx list) and email (ClientDetail.tsx)
const CLIENTS = [
  { id: IDS.clients[0], code: 'CLI-001', name: 'Ministério das Finanças',           entity_type: 'ministerio',         nif: '5000012301', province: 'Luanda',      risk_rating: 'A', risk_level: 'baixo', contact_email: 'geral@minfin.gov.ao',      email: 'geral@minfin.gov.ao',      phone: '+244923000001', address: 'Largo da Mutamba, Luanda',             legal_representative: 'Dr. João Carlos Baptista',       created_at: '2026-01-10', total_exposure: 5_000_000_000, contract_count: 1, execution_pct: 35, repayment_methods: '["ot"]',             next_due_date: '2026-07-15', amortized: 1_750_000_000, outstanding: 3_250_000_000, riskHistory: RISK_HISTORY['cl-001'] },
  { id: IDS.clients[1], code: 'CLI-002', name: 'SONANGOL E.P.',                      entity_type: 'empresa_publica',    nif: '5000056789', province: 'Luanda',      risk_rating: 'A', risk_level: 'baixo', contact_email: 'financas@sonangol.co.ao',  email: 'financas@sonangol.co.ao',  phone: '+244923000002', address: 'Via S10, Luanda',                      legal_representative: 'Eng.ª Maria Santos Figueiredo',  created_at: '2026-01-15', total_exposure: 8_000_000_000, contract_count: 1, execution_pct: 22, repayment_methods: '["ot","numerario"]', next_due_date: '2026-07-20', amortized: 1_760_000_000, outstanding: 6_240_000_000, riskHistory: RISK_HISTORY['cl-002'] },
  { id: IDS.clients[2], code: 'CLI-003', name: 'Gov. Provincial de Luanda',          entity_type: 'governo_provincial', nif: '5000034521', province: 'Luanda',      risk_rating: 'B', risk_level: 'medio', contact_email: 'gov@luanda.gov.ao',        email: 'gov@luanda.gov.ao',        phone: '+244923000003', address: 'Palácio do Governo, Luanda',           legal_representative: 'Dr. Pedro Lopes da Costa',       created_at: '2026-01-25', total_exposure: 3_000_000_000, contract_count: 1, execution_pct: 58, repayment_methods: '["bt"]',             next_due_date: '2026-07-01', amortized: 1_740_000_000, outstanding: 1_260_000_000, riskHistory: RISK_HISTORY['cl-003'] },
  { id: IDS.clients[3], code: 'CLI-004', name: 'BPC — Banco de Poupança e Crédito',  entity_type: 'empresa_publica',    nif: '5000098765', province: 'Luanda',      risk_rating: 'B', risk_level: 'medio', contact_email: 'direcao@bpc.ao',           email: 'direcao@bpc.ao',           phone: '+244923000004', address: 'Rua Rainha Ginga, Luanda',             legal_representative: 'Dr. António Costa Pereira',      created_at: '2026-02-15', total_exposure: 2_000_000_000, contract_count: 1, execution_pct: 10, repayment_methods: '["numerario"]',     next_due_date: '2026-08-01', amortized:   200_000_000, outstanding: 1_800_000_000, riskHistory: RISK_HISTORY['cl-004'] },
  { id: IDS.clients[4], code: 'CLI-005', name: 'Ministério da Saúde',                entity_type: 'ministerio',         nif: '5000076543', province: 'Luanda',      risk_rating: 'A', risk_level: 'baixo', contact_email: 'rh@minsa.gov.ao',          email: 'rh@minsa.gov.ao',          phone: '+244923000005', address: 'Rua 17 de Setembro, Luanda',           legal_representative: 'Dra. Rosa Maria Mendes',         created_at: '2025-09-15', total_exposure: 1_500_000_000, contract_count: 1, execution_pct: 72, repayment_methods: '["ot"]',             next_due_date: '2026-07-05', amortized: 1_080_000_000, outstanding:   420_000_000, riskHistory: RISK_HISTORY['cl-005'] },
  { id: IDS.clients[5], code: 'CLI-006', name: 'TAAG — Linhas Aéreas de Angola',     entity_type: 'empresa_publica',    nif: '5000045678', province: 'Luanda',      risk_rating: 'B', risk_level: 'medio', contact_email: 'financas@taag.ao',         email: 'financas@taag.ao',         phone: '+244923000006', address: 'Aeroporto Internacional, Luanda',      legal_representative: 'Eng. Carlos Ferreira Dias',      created_at: '2025-07-20', total_exposure: 4_000_000_000, contract_count: 1, execution_pct: 44, repayment_methods: '["bt"]',             next_due_date: '2026-08-15', amortized: 1_760_000_000, outstanding: 2_240_000_000, riskHistory: RISK_HISTORY['cl-006'] },
  { id: IDS.clients[6], code: 'CLI-007', name: 'Gov. Provincial do Huambo',          entity_type: 'governo_provincial', nif: '5000023456', province: 'Huambo',      risk_rating: 'C', risk_level: 'alto',  contact_email: 'gov@huambo.gov.ao',        email: 'gov@huambo.gov.ao',        phone: '+244923000007', address: 'Palácio do Governo, Huambo',           legal_representative: 'Gov. Francisco Neto Silva',      created_at: '2024-03-10', total_exposure: 1_200_000_000, contract_count: 1, execution_pct: 95, repayment_methods: '["numerario"]',     next_due_date: '2026-05-01', amortized: 1_140_000_000, outstanding:    60_000_000, riskHistory: RISK_HISTORY['cl-007'] },
  { id: IDS.clients[7], code: 'CLI-008', name: 'ENDIAMA E.P.',                        entity_type: 'empresa_publica',    nif: '5000087654', province: 'Lunda Norte', risk_rating: 'A', risk_level: 'baixo', contact_email: 'dg@endiama.co.ao',         email: 'dg@endiama.co.ao',         phone: '+244923000008', address: 'Rua Major Kanhangulo, Luanda',         legal_representative: 'Dr. Manuel Lopes Pinto',         created_at: '2026-06-01', total_exposure: 6_000_000_000, contract_count: 1, execution_pct: 5,  repayment_methods: '["ot"]',             next_due_date: '2026-09-01', amortized:   300_000_000, outstanding: 5_700_000_000, riskHistory: RISK_HISTORY['cl-008'] },
];

// ─── Contracts ────────────────────────────────────────────────────────────────
const CONTRACTS = [
  { id: IDS.contracts[0], reference: 'MAI-2026-001', client_id: IDS.clients[0], client_name: 'Ministério das Finanças',          client_phone: null,              client_email: 'geral@minfin.gov.ao',      entity_type: 'ministerio',         contract_type: 'modelo_a', status: 'recebidos',       amount: 5_000_000_000, interest_rate: 12, term_months: 36, payment_frequency: 'trimestral', celebration_date: '2026-01-15', grace_period_months: 3, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'baixo', proximo_vencimento: '2026-07-15', execution_pct: 35, repayment_methods: '["ot"]',             object: 'Financiamento para Tesouraria do Estado' },
  { id: IDS.contracts[1], reference: 'MAI-2026-002', client_id: IDS.clients[1], client_name: 'SONANGOL E.P.',                     client_phone: null,              client_email: 'financas@sonangol.co.ao',  entity_type: 'empresa_publica',    contract_type: 'modelo_a', status: 'recebidos',       amount: 8_000_000_000, interest_rate: 10, term_months: 48, payment_frequency: 'semestral',  celebration_date: '2026-01-20', grace_period_months: 6, opening_commission: 1.2, late_interest_rate: 5, risk_level: 'baixo', proximo_vencimento: '2026-07-20', execution_pct: 22, repayment_methods: '["ot","numerario"]', object: 'Capital de Giro para Refinaria' },
  { id: IDS.contracts[2], reference: 'MAI-2026-003', client_id: IDS.clients[2], client_name: 'Gov. Provincial de Luanda',         client_phone: null,              client_email: 'gov@luanda.gov.ao',        entity_type: 'governo_provincial', contract_type: 'modelo_a', status: 'recebidos',       amount: 3_000_000_000, interest_rate: 14, term_months: 24, payment_frequency: 'mensal',     celebration_date: '2026-02-01', grace_period_months: 0, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'medio', proximo_vencimento: '2026-07-01', execution_pct: 58, repayment_methods: '["bt"]',             object: 'Reabilitação Urbana — Luanda Sul' },
  { id: IDS.contracts[3], reference: 'MAI-2026-004', client_id: IDS.clients[3], client_name: 'BPC — Banco de Poupança e Crédito', client_phone: null,              client_email: 'direcao@bpc.ao',          entity_type: 'empresa_publica',    contract_type: 'modelo_b', status: 'em_formalizacao', amount: 2_000_000_000, interest_rate: 13, term_months: 36, payment_frequency: 'trimestral', celebration_date: '2026-03-01', grace_period_months: 3, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'medio', proximo_vencimento: '2026-08-01', execution_pct: 10, repayment_methods: '["numerario"]',     object: 'Reforço de Liquidez Bancária' },
  { id: IDS.contracts[4], reference: 'MAI-2026-005', client_id: IDS.clients[4], client_name: 'Ministério da Saúde',               client_phone: null,              client_email: 'rh@minsa.gov.ao',          entity_type: 'ministerio',         contract_type: 'modelo_a', status: 'recebidos',       amount: 1_500_000_000, interest_rate: 15, term_months: 18, payment_frequency: 'mensal',     celebration_date: '2025-10-01', grace_period_months: 0, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'baixo', proximo_vencimento: '2026-07-05', execution_pct: 72, repayment_methods: '["ot"]',             object: 'Aquisição de Equipamento Hospitalar' },
  { id: IDS.contracts[5], reference: 'MAI-2026-006', client_id: IDS.clients[5], client_name: 'TAAG — Linhas Aéreas de Angola',    client_phone: null,              client_email: 'financas@taag.ao',         entity_type: 'empresa_publica',    contract_type: 'modelo_b', status: 'recebidos',       amount: 4_000_000_000, interest_rate: 11, term_months: 60, payment_frequency: 'semestral',  celebration_date: '2025-08-15', grace_period_months: 6, opening_commission: 1.2, late_interest_rate: 5, risk_level: 'medio', proximo_vencimento: '2026-08-15', execution_pct: 44, repayment_methods: '["bt"]',             object: 'Renovação de Frota Aérea' },
  { id: IDS.contracts[6], reference: 'MAI-2026-007', client_id: IDS.clients[6], client_name: 'Gov. Provincial do Huambo',         client_phone: '+244923000007',   client_email: 'gov@huambo.gov.ao',        entity_type: 'governo_provincial', contract_type: 'modelo_a', status: 'vencido',         amount: 1_200_000_000, interest_rate: 14, term_months: 24, payment_frequency: 'mensal',     celebration_date: '2024-04-01', grace_period_months: 0, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'alto',  proximo_vencimento: '2026-05-01', execution_pct: 95, repayment_methods: '["numerario"]',     object: 'Hospital Geral do Huambo' },
  { id: IDS.contracts[7], reference: 'MAI-2026-008', client_id: IDS.clients[7], client_name: 'ENDIAMA E.P.',                       client_phone: null,              client_email: 'dg@endiama.co.ao',         entity_type: 'empresa_publica',    contract_type: 'modelo_c', status: 'elaboracao',      amount: 6_000_000_000, interest_rate: 9,  term_months: 48, payment_frequency: 'trimestral', celebration_date: '2026-06-15', grace_period_months: 6, opening_commission: 1.2, late_interest_rate: 5, risk_level: 'baixo', proximo_vencimento: '2026-09-01', execution_pct: 5,  repayment_methods: '["ot"]',             object: 'Expansão das Minas de Catoca' },
];

// ─── Funding Sources ───────────────────────────────────────────────────────────
const FUNDING_SOURCES = [
  { id: IDS.funding[0], name: 'Linha de Crédito BFA',          source_type: 'linha_bancaria',   institution: 'BFA — Banco de Fomento Angola',          product: 'Linha Sectorial 2025',  total_amount: 10_000_000_000, utilized_amount: 8_500_000_000, interest_rate: 8.5, maturity_date: '2027-12-31', guarantee_given: 'Carteira de crédito de 1ª linha',       status: 'activa', notes: 'Renovação automática sujeita a revisão anual.' },
  { id: IDS.funding[1], name: 'Capital Próprio — Accionistas', source_type: 'capital_proprio',  institution: 'MAIOMBE Capital & Credit, Lda.',         product: 'Capital Social',        total_amount:  5_000_000_000, utilized_amount: 4_200_000_000, interest_rate: 5.0, maturity_date: null,          guarantee_given: null,                                    status: 'activa', notes: 'Capital subscrito e realizado pelos sócios fundadores.' },
  { id: IDS.funding[2], name: 'Linha de Crédito BCI',          source_type: 'credito_bancario', institution: 'BCI — Banco de Crédito e Investimento',  product: 'Linha Corporate 2026',  total_amount:  7_000_000_000, utilized_amount: 5_800_000_000, interest_rate: 9.0, maturity_date: '2028-06-30', guarantee_given: 'Títulos do Tesouro Nacional',           status: 'activa', notes: 'Linha aprovada em Março 2026 para financiamento a médio prazo.' },
  { id: IDS.funding[3], name: 'Obrigações — Emissão 2025',     source_type: 'obrigacoes',       institution: 'Mercado de Capitais de Angola',          product: 'MAIOMBE OBR 2025-2028', total_amount:  3_000_000_000, utilized_amount: 3_000_000_000, interest_rate: 7.5, maturity_date: '2028-03-15', guarantee_given: 'Sem garantia real — Categoria AA',      status: 'activa', notes: 'Emissão colocada junto de investidores institucionais.' },
];

const FUNDING_KPIS = {
  totalCaptado: 25_000_000_000, linhasBancarias: 17_000_000_000, numBancos: 2,
  capitalProprio: 5_000_000_000, investidoresPrivados: 3_000_000_000, custoMedioPassivo: 7.9,
};

// ─── Rates & Commissions ───────────────────────────────────────────────────────
const RATE_TABLES = [
  { id: 'rt-001', entity_type: 'Governo Central',    min_rate: 8,  base_rate: 10, max_rate: 12, management_commission: 0.5, opening_commission: 1.0 },
  { id: 'rt-002', entity_type: 'Ministério',         min_rate: 8,  base_rate: 11, max_rate: 13, management_commission: 0.5, opening_commission: 1.2 },
  { id: 'rt-003', entity_type: 'Governo Provincial', min_rate: 10, base_rate: 13, max_rate: 15, management_commission: 0.5, opening_commission: 1.5 },
  { id: 'rt-004', entity_type: 'Adm. Municipal',     min_rate: 10, base_rate: 13, max_rate: 15, management_commission: 0.5, opening_commission: 1.5 },
  { id: 'rt-005', entity_type: 'Empresa Pública',    min_rate: 10, base_rate: 13, max_rate: 16, management_commission: 0.8, opening_commission: 1.5 },
  { id: 'rt-006', entity_type: 'Empresa Privada',    min_rate: 13, base_rate: 16, max_rate: 20, management_commission: 1.0, opening_commission: 2.0 },
];

const COMMISSIONS = [
  { id: 'cm-001', name: 'Comissão de Abertura de Dossier', calculation_base: 'Sobre o Capital Mutuado',   rate_min: 1.0, rate_max: 2.5, periodicity: 'Única (assinatura)',   is_capitalizable: 0, can_reinvest: 0, description: 'Cobrada no momento da assinatura do contrato.' },
  { id: 'cm-002', name: 'Comissão de Gestão Anual',        calculation_base: 'Sobre o Capital em Dívida', rate_min: 0.3, rate_max: 1.0, periodicity: 'Anual',                is_capitalizable: 0, can_reinvest: 0, description: 'Cobrada anualmente sobre o saldo em dívida.' },
  { id: 'cm-003', name: 'Juro de Mora',                    calculation_base: 'Sobre a Prestação Vencida', rate_min: 3.0, rate_max: 8.0, periodicity: 'Automático (por dia)', is_capitalizable: 1, can_reinvest: 0, description: 'Aplicado por cada dia de atraso no pagamento.' },
  { id: 'cm-004', name: 'Comissão de Imobilização',        calculation_base: 'Sobre o Cap. Não Desemb.',  rate_min: 0.1, rate_max: 0.5, periodicity: 'Mensal',               is_capitalizable: 0, can_reinvest: 0, description: 'Cobrada sobre o capital aprovado mas ainda não desembolsado.' },
];

// ─── Operational Costs ────────────────────────────────────────────────────────
const OPERATIONAL_COSTS = [
  { id: 'op-001', name: 'Salários e Encargos — Equipa de 12', category: 'pessoal',        amount_monthly: 8_500_000, is_active: 1, notes: 'Inclui seguro social e subsídios.' },
  { id: 'op-002', name: 'Sistema MAIOMBE + Infra Cloud',       category: 'sistema',        amount_monthly: 1_200_000, is_active: 1, notes: 'Licença anual + custo mensal de servidores.' },
  { id: 'op-003', name: 'Serviços Jurídicos e Notariais',      category: 'juridico',       amount_monthly:   750_000, is_active: 1, notes: 'Advogados externos e notários.' },
  { id: 'op-004', name: 'Renda, Electricidade e Escritório',   category: 'administrativo', amount_monthly:   600_000, is_active: 1, notes: 'Sede em Luanda — Talatona.' },
  { id: 'op-005', name: 'Formações e Deslocações',             category: 'outros',         amount_monthly:   300_000, is_active: 1, notes: 'Formação da equipa e viagens de negócio.' },
];

// ─── Margin (derived) ────────────────────────────────────────────────────────
const ACTIVE_CONTRACTS = CONTRACTS.filter(c => ['recebidos','em_vigor','vencido'].includes(c.status));

const MARGIN_TOTAIS = (() => {
  const receitaActiva = ACTIVE_CONTRACTS.reduce((s, c) => s + c.amount * (c.interest_rate / 100), 0);
  const custoPassivo  = FUNDING_SOURCES.reduce((s, f) => s + f.total_amount * (f.interest_rate / 100), 0);
  const custoOp       = OPERATIONAL_COSTS.filter(o => o.is_active).reduce((s, o) => s + o.amount_monthly * 12, 0);
  const margemBruta   = receitaActiva - custoPassivo;
  const taxaActiva    = ACTIVE_CONTRACTS.reduce((s, c) => s + c.interest_rate, 0) / (ACTIVE_CONTRACTS.length || 1);
  const taxaPassiva   = FUNDING_SOURCES.reduce((s, f) => s + f.interest_rate, 0) / (FUNDING_SOURCES.length || 1);
  return {
    receitaActiva, custoPassivo, margemBruta,
    custosOperacionais: custoOp, resultadoLiquido: margemBruta - custoOp,
    taxaActivaMedia: +taxaActiva.toFixed(2), taxaPassivaMedia: +taxaPassiva.toFixed(2),
    spread: +(taxaActiva - taxaPassiva).toFixed(2),
    totalFontes: FUNDING_SOURCES.reduce((s, f) => s + f.total_amount, 0),
    totalContratos: ACTIVE_CONTRACTS.reduce((s, c) => s + c.amount, 0),
  };
})();

// ─── Alerts ───────────────────────────────────────────────────────────────────
const ALERTS = [
  { id: 'al-001', title: 'Prestação Vencida — MAI-2026-007',     description: 'Gov. Provincial do Huambo não efectuou o pagamento da prestação nº 26 no valor de 66.500.000 Kz. Em atraso há 59 dias.', severity: 'urgente',     category: 'vencimento',    contract_reference: 'MAI-2026-007', created_at: '2026-05-01', resolved_at: null },
  { id: 'al-002', title: 'Risco Elevado — MAI-2026-003',          description: 'Score de risco do Gov. Prov. de Luanda subiu para 72/100 após revisão trimestral. Verificar garantias constituídas.',         severity: 'urgente',     category: 'risco',         contract_reference: 'MAI-2026-003', created_at: '2026-06-10', resolved_at: null },
  { id: 'al-003', title: 'Fonte a Expirar — Obrigações 2025',     description: 'Emissão MAIOMBE OBR 2025-2028 atinge maturidade em 259 dias (Mar/2028). Iniciar processo de renovação.',                    severity: 'atencao',     category: 'financiamento', contract_reference: null,           created_at: '2026-06-15', resolved_at: null },
  { id: 'al-004', title: 'Formalização Pendente — MAI-2026-004',  description: 'Contrato BPC em formalização há 119 dias. Escritura pública aguarda agendamento notarial.',                               severity: 'atencao',     category: 'formalizacao',  contract_reference: 'MAI-2026-004', created_at: '2026-03-01', resolved_at: null },
  { id: 'al-005', title: 'Carência a Terminar — MAI-2026-002',    description: 'Período de carência de 6 meses da SONANGOL termina em Agosto. Primeira amortização de capital prevista para 20/08/2026.', severity: 'informativo', category: 'carencia',      contract_reference: 'MAI-2026-002', created_at: '2026-06-20', resolved_at: null },
  { id: 'al-006', title: 'Desembolso Aprovado — MAI-2026-008',    description: 'Contrato ENDIAMA aprovado pelo Conselho de Administração. Aguarda formalização para início do desembolso.',               severity: 'positivo',    category: 'aprovacao',     contract_reference: 'MAI-2026-008', created_at: '2026-06-25', resolved_at: null },
];

const ALERT_KPIS = { urgentes: 2, atencao: 2, informativos: 1, positivos: 1, totalActivos: 6, totalResolvidos: 14, urgente: 2, atencao_n: 2, informativo: 1 };

// ─── Dashboard ────────────────────────────────────────────────────────────────
const DASHBOARD_KPIS = {
  capitalCaptado: 25_000_000_000, capitalAplicado: 21_500_000_000,
  creditoVencido:  1_200_000_000, rentabilidadeLiquida: MARGIN_TOTAIS.spread,
  utilizacaoCapital: 86, nplRatio: 5.6, taxaRecuperacao: 94.4, garantias: 8,
  healthScore: 78,
  contratos: { total: 8, em_vigor: 6, em_risco: 2 },
  clientes: 8,
  alertas: [{ type: 'urgente', count: 2 }, { type: 'atencao', count: 2 }, { type: 'informativo', count: 2 }],
  riskMatrix: [
    { risk_level: 'baixo',   count: 4, total_amount: 14_500_000_000 },
    { risk_level: 'medio',   count: 2, total_amount:  5_000_000_000 },
    { risk_level: 'alto',    count: 1, total_amount:  1_200_000_000 },
    { risk_level: 'critico', count: 0, total_amount:              0 },
  ],
};

const PORTFOLIO_EVOLUTION = [
  { month: 'Jul/25', value: 8.2 },  { month: 'Ago/25', value: 9.1 },
  { month: 'Set/25', value: 10.5 }, { month: 'Out/25', value: 11.8 },
  { month: 'Nov/25', value: 13.2 }, { month: 'Dez/25', value: 15.6 },
  { month: 'Jan/26', value: 17.4 }, { month: 'Fev/26', value: 18.9 },
  { month: 'Mar/26', value: 20.1 }, { month: 'Abr/26', value: 20.8 },
  { month: 'Mai/26', value: 21.2 }, { month: 'Jun/26', value: 21.5 },
];

const SCHEDULE_2026 = [
  { month: 'Jan', value: 1_250_000_000, status: 'Recebido' }, { month: 'Fev', value:   980_000_000, status: 'Recebido' },
  { month: 'Mar', value: 1_450_000_000, status: 'Recebido' }, { month: 'Abr', value:   870_000_000, status: 'Recebido' },
  { month: 'Mai', value: 1_100_000_000, status: 'Recebido' }, { month: 'Jun', value: 2_300_000_000, status: 'Recebido' },
  { month: 'Jul', value: 1_650_000_000, status: 'Em Curso' }, { month: 'Ago', value: 2_800_000_000, status: 'Em Curso' },
  { month: 'Set', value: 1_200_000_000, status: 'Em Curso' }, { month: 'Out', value:   900_000_000, status: 'Em Curso' },
  { month: 'Nov', value: 1_350_000_000, status: 'Em Curso' }, { month: 'Dez', value: 1_700_000_000, status: 'Em Curso' },
];

const PROVINCIAL_EXPOSURE = [
  { province: 'Luanda',      total: 18_500_000_000 },
  { province: 'Huambo',      total:  1_200_000_000 },
  { province: 'Lunda Norte', total:  6_000_000_000 },
];

// ─── Liabilities ──────────────────────────────────────────────────────────────
const LIABILITIES_LIST = [
  { id: 'lb-001', creditor_name: 'BFA — Banco de Fomento Angola',        liability_type: 'linha_bancaria',   total_amount: 10_000_000_000, outstanding_amount: 8_500_000_000, interest_rate: 8.5, late_interest_rate: 3, start_date: '2025-01-15', maturity_date: '2027-12-31', payment_frequency: 'semestral',  guarantee_given: 'Carteira de crédito de 1ª linha', status: 'activa', notes: 'Renovação automática anual.' },
  { id: 'lb-002', creditor_name: 'BCI — Banco de Crédito e Investimento', liability_type: 'credito_bancario', total_amount:  7_000_000_000, outstanding_amount: 5_800_000_000, interest_rate: 9.0, late_interest_rate: 4, start_date: '2026-03-01', maturity_date: '2028-06-30', payment_frequency: 'trimestral', guarantee_given: 'Títulos do Tesouro Nacional',      status: 'activa', notes: 'Linha Corporate 2026.' },
  { id: 'lb-003', creditor_name: 'Accionistas — MAIOMBE Capital',         liability_type: 'capital_proprio',  total_amount:  5_000_000_000, outstanding_amount: 4_200_000_000, interest_rate: 5.0, late_interest_rate: 0, start_date: '2024-01-01', maturity_date: null,          payment_frequency: 'anual',      guarantee_given: null,                               status: 'activa', notes: 'Capital subscrito pelos sócios fundadores.' },
  { id: 'lb-004', creditor_name: 'Mercado de Capitais — OBR 2025-2028',  liability_type: 'obrigacoes',        total_amount:  3_000_000_000, outstanding_amount: 3_000_000_000, interest_rate: 7.5, late_interest_rate: 2, start_date: '2025-03-15', maturity_date: '2028-03-15', payment_frequency: 'semestral',  guarantee_given: null,                               status: 'activa', notes: 'Emissão pública categorizada AA.' },
];

const LIABILITIES_KPIS = {
  custoMedioPassivo: 7.9,
  totalPassivo: 25_000_000_000,
  utilizacaoMedia: 86,
  totalActivo: 21_500_000_000,
  margemLiquida: 3.9,
  fontesAtivas: 4,
  reembolsos30d: 1_073_750_000,
};

function generateLiabilitySchedule(lb: typeof LIABILITIES_LIST[0]) {
  const freqMap: Record<string, number> = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
  const pm   = freqMap[lb.payment_frequency] || 6;
  const totalM = lb.maturity_date
    ? Math.round((new Date(lb.maturity_date).getTime() - new Date(lb.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 36;
  const n    = Math.round(totalM / pm);
  const amort = n > 0 ? lb.total_amount / n : 0;
  let cap    = lb.total_amount;
  return Array.from({ length: n }, (_, i) => {
    const due = new Date(lb.start_date);
    due.setMonth(due.getMonth() + (i + 1) * pm);
    const interest = Math.round(cap * (lb.interest_rate / 100 / 12) * pm);
    const a        = Math.round(amort);
    const residual = i === n - 1 ? 0 : cap - a;
    const row = { installment_number: i + 1, due_date: due.toISOString().split('T')[0], capital: a, interest, total_installment: a + interest, residual_capital: residual, status: new Date(due) < new Date() ? 'pago' : 'futuro' };
    cap = residual;
    return row;
  });
}

// ─── Guarantees ───────────────────────────────────────────────────────────────
const GUARANTEES_LIST = [
  { id: 'gu-001', guarantee_type: 'cessao_receitas',   guarantor: 'Estado Angolano / DGI',               contract_reference: 'MAI-2026-001', client_name: 'Ministério das Finanças',          value: 5_000_000_000, coverage_percentage: 100, start_date: '2026-01-15', expiry_date: '2029-01-15', auto_renewal: true,  status: 'activa' },
  { id: 'gu-002', guarantee_type: 'garantia_bancaria', guarantor: 'BFA — Banco de Fomento Angola',       contract_reference: 'MAI-2026-002', client_name: 'SONANGOL E.P.',                   value: 8_000_000_000, coverage_percentage: 100, start_date: '2026-01-20', expiry_date: '2030-01-20', auto_renewal: true,  status: 'activa' },
  { id: 'gu-003', guarantee_type: 'consignacao_oge',   guarantor: 'Estado Angolano — OGE 2026',         contract_reference: 'MAI-2026-003', client_name: 'Gov. Provincial de Luanda',       value: 3_000_000_000, coverage_percentage: 100, start_date: '2026-02-01', expiry_date: '2028-02-01', auto_renewal: false, status: 'activa' },
  { id: 'gu-004', guarantee_type: 'aval_fianca',       guarantor: 'BPC — Banco de Poupança e Crédito',  contract_reference: 'MAI-2026-004', client_name: 'BPC — Banco de Poupança',         value: 2_000_000_000, coverage_percentage: 100, start_date: '2026-03-01', expiry_date: '2029-03-01', auto_renewal: false, status: 'activa' },
  { id: 'gu-005', guarantee_type: 'cessao_receitas',   guarantor: 'Estado Angolano / DGI',               contract_reference: 'MAI-2026-005', client_name: 'Ministério da Saúde',             value: 1_500_000_000, coverage_percentage: 100, start_date: '2025-10-01', expiry_date: '2027-04-01', auto_renewal: true,  status: 'activa' },
  { id: 'gu-006', guarantee_type: 'penhor_acoes',      guarantor: 'Accionistas TAAG',                    contract_reference: 'MAI-2026-006', client_name: 'TAAG — Linhas Aéreas de Angola', value: 4_000_000_000, coverage_percentage: 100, start_date: '2025-08-15', expiry_date: '2030-08-15', auto_renewal: false, status: 'activa' },
  { id: 'gu-007', guarantee_type: 'hipoteca',          guarantor: 'Gov. Provincial do Huambo',           contract_reference: 'MAI-2026-007', client_name: 'Gov. Provincial do Huambo',       value:   800_000_000, coverage_percentage:  67, start_date: '2024-04-01', expiry_date: '2026-07-01', auto_renewal: false, status: 'activa' },
  { id: 'gu-008', guarantee_type: 'cessao_receitas',   guarantor: 'Estado Angolano / DGI',               contract_reference: 'MAI-2026-008', client_name: 'ENDIAMA E.P.',                    value: 6_000_000_000, coverage_percentage: 100, start_date: '2026-06-15', expiry_date: '2030-06-15', auto_renewal: true,  status: 'activa' },
];

const GUARANTEES_KPIS = {
  totalGarantias: 8, coberturaTotal: 30_300_000_000, coberturaPct: 97, tiposActivos: 6,
  aRenovar: 1,
  executadas: 0,
};

// ─── Securities ───────────────────────────────────────────────────────────────
const SECURITIES_LIST = [
  { id: 'sec-001', series: 'OT-2026/A01', security_type: 'OT', client_id: IDS.clients[0], client_name: 'Ministério das Finanças',  contract_id: IDS.contracts[0], contract_reference: 'MAI-2026-001', face_value: 5_000_000_000, yield_rate:  0, discount_accepted: 0, credit_deducted: 5_000_000_000, received_at: '2026-01-20', maturity_date: '2029-01-15', status: 'em_custodia' },
  { id: 'sec-002', series: 'BT-2026/B01', security_type: 'BT', client_id: IDS.clients[2], client_name: 'Gov. Provincial de Luanda', contract_id: IDS.contracts[2], contract_reference: 'MAI-2026-003', face_value: 3_000_000_000, yield_rate: 12, discount_accepted: 5, credit_deducted: 2_850_000_000, received_at: '2026-02-05', maturity_date: '2027-02-01', status: 'em_custodia' },
  { id: 'sec-003', series: 'OT-2026/A02', security_type: 'OT', client_id: IDS.clients[4], client_name: 'Ministério da Saúde',      contract_id: IDS.contracts[4], contract_reference: 'MAI-2026-005', face_value: 1_500_000_000, yield_rate:  0, discount_accepted: 0, credit_deducted: 1_500_000_000, received_at: '2025-10-05', maturity_date: '2027-10-01', status: 'em_custodia' },
  { id: 'sec-004', series: 'BT-2026/B02', security_type: 'BT', client_id: IDS.clients[7], client_name: 'ENDIAMA E.P.',              contract_id: IDS.contracts[7], contract_reference: 'MAI-2026-008', face_value: 6_000_000_000, yield_rate: 10, discount_accepted: 3, credit_deducted: 5_820_000_000, received_at: '2026-06-20', maturity_date: '2028-06-15', status: 'em_custodia' },
];

const SECURITIES_KPIS = {
  // otCarteira / btCarteira are the sums used by Securities.tsx KPI cards
  otCarteira: 6_500_000_000,   // OT-2026/A01 (5B) + OT-2026/A02 (1.5B)
  btCarteira: 9_000_000_000,   // BT-2026/B01 (3B) + BT-2026/B02 (6B)
  totalTitulos: 4,
  valorFacialTotal: 15_500_000_000,
  creditoTotalAbatido: 15_170_000_000,
  descontoMedio: 2.0,
};

const SECURITIES_POLICY = {
  max_discount_ot: 5, max_discount_bt: 10, min_yield_accepted: 8,
  acceptBT: true, maxDiscount: 10, minYield: 8, minCashPercentage: 20,
  authorizedEntities: ['governo_central','ministerio','governo_provincial'],
};

// ─── Projects ─────────────────────────────────────────────────────────────────
const PROJECTS_LIST = [
  { id: 'pr-001', code: 'PRJ-001', name: 'Hospital Geral do Huambo',               sector: 'saude',          contract_reference: 'MAI-2026-007', executing_entity: 'Gov. Provincial do Huambo',  beneficiary: 'População do Huambo',    location: 'Huambo Centro',           province: 'Huambo',      total_value: 1_200_000_000, financed_amount: 1_200_000_000, start_date: '2024-04-01', end_date: '2026-12-31', status: 'em_execucao', execution_percentage: 95, notes: 'Fase final — equipamentos em montagem.' },
  { id: 'pr-002', code: 'PRJ-002', name: 'Reabilitação Urbana — Luanda Sul',       sector: 'infraestrutura', contract_reference: 'MAI-2026-003', executing_entity: 'Gov. Provincial de Luanda', beneficiary: 'Município de Luanda Sul', location: 'Viana e Luanda Sul',      province: 'Luanda',      total_value: 3_000_000_000, financed_amount: 3_000_000_000, start_date: '2026-02-01', end_date: '2028-01-31', status: 'em_execucao', execution_percentage: 58, notes: 'Fase 2 de 3 — saneamento em curso.' },
  { id: 'pr-003', code: 'PRJ-003', name: 'Renovação de Frota Aérea — TAAG',        sector: 'transporte',     contract_reference: 'MAI-2026-006', executing_entity: 'TAAG — Linhas Aéreas',      beneficiary: 'Passageiros nacionais',  location: 'Aeroporto Internacional', province: 'Luanda',      total_value: 4_000_000_000, financed_amount: 4_000_000_000, start_date: '2025-08-15', end_date: '2027-08-15', status: 'em_execucao', execution_percentage: 44, notes: '2 aeronaves entregues, 3 em encomenda.' },
  { id: 'pr-004', code: 'PRJ-004', name: 'Refinaria Luanda — Capital de Giro',     sector: 'energia',        contract_reference: 'MAI-2026-002', executing_entity: 'SONANGOL E.P.',             beneficiary: 'Mercado nacional',       location: 'Luanda Norte',            province: 'Luanda',      total_value: 8_000_000_000, financed_amount: 8_000_000_000, start_date: '2026-01-20', end_date: '2030-01-20', status: 'arranque',    execution_percentage: 22, notes: 'Contrato assinado — primeiro desembolso em Ago/2026.' },
  { id: 'pr-005', code: 'PRJ-005', name: 'Aquisição de Equipamento Hospitalar',    sector: 'saude',          contract_reference: 'MAI-2026-005', executing_entity: 'Ministério da Saúde',       beneficiary: 'Hospitais públicos',    location: 'Todo o País',             province: 'Luanda',      total_value: 1_500_000_000, financed_amount: 1_500_000_000, start_date: '2025-10-01', end_date: '2027-04-01', status: 'em_execucao', execution_percentage: 72, notes: 'TAC, ventiladores e unidades cirúrgicas entregues.' },
  { id: 'pr-006', code: 'PRJ-006', name: 'Expansão das Minas de Catoca — ENDIAMA', sector: 'outros',         contract_reference: 'MAI-2026-008', executing_entity: 'ENDIAMA E.P.',              beneficiary: 'Economia Nacional',      location: 'Saurimo, Lunda Sul',      province: 'Lunda Norte', total_value: 6_000_000_000, financed_amount: 6_000_000_000, start_date: '2026-06-15', end_date: '2030-06-15', status: 'arranque',    execution_percentage: 5,  notes: 'Em fase de formalização e mobilização.' },
];

const PROJECTS_KPIS = {
  total: 6,
  totalFinanciado: 23_700_000_000,
  emExecucao: 4,
  emArranque: 2,
  comDesvios: 1,
  concluidos: 0,
  execucaoMedia: 49,
};

// ─── Management Capital ───────────────────────────────────────────────────────
const MGMT_CAPITAL_LIST = [
  { id: 'mc-001', reference: 'CAP-2024-001', provider_name: 'Accionista A — Milton Zumba',      category: 'aporte_socios',        amount: 3_000_000_000, received_at: '2024-01-15', created_by_name: 'Sistema',       notes: 'Capital fundador — subscrição inicial.' },
  { id: 'mc-002', reference: 'CAP-2024-002', provider_name: 'Accionista B — Francisco Lemos',   category: 'aporte_socios',        amount: 2_000_000_000, received_at: '2024-06-01', created_by_name: 'Sistema',       notes: 'Segundo aporte de sócios.' },
  { id: 'mc-003', reference: 'CAP-2025-001', provider_name: 'Estado de Angola — Subsídio 2025', category: 'subsidio_operacional', amount:   500_000_000, received_at: '2025-03-15', created_by_name: 'Administração', notes: 'Subsídio operacional anual.' },
  { id: 'mc-004', reference: 'CAP-2025-002', provider_name: 'FSDEA — Fundo Soberano de Angola', category: 'capital_proprio',      amount: 1_000_000_000, received_at: '2025-07-01', created_by_name: 'Administração', notes: 'Parceria estratégica — FSDEA 2025.' },
  { id: 'mc-005', reference: 'CAP-2026-001', provider_name: 'Accionista A — Reforço 2026',      category: 'aporte_socios',        amount:   800_000_000, received_at: '2026-01-10', created_by_name: 'Administração', notes: 'Reforço de capital para crescimento da carteira.' },
];

const MGMT_CAPITAL_KPIS = {
  totalCapital: 7_300_000_000,
  byCategory: [
    { category: 'aporte_socios',        amount: 5_800_000_000, count: 3 },
    { category: 'subsidio_operacional', amount:   500_000_000, count: 1 },
    { category: 'capital_proprio',      amount: 1_000_000_000, count: 1 },
  ],
};

// ─── Risk ─────────────────────────────────────────────────────────────────────
const RISK_DATA = {
  matrix: [
    { risk_level: 'baixo',   count: 4, total_amount: 14_500_000_000 },
    { risk_level: 'medio',   count: 2, total_amount:  5_000_000_000 },
    { risk_level: 'alto',    count: 1, total_amount:  1_200_000_000 },
    { risk_level: 'critico', count: 0, total_amount:              0 },
  ],
  // watchList: fields match Risk.tsx interface — id, reference, client_name, contract_amount, risk_level, overall_score, notes, recommended_action, action_deadline
  watchList: [
    { id: 'wl-001', reference: 'MAI-2026-007', client_name: 'Gov. Provincial do Huambo', contract_amount: 1_200_000_000, risk_level: 'alto',  overall_score: 3.2, notes: 'Prestação vencida há 59 dias. Hipoteca expirada em Abr/2026.', recommended_action: 'Activar hipoteca e escalar ao departamento jurídico.', action_deadline: '2026-07-15' },
    { id: 'wl-002', reference: 'MAI-2026-003', client_name: 'Gov. Provincial de Luanda',  contract_amount: 3_000_000_000, risk_level: 'medio', overall_score: 5.8, notes: 'Score subiu 12 pontos após revisão trimestral. Monitorização reforçada.', recommended_action: 'Pedido de relatório de execução mensal.',     action_deadline: '2026-07-31' },
    { id: 'wl-003', reference: 'MAI-2026-004', client_name: 'BPC — Banco de Poupança',    contract_amount: 2_000_000_000, risk_level: 'medio', overall_score: 5.2, notes: 'Formalização pendente há 119 dias. Risco operacional elevado.',           recommended_action: 'Pressionar conclusão da escritura notarial.',   action_deadline: '2026-07-15' },
  ],
  kpis: {
    baixo:   { count: 4, total: 14_500_000_000 },
    medio:   { count: 2, total:  5_000_000_000 },
    alto:    { count: 1, total:  1_200_000_000 },
    critico: { count: 0, total:              0 },
  },
  ratingByType: {
    ministerio:              { rating: 'A',  count: 2, total:  6_500_000_000 },
    empresa_publica:         { rating: 'B+', count: 4, total: 21_000_000_000 },
    governo_provincial:      { rating: 'B',  count: 2, total:  4_200_000_000 },
    governo_central:         { rating: 'A+', count: 0, total:              0 },
    administracao_municipal: { rating: '—',  count: 0, total:              0 },
    empresa_privada:         { rating: '—',  count: 0, total:              0 },
  },
  // scoringIndicators: fields match Risk.tsx — indicator, weight, avg_score, trend, evaluation
  scoringIndicators: [
    { indicator: 'payment_history',     weight: 30, avg_score: 7.2, trend: '▼ -0.3', evaluation: 'Positivo'  },
    { indicator: 'financial_situation', weight: 25, avg_score: 6.8, trend: '▲ +0.5', evaluation: 'Positivo'  },
    { indicator: 'political_risk',      weight: 20, avg_score: 6.5, trend: '▼ -0.2', evaluation: 'Neutro'    },
    { indicator: 'contractual_risk',    weight: 10, avg_score: 7.8, trend: '▲ +0.1', evaluation: 'Positivo'  },
    { indicator: 'execution_risk',      weight: 10, avg_score: 6.1, trend: '▼ -0.4', evaluation: 'Neutro'    },
    { indicator: 'liquidity_risk',      weight:  5, avg_score: 5.9, trend: '▼ -0.6', evaluation: 'Negativo'  },
  ],
};

// ─── Collections ──────────────────────────────────────────────────────────────
const COLLECTION_CALENDAR = [
  { id: 'sch-c-007', contract_id: IDS.contracts[6], reference: 'MAI-2026-007', client_name: 'Gov. Provincial do Huambo', client_phone: '+244923000007', client_email: 'gov@huambo.gov.ao',       installment_number: 26, due_date: '2026-05-01', amortization:  50_000_000, interest:  14_000_000, total_installment:  64_000_000, status: 'vencido'  },
  { id: 'sch-c-001', contract_id: IDS.contracts[0], reference: 'MAI-2026-001', client_name: 'Ministério das Finanças',  client_phone: null,              client_email: 'geral@minfin.gov.ao',     installment_number:  3, due_date: '2026-07-15', amortization: 347_000_000, interest: 150_000_000, total_installment: 497_000_000, status: 'pendente' },
  { id: 'sch-c-003', contract_id: IDS.contracts[2], reference: 'MAI-2026-003', client_name: 'Gov. Provincial de Luanda', client_phone: null,            client_email: 'gov@luanda.gov.ao',       installment_number:  6, due_date: '2026-07-01', amortization: 125_000_000, interest:  35_000_000, total_installment: 160_000_000, status: 'pendente' },
  { id: 'sch-c-005', contract_id: IDS.contracts[4], reference: 'MAI-2026-005', client_name: 'Ministério da Saúde',      client_phone: null,              client_email: 'rh@minsa.gov.ao',         installment_number: 10, due_date: '2026-07-05', amortization:  83_000_000, interest:  18_750_000, total_installment: 101_750_000, status: 'pendente' },
  { id: 'sch-c-002', contract_id: IDS.contracts[1], reference: 'MAI-2026-002', client_name: 'SONANGOL E.P.',            client_phone: null,              client_email: 'financas@sonangol.co.ao', installment_number:  2, due_date: '2026-07-20', amortization:           0, interest: 133_333_333, total_installment: 133_333_333, status: 'pendente' },
  { id: 'sch-c-006', contract_id: IDS.contracts[5], reference: 'MAI-2026-006', client_name: 'TAAG — Linhas Aéreas',    client_phone: null,              client_email: 'financas@taag.ao',         installment_number:  2, due_date: '2026-08-15', amortization:           0, interest:  73_333_333, total_installment:  73_333_333, status: 'pendente' },
  { id: 'sch-c-004', contract_id: IDS.contracts[3], reference: 'MAI-2026-004', client_name: 'BPC — Banco de Poupança', client_phone: null,              client_email: 'direcao@bpc.ao',           installment_number:  2, due_date: '2026-08-01', amortization:           0, interest:  43_333_333, total_installment:  43_333_333, status: 'pendente' },
];

const COLLECTION_KPIS = {
  totalAPagar: 2_800_000_000, vencimentoMes: 1_073_750_000,
  recuperadoMes: 1_250_000_000, emAtraso: 64_000_000,
  emLitigio: 1,
};

const RECOVERY_12 = [
  { month: 'Jul/25', value:   980_000_000 }, { month: 'Ago/25', value: 1_100_000_000 },
  { month: 'Set/25', value: 1_250_000_000 }, { month: 'Out/25', value: 1_080_000_000 },
  { month: 'Nov/25', value:   950_000_000 }, { month: 'Dez/25', value: 2_100_000_000 },
  { month: 'Jan/26', value: 1_150_000_000 }, { month: 'Fev/26', value:   870_000_000 },
  { month: 'Mar/26', value: 1_380_000_000 }, { month: 'Abr/26', value:   920_000_000 },
  { month: 'Mai/26', value:   640_000_000 }, { month: 'Jun/26', value: 1_250_000_000 },
];

// ─── BI ───────────────────────────────────────────────────────────────────────
const BI_DATA = {
  kpis: [
    { kpi: 'NPL Ratio',             value: 5.6,                    target: 5.0,            unit: '%',  delta: -0.6,                                   rating: 'Atenção' },
    { kpi: 'Taxa de Recuperação',   value: 94.4,                   target: 95.0,           unit: '%',  delta: -0.6,                                   rating: 'Normal'  },
    { kpi: 'Spread Médio',          value: MARGIN_TOTAIS.spread,   target: 4.0,            unit: 'pp', delta: +(MARGIN_TOTAIS.spread - 4).toFixed(2), rating: 'Óptimo'  },
    { kpi: 'Custo Médio Passivo',   value: 7.9,                    target: 8.0,            unit: '%',  delta: 0.1,                                    rating: 'Óptimo'  },
    { kpi: 'Utilização do Capital', value: 86.0,                   target: 90.0,           unit: '%',  delta: -4.0,                                   rating: 'Normal'  },
    { kpi: 'Carteira Total',        value: 21_500_000_000,         target: 25_000_000_000, unit: 'Kz', delta: -3_500_000_000,                          rating: 'Normal'  },
    { kpi: 'Clientes Activos',      value: 7,                      target: 10,             unit: 'un', delta: -3,                                     rating: 'Normal'  },
    { kpi: 'Novos Contratos (Q2)',  value: 2,                      target: 3,              unit: 'un', delta: -1,                                     rating: 'Atenção' },
  ],
  sectorExposure: [
    { sector: 'Petróleo e Energia', total: 8_000_000_000 },
    { sector: 'Diamantes',          total: 6_000_000_000 },
    { sector: 'Administração',      total: 5_000_000_000 },
    { sector: 'Transportes',        total: 4_000_000_000 },
    { sector: 'Banca',              total: 2_000_000_000 },
    { sector: 'Saúde',              total: 1_500_000_000 },
  ],
  nplEvolution: [
    { month: '01', vencido: 0.0 }, { month: '02', vencido: 0.0 },
    { month: '03', vencido: 0.0 }, { month: '04', vencido: 0.0 },
    { month: '05', vencido: 5.6 }, { month: '06', vencido: 5.6 },
  ],
  cashFlow: [
    { month: 'Jan', entrada: 1_250_000_000, saida:   850_000_000 },
    { month: 'Fev', entrada:   980_000_000, saida:   820_000_000 },
    { month: 'Mar', entrada: 1_450_000_000, saida:   900_000_000 },
    { month: 'Abr', entrada:   870_000_000, saida:   830_000_000 },
    { month: 'Mai', entrada: 1_100_000_000, saida:   880_000_000 },
    { month: 'Jun', entrada: 2_300_000_000, saida: 1_200_000_000 },
    { month: 'Jul', entrada: 1_650_000_000, saida:   960_000_000 },
    { month: 'Ago', entrada: 2_800_000_000, saida: 1_100_000_000 },
    { month: 'Set', entrada: 1_200_000_000, saida:   870_000_000 },
    { month: 'Out', entrada:   900_000_000, saida:   820_000_000 },
    { month: 'Nov', entrada: 1_350_000_000, saida:   890_000_000 },
    { month: 'Dez', entrada: 1_700_000_000, saida: 1_050_000_000 },
  ],
  monthlyPayments:  [
    { m: '01', received: 1_250_000_000 }, { m: '02', received:   980_000_000 },
    { m: '03', received: 1_450_000_000 }, { m: '04', received:   870_000_000 },
    { m: '05', received:   640_000_000 }, { m: '06', received: 1_250_000_000 },
  ],
  monthlyScheduled: [
    { m: '01', scheduled: 1_350_000_000 }, { m: '02', scheduled: 1_050_000_000 },
    { m: '03', scheduled: 1_500_000_000 }, { m: '04', scheduled:   920_000_000 },
    { m: '05', scheduled: 1_100_000_000 }, { m: '06', scheduled: 1_480_000_000 },
    { m: '07', scheduled: 1_073_750_000 }, { m: '08', scheduled: 2_900_000_000 },
  ],
};

// ─── Portfolio Analytics ───────────────────────────────────────────────────────
const PORTFOLIO_ANALYTICS = {
  entityExposure: [
    { entity_type: 'empresa_publica',    count: 4, total: 21_000_000_000, total_amount: 21_000_000_000, pct: 55 },
    { entity_type: 'ministerio',         count: 2, total:  6_500_000_000, total_amount:  6_500_000_000, pct: 30 },
    { entity_type: 'governo_provincial', count: 2, total:  4_200_000_000, total_amount:  4_200_000_000, pct: 15 },
  ],
  sectorDistribution: [
    { sector: 'energia',        count: 1, total: 8_000_000_000, total_financed: 8_000_000_000, pct: 37 },
    { sector: 'outros',         count: 1, total: 6_000_000_000, total_financed: 6_000_000_000, pct: 28 },
    { sector: 'infraestrutura', count: 2, total: 5_000_000_000, total_financed: 5_000_000_000, pct: 23 },
    { sector: 'transporte',     count: 1, total: 4_000_000_000, total_financed: 4_000_000_000, pct: 19 },
    { sector: 'saude',          count: 2, total: 2_700_000_000, total_financed: 2_700_000_000, pct: 13 },
  ],
};

// ─── Projects Analytics ───────────────────────────────────────────────────────
const PROJECTS_ANALYTICS = {
  sectorDistribution: [
    { sector: 'saude',          count: 2, total_financed:  2_700_000_000, pct: 11 },
    { sector: 'infraestrutura', count: 1, total_financed:  3_000_000_000, pct: 13 },
    { sector: 'transporte',     count: 1, total_financed:  4_000_000_000, pct: 17 },
    { sector: 'energia',        count: 1, total_financed:  8_000_000_000, pct: 34 },
    { sector: 'outros',         count: 1, total_financed:  6_000_000_000, pct: 25 },
  ],
  provinceDistribution: [
    { province: 'Luanda',      count: 4, total_financed: 16_500_000_000, pct: 70 },
    { province: 'Huambo',      count: 1, total_financed:  1_200_000_000, pct: 5  },
    { province: 'Lunda Norte', count: 1, total_financed:  6_000_000_000, pct: 25 },
  ],
};

// ─── Signatures ───────────────────────────────────────────────────────────────
const SIGNATURES_BY_CONTRACT: Record<string, { status: string; signerName: string; signedAt: string | null; expiresAt: string }> = {
  [IDS.contracts[0]]: { status: 'assinado', signerName: 'Dr. João Carlos Baptista',       signedAt: '2026-01-16', expiresAt: '2026-01-23' },
  [IDS.contracts[1]]: { status: 'assinado', signerName: 'Eng.ª Maria Santos Figueiredo',  signedAt: '2026-01-22', expiresAt: '2026-01-29' },
  [IDS.contracts[2]]: { status: 'assinado', signerName: 'Dr. Pedro Lopes da Costa',       signedAt: '2026-02-03', expiresAt: '2026-02-10' },
  [IDS.contracts[3]]: { status: 'pendente', signerName: 'Dr. António Costa Pereira',      signedAt: null,         expiresAt: '2026-07-10' },
  [IDS.contracts[4]]: { status: 'assinado', signerName: 'Dra. Rosa Maria Mendes',         signedAt: '2025-10-05', expiresAt: '2025-10-12' },
  [IDS.contracts[5]]: { status: 'assinado', signerName: 'Eng. Carlos Ferreira Dias',      signedAt: '2025-08-18', expiresAt: '2025-08-25' },
  [IDS.contracts[6]]: { status: 'assinado', signerName: 'Gov. Francisco Neto Silva',      signedAt: '2024-04-03', expiresAt: '2024-04-10' },
  [IDS.contracts[7]]: { status: 'pendente', signerName: 'Dr. Manuel Lopes Pinto',         signedAt: null,         expiresAt: '2026-07-05' },
};

// ─── Automations ──────────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: 'tmpl-001', name: 'Aviso de Vencimento (D-7)',    category: 'vencimento',    channel: 'email',    subject: 'Lembrete: Prestação vence em {{dias}} dias — {{referencia}}', body: 'Caro {{cliente}},\n\nA prestação nº {{numero}} do contrato {{referencia}} no valor de {{valor}} Kz vence em {{data_vencimento}}.\n\nEfectue o pagamento até à data indicada.\n\nMAIOMBE Capital & Credit, Lda.', is_active: 1, created_at: '2026-01-10' },
  { id: 'tmpl-002', name: 'Notificação de Mora',          category: 'cobranca',      channel: 'whatsapp', subject: null, body: 'MAIOMBE: A prestação {{numero}} do contrato {{referencia}} venceu há {{dias_atraso}} dias. Regularize imediatamente ou contacte-nos.', is_active: 1, created_at: '2026-01-10' },
  { id: 'tmpl-003', name: 'Pedido de Assinatura Digital', category: 'assinatura',    channel: 'email',    subject: 'Assinatura Digital — Contrato {{referencia}}', body: 'Prezado {{cliente}},\n\nSolicita-se a assinatura digital do contrato {{referencia}}.\n\nLink de acesso: {{link_assinatura}}\n\nVálido por 7 dias.', is_active: 1, created_at: '2026-01-15' },
  { id: 'tmpl-004', name: 'Alerta de Risco Elevado',      category: 'alerta',        channel: 'ambos',    subject: 'ALERTA: Risco Elevado — {{cliente}}', body: 'Atenção: o nível de risco do cliente {{cliente}} foi classificado como ALTO. Acção imediata necessária.', is_active: 1, created_at: '2026-02-01' },
  { id: 'tmpl-005', name: 'Comunicação Pré-Judicial',     category: 'pre_judicial',  channel: 'email',    subject: 'Notificação Judicial — Contrato {{referencia}}', body: 'Exmo. Sr./Sra. {{cliente}},\n\nNotificamos V.Exa. que o incumprimento do contrato {{referencia}} dará início a procedimentos judiciais no prazo de 10 dias úteis.', is_active: 0, created_at: '2026-03-01' },
];

const TEMPLATE_VARIABLES = [
  { key: '{{cliente}}',         label: 'Nome do Cliente'         },
  { key: '{{referencia}}',      label: 'Referência do Contrato'  },
  { key: '{{valor}}',           label: 'Valor da Prestação (Kz)' },
  { key: '{{data_vencimento}}', label: 'Data de Vencimento'      },
  { key: '{{numero}}',          label: 'Número da Prestação'     },
  { key: '{{dias_atraso}}',     label: 'Dias em Atraso'          },
  { key: '{{dias}}',            label: 'Dias até Vencimento'     },
  { key: '{{link_assinatura}}', label: 'Link de Assinatura'      },
];

// trigger_type values match what Automations.tsx filters:
//   preventive  → displayed in "Preventivas" tab
//   post_default → displayed in "Pós-Incumprimento" tab
const AUTOMATION_RULES = [
  { id: 'rl-001', label: 'Aviso D-7 (email)',              trigger_type: 'preventive',  days_offset:  -7, template_id: 'tmpl-001', channel: 'email',    is_active: 1, template_name: 'Aviso de Vencimento (D-7)'    },
  { id: 'rl-002', label: 'Aviso D-3 (WhatsApp)',           trigger_type: 'preventive',  days_offset:  -3, template_id: 'tmpl-001', channel: 'whatsapp', is_active: 1, template_name: 'Aviso de Vencimento (D-7)'    },
  { id: 'rl-003', label: 'Mora D+1',                       trigger_type: 'post_default', days_offset:   1, template_id: 'tmpl-002', channel: 'whatsapp', is_active: 1, template_name: 'Notificação de Mora'          },
  { id: 'rl-004', label: 'Escalada D+15 (pré-judicial)',   trigger_type: 'post_default', days_offset:  15, template_id: 'tmpl-002', channel: 'ambos',    is_active: 0, template_name: 'Notificação de Mora'          },
  { id: 'rl-005', label: 'Pedido Assinatura (elaboração)', trigger_type: 'post_default', days_offset:   0, template_id: 'tmpl-003', channel: 'email',    is_active: 1, template_name: 'Pedido de Assinatura Digital' },
];

const AUTOMATION_CC = [
  { id: 'cc-001', name: 'Direcção Financeira', email: 'financas@maiombe.co.ao', role: 'dir_financeiro', is_active: 1 },
  { id: 'cc-002', name: 'Jurídico Interno',    email: 'juridico@maiombe.co.ao', role: 'juridico',       is_active: 1 },
  { id: 'cc-003', name: 'Gestão de Conta',     email: 'gca@maiombe.co.ao',      role: 'gestor_conta',   is_active: 1 },
];

// Fields match what Automations.tsx renders (lines ~451-457):
//   l.recipient_name, l.recipient_email, l.subject, l.created_at, l.status === 'sent', l.channel
const AUTOMATION_LAST_SENT = [
  { id: 'log-001', recipient_name: 'Ministério das Finanças',   recipient_email: 'geral@minfin.gov.ao',      channel: 'email',    subject: 'Lembrete: Prestação vence em 7 dias — MAI-2026-001', created_at: '2026-06-22T09:15:00', status: 'sent',   contract_reference: 'MAI-2026-001', template_name: 'Aviso de Vencimento (D-7)'    },
  { id: 'log-002', recipient_name: 'Gov. Provincial do Huambo', recipient_email: 'gov@huambo.gov.ao',        channel: 'whatsapp', subject: null,                                                  created_at: '2026-06-27T08:00:00', status: 'sent',   contract_reference: 'MAI-2026-007', template_name: 'Notificação de Mora'          },
  { id: 'log-003', recipient_name: 'Gov. Provincial de Luanda', recipient_email: 'gov@luanda.gov.ao',        channel: 'email',    subject: 'Lembrete: Prestação vence em 7 dias — MAI-2026-003', created_at: '2026-06-25T10:30:00', status: 'sent',   contract_reference: 'MAI-2026-003', template_name: 'Aviso de Vencimento (D-7)'    },
  { id: 'log-004', recipient_name: 'Ministério da Saúde',       recipient_email: 'rh@minsa.gov.ao',          channel: 'email',    subject: 'Lembrete: Prestação vence em 7 dias — MAI-2026-005', created_at: '2026-06-27T08:00:00', status: 'sent',   contract_reference: 'MAI-2026-005', template_name: 'Aviso de Vencimento (D-7)'    },
  { id: 'log-005', recipient_name: 'ENDIAMA E.P.',              recipient_email: 'dg@endiama.co.ao',         channel: 'email',    subject: 'Assinatura Digital — Contrato MAI-2026-008',           created_at: '2026-06-17T14:20:00', status: 'sent',   contract_reference: 'MAI-2026-008', template_name: 'Pedido de Assinatura Digital' },
  { id: 'log-006', recipient_name: 'BPC — Banco de Poupança',   recipient_email: 'direcao@bpc.ao',           channel: 'email',    subject: 'Assinatura Digital — Contrato MAI-2026-004',           created_at: '2026-06-15T09:00:00', status: 'failed', contract_reference: 'MAI-2026-004', template_name: 'Pedido de Assinatura Digital' },
];

const CLIENTS_WITHOUT_CONTACTS = [
  { id: IDS.clients[2], name: 'Gov. Provincial de Luanda', missing: ['whatsapp'] },
  { id: IDS.clients[6], name: 'Gov. Provincial do Huambo', missing: ['whatsapp', 'email'] },
];

// ─── Amortisation schedule generator ─────────────────────────────────────────
function generateSchedule(contractId: string) {
  const ct  = CONTRACTS.find(c => c.id === contractId) || CONTRACTS[0];
  const freqMap: Record<string, number> = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12, unica_vencimento: ct.term_months };
  const pm  = freqMap[ct.payment_frequency] || 1;
  const n   = Math.round(ct.term_months / pm);
  const gp  = Math.round(ct.grace_period_months / pm);
  const apr = n - gp > 0 ? ct.amount / (n - gp) : 0;
  let cap   = ct.amount;
  const start = new Date(ct.celebration_date);
  return Array.from({ length: n }, (_, i) => {
    const due = new Date(start);
    due.setMonth(due.getMonth() + (i + 1) * pm);
    const interest = Math.round(cap * (ct.interest_rate / 100 / 12) * pm);
    const amort    = i < gp ? 0 : Math.round(apr);
    const residual = i === n - 1 ? 0 : cap - amort;
    const row = {
      id: `sch-${contractId}-${i + 1}`, contract_id: contractId,
      installment_number: i + 1, due_date: due.toISOString().split('T')[0],
      initial_capital: cap, amortization: amort, interest, total_installment: amort + interest,
      residual_capital: residual,
      status: residual === 0 ? 'pago' : new Date(due) < new Date() ? 'vencido' : 'futuro',
      paid_amount: null, paid_at: null,
    };
    cap = residual;
    return row;
  });
}

// ─── URL → mock response mapper ────────────────────────────────────────────────
type MockResponse = { success: true; data: unknown; [key: string]: unknown };

function wrap(payload: unknown, extra: Record<string, unknown> = {}): MockResponse {
  return { success: true, data: payload, ...extra };
}

export function getMockResponse(url: string): MockResponse | undefined {
  const path = url.split('?')[0];

  // ── Dashboard ──────────────────────────────────────────────────────────────
  if (path === '/dashboard/kpis')                return wrap(DASHBOARD_KPIS);
  if (path === '/dashboard/contracts')           return wrap(CONTRACTS.slice(0, 6));
  if (path === '/dashboard/alerts')              return wrap(ALERTS.slice(0, 5));
  if (path === '/dashboard/funding-summary')     return wrap(FUNDING_SOURCES);
  if (path === '/dashboard/schedule-2026')       return wrap(SCHEDULE_2026);
  if (path === '/dashboard/provincial-exposure') return wrap(PROVINCIAL_EXPOSURE);
  if (path === '/dashboard/portfolio-evolution') return wrap(PORTFOLIO_EVOLUTION);

  // ── Clients ────────────────────────────────────────────────────────────────
  if (path === '/clients')
    return wrap({ data: CLIENTS, total: CLIENTS.length, page: 1, limit: 50 });

  if (/^\/clients\/[^/]+$/.test(path)) {
    const id     = path.split('/')[2];
    const client = CLIENTS.find(c => c.id === id) || CLIENTS[0];
    return wrap(client);
  }

  // ── Contracts ─────────────────────────────────────────────────────────────
  if (path === '/contracts')
    return wrap(CONTRACTS, { total: CONTRACTS.length, pagination: { total: CONTRACTS.length, page: 1, limit: 100 } });

  if (/^\/contracts\/[^/]+\/schedule$/.test(path)) {
    const id = path.split('/')[2];
    return wrap(generateSchedule(id));
  }

  if (/^\/contracts\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    return wrap(CONTRACTS.find(c => c.id === id) || CONTRACTS[0]);
  }

  // ── Signatures ────────────────────────────────────────────────────────────
  if (path === '/signatures/latest-by-contracts') return wrap(SIGNATURES_BY_CONTRACT);

  // ── Funding ───────────────────────────────────────────────────────────────
  if (path === '/funding') return wrap({ data: FUNDING_SOURCES, kpis: FUNDING_KPIS });

  // ── Rates ─────────────────────────────────────────────────────────────────
  if (path === '/rates') return wrap({ rateTables: RATE_TABLES, commissions: COMMISSIONS });

  // ── Liabilities ───────────────────────────────────────────────────────────
  if (path === '/liabilities') return wrap({ data: LIABILITIES_LIST, kpis: LIABILITIES_KPIS });

  if (/^\/liabilities\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    const lb = LIABILITIES_LIST.find(l => l.id === id) || LIABILITIES_LIST[0];
    return wrap({ id: lb.id, schedule: generateLiabilitySchedule(lb) });
  }

  // ── Operational Costs ─────────────────────────────────────────────────────
  if (path === '/operational-costs') return wrap(OPERATIONAL_COSTS);

  // ── Margin ────────────────────────────────────────────────────────────────
  if (path === '/margin') {
    const totalR = ACTIVE_CONTRACTS.reduce((s, c) => s + c.amount * (c.interest_rate / 100), 0);
    const totalC = FUNDING_SOURCES.reduce((s, f) => s + f.total_amount * (f.interest_rate / 100), 0);
    return wrap({
      fontes:    FUNDING_SOURCES.map(f => ({ ...f, custo_anual: Math.round(f.total_amount * f.interest_rate / 100), pct_do_total: totalC > 0 ? +((f.total_amount * f.interest_rate / 100 / totalC) * 100).toFixed(1) : 0 })),
      contratos: ACTIVE_CONTRACTS.map(c => ({ ...c, receita_anual: Math.round(c.amount * c.interest_rate / 100), pct_do_total: totalR > 0 ? +((c.amount * c.interest_rate / 100 / totalR) * 100).toFixed(1) : 0 })),
      custosOp:  OPERATIONAL_COSTS,
      totais:    MARGIN_TOTAIS,
    });
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  if (path === '/alerts') return wrap({ data: ALERTS, kpis: ALERT_KPIS });

  // ── Guarantees ────────────────────────────────────────────────────────────
  if (path === '/guarantees') return wrap({ data: GUARANTEES_LIST, kpis: GUARANTEES_KPIS });

  // ── Securities ────────────────────────────────────────────────────────────
  if (path === '/securities') return wrap({ data: SECURITIES_LIST, kpis: SECURITIES_KPIS, policy: SECURITIES_POLICY });

  // ── Projects ──────────────────────────────────────────────────────────────
  if (path === '/projects')           return wrap({ data: PROJECTS_LIST, kpis: PROJECTS_KPIS });
  if (path === '/projects/analytics') return wrap(PROJECTS_ANALYTICS);

  // ── Portfolio ─────────────────────────────────────────────────────────────
  if (path === '/portfolio/analytics') return wrap(PORTFOLIO_ANALYTICS);

  // ── Management Capital ────────────────────────────────────────────────────
  if (path === '/management-capital') return wrap({ data: MGMT_CAPITAL_LIST, kpis: MGMT_CAPITAL_KPIS });

  // ── Risk ──────────────────────────────────────────────────────────────────
  if (path === '/risk') return wrap(RISK_DATA);

  // ── Collections ───────────────────────────────────────────────────────────
  if (path === '/collections') return wrap({ calendar: COLLECTION_CALENDAR, kpis: COLLECTION_KPIS, recovery12: RECOVERY_12 });

  // ── BI ────────────────────────────────────────────────────────────────────
  if (path === '/bi') return wrap(BI_DATA);

  // ── Automations ───────────────────────────────────────────────────────────
  if (path === '/templates')                           return wrap({ templates: TEMPLATES, variables: TEMPLATE_VARIABLES });
  if (path === '/automation/rules')                    return wrap(AUTOMATION_RULES);
  if (path === '/automation/cc')                       return wrap(AUTOMATION_CC);
  if (path === '/automation/last-sent')                return wrap(AUTOMATION_LAST_SENT);
  if (path === '/automation/clients-without-contacts') return wrap(CLIENTS_WITHOUT_CONTACTS);

  return undefined;
}
