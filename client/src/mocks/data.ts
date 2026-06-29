// ─── Mock data for presentation / demo mode ──────────────────────────────────
// Injected automatically when the API is unreachable.
// All mutations (POST/PUT/PATCH/DELETE) still go to the real backend.

// ─── Shared IDs ──────────────────────────────────────────────────────────────
const IDS = {
  clients: ['cl-001','cl-002','cl-003','cl-004','cl-005','cl-006','cl-007','cl-008'],
  contracts: ['ct-001','ct-002','ct-003','ct-004','ct-005','ct-006','ct-007','ct-008'],
  funding: ['fn-001','fn-002','fn-003','fn-004'],
  costs: ['op-001','op-002','op-003','op-004','op-005'],
};

// ─── Clients ─────────────────────────────────────────────────────────────────
const CLIENTS = [
  { id: IDS.clients[0], code: 'CLI-001', name: 'Ministério das Finanças', entity_type: 'ministerio',       nif: '5000012301', province: 'Luanda',  risk_rating: 'A', risk_level: 'baixo',  contact_email: 'geral@minfin.gov.ao', phone: '+244923000001', total_exposure: 5_000_000_000, contract_count: 1, execution_pct: 35, repayment_methods: '["ot"]',          next_due_date: '2026-07-15', amortized: 1_750_000_000, outstanding: 3_250_000_000 },
  { id: IDS.clients[1], code: 'CLI-002', name: 'SONANGOL E.P.',           entity_type: 'empresa_publica',  nif: '5000056789', province: 'Luanda',  risk_rating: 'A', risk_level: 'baixo',  contact_email: 'financas@sonangol.co.ao', phone: '+244923000002', total_exposure: 8_000_000_000, contract_count: 1, execution_pct: 22, repayment_methods: '["ot","numerario"]', next_due_date: '2026-07-20', amortized: 1_760_000_000, outstanding: 6_240_000_000 },
  { id: IDS.clients[2], code: 'CLI-003', name: 'Gov. Provincial de Luanda', entity_type: 'governo_provincial', nif: '5000034521', province: 'Luanda',  risk_rating: 'B', risk_level: 'medio', contact_email: 'gov@luanda.gov.ao', phone: '+244923000003', total_exposure: 3_000_000_000, contract_count: 1, execution_pct: 58, repayment_methods: '["bt"]',          next_due_date: '2026-07-01', amortized: 1_740_000_000, outstanding: 1_260_000_000 },
  { id: IDS.clients[3], code: 'CLI-004', name: 'BPC — Banco de Poupança e Crédito', entity_type: 'empresa_publica', nif: '5000098765', province: 'Luanda',  risk_rating: 'B', risk_level: 'medio', contact_email: 'direcao@bpc.ao', phone: '+244923000004', total_exposure: 2_000_000_000, contract_count: 1, execution_pct: 10, repayment_methods: '["numerario"]',    next_due_date: '2026-08-01', amortized: 200_000_000, outstanding: 1_800_000_000 },
  { id: IDS.clients[4], code: 'CLI-005', name: 'Ministério da Saúde',     entity_type: 'ministerio',       nif: '5000076543', province: 'Luanda',  risk_rating: 'A', risk_level: 'baixo',  contact_email: 'rh@minsa.gov.ao', phone: '+244923000005', total_exposure: 1_500_000_000, contract_count: 1, execution_pct: 72, repayment_methods: '["ot"]',          next_due_date: '2026-07-05', amortized: 1_080_000_000, outstanding: 420_000_000 },
  { id: IDS.clients[5], code: 'CLI-006', name: 'TAAG — Linhas Aéreas de Angola', entity_type: 'empresa_publica', nif: '5000045678', province: 'Luanda',  risk_rating: 'B', risk_level: 'medio', contact_email: 'financas@taag.ao', phone: '+244923000006', total_exposure: 4_000_000_000, contract_count: 1, execution_pct: 44, repayment_methods: '["bt"]',          next_due_date: '2026-08-15', amortized: 1_760_000_000, outstanding: 2_240_000_000 },
  { id: IDS.clients[6], code: 'CLI-007', name: 'Gov. Provincial do Huambo', entity_type: 'governo_provincial', nif: '5000023456', province: 'Huambo', risk_rating: 'C', risk_level: 'alto',   contact_email: 'gov@huambo.gov.ao', phone: '+244923000007', total_exposure: 1_200_000_000, contract_count: 1, execution_pct: 95, repayment_methods: '["numerario"]',    next_due_date: '2026-05-01', amortized: 1_140_000_000, outstanding: 60_000_000 },
  { id: IDS.clients[7], code: 'CLI-008', name: 'ENDIAMA E.P.',            entity_type: 'empresa_publica',  nif: '5000087654', province: 'Lunda Norte', risk_rating: 'A', risk_level: 'baixo', contact_email: 'dg@endiama.co.ao', phone: '+244923000008', total_exposure: 6_000_000_000, contract_count: 1, execution_pct: 5,  repayment_methods: '["ot"]',          next_due_date: '2026-09-01', amortized: 300_000_000, outstanding: 5_700_000_000 },
];

// ─── Contracts (for Contracts page: r.data = {success, data:[...], total}) ───
const CONTRACTS = [
  { id: IDS.contracts[0], reference: 'MAI-2026-001', client_id: IDS.clients[0], client_name: 'Ministério das Finanças',    client_phone: null, client_email: 'geral@minfin.gov.ao',       entity_type: 'ministerio',        contract_type: 'modelo_a', status: 'recebidos',       amount: 5_000_000_000, interest_rate: 12,   term_months: 36, payment_frequency: 'trimestral', celebration_date: '2026-01-15', grace_period_months: 3, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'baixo', proximo_vencimento: '2026-07-15', execution_pct: 35, repayment_methods: '["ot"]' },
  { id: IDS.contracts[1], reference: 'MAI-2026-002', client_id: IDS.clients[1], client_name: 'SONANGOL E.P.',              client_phone: null, client_email: 'financas@sonangol.co.ao',   entity_type: 'empresa_publica',   contract_type: 'modelo_a', status: 'recebidos',       amount: 8_000_000_000, interest_rate: 10,   term_months: 48, payment_frequency: 'semestral',  celebration_date: '2026-01-20', grace_period_months: 6, opening_commission: 1.2, late_interest_rate: 5, risk_level: 'baixo', proximo_vencimento: '2026-07-20', execution_pct: 22, repayment_methods: '["ot","numerario"]' },
  { id: IDS.contracts[2], reference: 'MAI-2026-003', client_id: IDS.clients[2], client_name: 'Gov. Provincial de Luanda',  client_phone: null, client_email: 'gov@luanda.gov.ao',         entity_type: 'governo_provincial', contract_type: 'modelo_a', status: 'recebidos',       amount: 3_000_000_000, interest_rate: 14,   term_months: 24, payment_frequency: 'mensal',     celebration_date: '2026-02-01', grace_period_months: 0, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'medio', proximo_vencimento: '2026-07-01', execution_pct: 58, repayment_methods: '["bt"]' },
  { id: IDS.contracts[3], reference: 'MAI-2026-004', client_id: IDS.clients[3], client_name: 'BPC — Banco de Poupança e Crédito', client_phone: null, client_email: 'direcao@bpc.ao', entity_type: 'empresa_publica',   contract_type: 'modelo_b', status: 'em_formalizacao', amount: 2_000_000_000, interest_rate: 13,   term_months: 36, payment_frequency: 'trimestral', celebration_date: '2026-03-01', grace_period_months: 3, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'medio', proximo_vencimento: '2026-08-01', execution_pct: 10, repayment_methods: '["numerario"]' },
  { id: IDS.contracts[4], reference: 'MAI-2026-005', client_id: IDS.clients[4], client_name: 'Ministério da Saúde',        client_phone: null, client_email: 'rh@minsa.gov.ao',          entity_type: 'ministerio',        contract_type: 'modelo_a', status: 'recebidos',       amount: 1_500_000_000, interest_rate: 15,   term_months: 18, payment_frequency: 'mensal',     celebration_date: '2025-10-01', grace_period_months: 0, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'baixo', proximo_vencimento: '2026-07-05', execution_pct: 72, repayment_methods: '["ot"]' },
  { id: IDS.contracts[5], reference: 'MAI-2026-006', client_id: IDS.clients[5], client_name: 'TAAG — Linhas Aéreas de Angola', client_phone: null, client_email: 'financas@taag.ao',  entity_type: 'empresa_publica',   contract_type: 'modelo_b', status: 'recebidos',       amount: 4_000_000_000, interest_rate: 11,   term_months: 60, payment_frequency: 'semestral',  celebration_date: '2025-08-15', grace_period_months: 6, opening_commission: 1.2, late_interest_rate: 5, risk_level: 'medio', proximo_vencimento: '2026-08-15', execution_pct: 44, repayment_methods: '["bt"]' },
  { id: IDS.contracts[6], reference: 'MAI-2026-007', client_id: IDS.clients[6], client_name: 'Gov. Provincial do Huambo', client_phone: null, client_email: 'gov@huambo.gov.ao',         entity_type: 'governo_provincial', contract_type: 'modelo_a', status: 'vencido',         amount: 1_200_000_000, interest_rate: 14,   term_months: 24, payment_frequency: 'mensal',     celebration_date: '2024-04-01', grace_period_months: 0, opening_commission: 1.5, late_interest_rate: 5, risk_level: 'alto',  proximo_vencimento: '2026-05-01', execution_pct: 95, repayment_methods: '["numerario"]' },
  { id: IDS.contracts[7], reference: 'MAI-2026-008', client_id: IDS.clients[7], client_name: 'ENDIAMA E.P.',              client_phone: null, client_email: 'dg@endiama.co.ao',          entity_type: 'empresa_publica',   contract_type: 'modelo_c', status: 'elaboracao',      amount: 6_000_000_000, interest_rate: 9,    term_months: 48, payment_frequency: 'trimestral', celebration_date: '2026-06-15', grace_period_months: 6, opening_commission: 1.2, late_interest_rate: 5, risk_level: 'baixo', proximo_vencimento: '2026-09-01', execution_pct: 5,  repayment_methods: '["ot"]' },
];

// ─── Funding Sources ──────────────────────────────────────────────────────────
const FUNDING_SOURCES = [
  { id: IDS.funding[0], name: 'Linha de Crédito BFA', source_type: 'linha_bancaria', institution: 'BFA — Banco de Fomento Angola', product: 'Linha Sectorial 2025', total_amount: 10_000_000_000, utilized_amount: 8_500_000_000, interest_rate: 8.5, maturity_date: '2027-12-31', guarantee_given: 'Carteira de crédito de 1ª linha', status: 'activa', notes: 'Renovação automática sujeita a revisão anual.' },
  { id: IDS.funding[1], name: 'Capital Próprio — Accionistas', source_type: 'capital_proprio', institution: 'Capital & Credit, Lda.', product: 'Capital Social', total_amount: 5_000_000_000, utilized_amount: 4_200_000_000, interest_rate: 5.0, maturity_date: null, guarantee_given: null, status: 'activa', notes: 'Capital subscrito e realizado pelos sócios fundadores.' },
  { id: IDS.funding[2], name: 'Linha de Crédito BCI', source_type: 'credito_bancario', institution: 'BCI — Banco de Crédito e Investimento', product: 'Linha Corporate 2026', total_amount: 7_000_000_000, utilized_amount: 5_800_000_000, interest_rate: 9.0, maturity_date: '2028-06-30', guarantee_given: 'Títulos do Tesouro Nacional', status: 'activa', notes: 'Linha aprovada em Março 2026 para financiamento a médio prazo.' },
  { id: IDS.funding[3], name: 'Obrigações — Emissão 2025', source_type: 'obrigacoes', institution: 'Mercado de Capitais de Angola', product: 'MAIOMBE OBR 2025-2028', total_amount: 3_000_000_000, utilized_amount: 3_000_000_000, interest_rate: 7.5, maturity_date: '2028-03-15', guarantee_given: 'Sem garantia real — Categoria AA', status: 'activa', notes: 'Emissão colocada junto de investidores institucionais.' },
];

const FUNDING_KPIS = {
  totalCaptado: 25_000_000_000,
  linhasBancarias: 17_000_000_000,
  numBancos: 2,
  capitalProprio: 5_000_000_000,
  investidoresPrivados: 3_000_000_000,
  custoMedioPassivo: 7.9,
};

// ─── Rates & Commissions ──────────────────────────────────────────────────────
const RATE_TABLES = [
  { id: 'rt-001', entity_type: 'Governo Central',        min_rate: 8,  base_rate: 10, max_rate: 12, management_commission: 0.5, opening_commission: 1.0 },
  { id: 'rt-002', entity_type: 'Ministério',             min_rate: 8,  base_rate: 11, max_rate: 13, management_commission: 0.5, opening_commission: 1.2 },
  { id: 'rt-003', entity_type: 'Governo Provincial',     min_rate: 10, base_rate: 13, max_rate: 15, management_commission: 0.5, opening_commission: 1.5 },
  { id: 'rt-004', entity_type: 'Adm. Municipal',         min_rate: 10, base_rate: 13, max_rate: 15, management_commission: 0.5, opening_commission: 1.5 },
  { id: 'rt-005', entity_type: 'Empresa Pública',        min_rate: 10, base_rate: 13, max_rate: 16, management_commission: 0.8, opening_commission: 1.5 },
  { id: 'rt-006', entity_type: 'Empresa Privada',        min_rate: 13, base_rate: 16, max_rate: 20, management_commission: 1.0, opening_commission: 2.0 },
];

const COMMISSIONS = [
  { id: 'cm-001', name: 'Comissão de Abertura de Dossier', calculation_base: 'Sobre o Capital Mutuado',  rate_min: 1.0, rate_max: 2.5, periodicity: 'Única (assinatura)',    is_capitalizable: 0, can_reinvest: 0, description: 'Cobrada no momento da assinatura do contrato.' },
  { id: 'cm-002', name: 'Comissão de Gestão Anual',        calculation_base: 'Sobre o Capital em Dívida', rate_min: 0.3, rate_max: 1.0, periodicity: 'Anual',                 is_capitalizable: 0, can_reinvest: 0, description: 'Cobrada anualmente sobre o saldo em dívida.' },
  { id: 'cm-003', name: 'Juro de Mora',                    calculation_base: 'Sobre a Prestação Vencida', rate_min: 3.0, rate_max: 8.0, periodicity: 'Automático (por dia)',  is_capitalizable: 1, can_reinvest: 0, description: 'Aplicado por cada dia de atraso no pagamento.' },
  { id: 'cm-004', name: 'Comissão de Imobilização',        calculation_base: 'Sobre o Cap. Não Desemb.',  rate_min: 0.1, rate_max: 0.5, periodicity: 'Mensal',                is_capitalizable: 0, can_reinvest: 0, description: 'Cobrada sobre o capital aprovado mas ainda não desembolsado.' },
];

// ─── Operational Costs ────────────────────────────────────────────────────────
const OPERATIONAL_COSTS = [
  { id: IDS.costs[0], name: 'Salários e Encargos — Equipa de 12',   category: 'pessoal',        amount_monthly: 8_500_000,  is_active: 1, notes: 'Inclui seguro social e subsídios.' },
  { id: IDS.costs[1], name: 'Sistema MAIOMBE + Infra Cloud',         category: 'sistema',        amount_monthly: 1_200_000,  is_active: 1, notes: 'Licença anual + custo mensal de servidores.' },
  { id: IDS.costs[2], name: 'Serviços Jurídicos e Notariais',        category: 'juridico',       amount_monthly: 750_000,    is_active: 1, notes: 'Advogados externos e notários.' },
  { id: IDS.costs[3], name: 'Renda, Electricidade e Escritório',     category: 'administrativo', amount_monthly: 600_000,    is_active: 1, notes: 'Sede em Luanda — Talatona.' },
  { id: IDS.costs[4], name: 'Formações e Deslocações',               category: 'outros',         amount_monthly: 300_000,    is_active: 1, notes: 'Formação da equipa e viagens de negócio.' },
];

// ─── Margin Analysis ──────────────────────────────────────────────────────────
const ACTIVE_CONTRACTS = CONTRACTS.filter(c => ['recebidos','em_vigor','em_risco','vencido'].includes(c.status));

const MARGIN_TOTAIS = (() => {
  const receitaActiva   = ACTIVE_CONTRACTS.reduce((s, c) => s + c.amount * (c.interest_rate / 100), 0);
  const custoPassivo    = FUNDING_SOURCES.filter(f => f.status === 'activa').reduce((s, f) => s + f.total_amount * (f.interest_rate / 100), 0);
  const custoOp         = OPERATIONAL_COSTS.filter(o => o.is_active).reduce((s, o) => s + o.amount_monthly * 12, 0);
  const margemBruta     = receitaActiva - custoPassivo;
  const resultadoLiq    = margemBruta - custoOp;
  const taxaActivaMedia = ACTIVE_CONTRACTS.reduce((s, c) => s + c.interest_rate, 0) / (ACTIVE_CONTRACTS.length || 1);
  const taxaPassivaMedia= FUNDING_SOURCES.reduce((s, f) => s + f.interest_rate, 0) / (FUNDING_SOURCES.length || 1);
  return {
    receitaActiva, custoPassivo, margemBruta,
    custosOperacionais: custoOp, resultadoLiquido: resultadoLiq,
    taxaActivaMedia: +taxaActivaMedia.toFixed(2),
    taxaPassivaMedia: +taxaPassivaMedia.toFixed(2),
    spread: +(taxaActivaMedia - taxaPassivaMedia).toFixed(2),
    totalFontes: FUNDING_SOURCES.reduce((s, f) => s + f.total_amount, 0),
    totalContratos: ACTIVE_CONTRACTS.reduce((s, c) => s + c.amount, 0),
  };
})();

// ─── Alerts ───────────────────────────────────────────────────────────────────
const ALERTS = [
  { id: 'al-001', title: 'Prestação Vencida — MAI-2026-007',       description: 'Gov. Provincial do Huambo não efectuou o pagamento da prestação nº 26 no valor de 66.500.000 Kz. Em atraso há 59 dias.', severity: 'urgente',     category: 'vencimento',  contract_reference: 'MAI-2026-007', created_at: '2026-05-01', resolved_at: null },
  { id: 'al-002', title: 'Risco Elevado — MAI-2026-003',           description: 'Score de risco do Gov. Prov. de Luanda subiu para 72/100 após revisão trimestral. Verificar garantias constituídas.', severity: 'urgente',     category: 'risco',       contract_reference: 'MAI-2026-003', created_at: '2026-06-10', resolved_at: null },
  { id: 'al-003', title: 'Fonte a Expirar — Obrigações 2025',      description: 'Emissão MAIOMBE OBR 2025-2028 atinge maturidade em 259 dias (Mar/2028). Iniciar processo de renovação ou refinanciamento.', severity: 'atencao',    category: 'financiamento', contract_reference: null, created_at: '2026-06-15', resolved_at: null },
  { id: 'al-004', title: 'Formalização Pendente — MAI-2026-004',   description: 'Contrato BPC em formalização há 119 dias. Escritura pública aguarda agendamento notarial.', severity: 'atencao',    category: 'formalização', contract_reference: 'MAI-2026-004', created_at: '2026-03-01', resolved_at: null },
  { id: 'al-005', title: 'Carência a Terminar — MAI-2026-002',     description: 'Período de carência de 6 meses da SONANGOL termina em Agosto. Primeira amortização de capital prevista para 20/08/2026.', severity: 'informativo', category: 'carência',    contract_reference: 'MAI-2026-002', created_at: '2026-06-20', resolved_at: null },
  { id: 'al-006', title: 'Desembolso Aprovado — MAI-2026-008',     description: 'Contrato ENDIAMA aprovado pelo Conselho de Administração. Aguarda formalização para início do processo de desembolso.', severity: 'positivo',    category: 'aprovação',   contract_reference: 'MAI-2026-008', created_at: '2026-06-25', resolved_at: null },
];

const ALERT_KPIS = {
  urgentes: 2, atencao: 2, informativos: 1, positivos: 1,
  totalActivos: 6, totalResolvidos: 14,
};

// ─── Dashboard data ───────────────────────────────────────────────────────────
const DASHBOARD_KPIS = {
  capitalCaptado:      25_000_000_000,
  capitalAplicado:     21_500_000_000,
  creditoVencido:       1_200_000_000,
  rentabilidadeLiquida: MARGIN_TOTAIS.spread,
  utilizacaoCapital:    86,
  nplRatio:             5.6,
  taxaRecuperacao:      94.4,
  garantias:            23,
  healthScore:          78,
  contratos: { total: 8, em_vigor: 6, em_risco: 2 },
  clientes: 8,
  alertas: [
    { type: 'urgente',     count: 2 },
    { type: 'atencao',     count: 2 },
    { type: 'informativo', count: 2 },
  ],
  riskMatrix: [
    { risk_level: 'baixo',   count: 4, total_amount: 14_500_000_000 },
    { risk_level: 'medio',   count: 2, total_amount:  5_000_000_000 },
    { risk_level: 'alto',    count: 1, total_amount:  1_200_000_000 },
    { risk_level: 'critico', count: 0, total_amount:              0 },
  ],
};

const DASHBOARD_CONTRACTS = CONTRACTS.slice(0, 6);

const PORTFOLIO_EVOLUTION = [
  { month: 'Jul/25', value: 8.2  },
  { month: 'Ago/25', value: 9.1  },
  { month: 'Set/25', value: 10.5 },
  { month: 'Out/25', value: 11.8 },
  { month: 'Nov/25', value: 13.2 },
  { month: 'Dez/25', value: 15.6 },
  { month: 'Jan/26', value: 17.4 },
  { month: 'Fev/26', value: 18.9 },
  { month: 'Mar/26', value: 20.1 },
  { month: 'Abr/26', value: 20.8 },
  { month: 'Mai/26', value: 21.2 },
  { month: 'Jun/26', value: 21.5 },
];

const DASHBOARD_ALERTS = ALERTS.slice(0, 5);

const PROVINCIAL_EXPOSURE = [
  { province: 'Luanda',      total: 18_500_000_000 },
  { province: 'Huambo',      total:  1_200_000_000 },
  { province: 'Lunda Norte', total:  6_000_000_000 },
  { province: 'Benguela',    total:              0 },
  { province: 'Huíla',       total:              0 },
  { province: 'Malanje',     total:              0 },
];

const SCHEDULE_2026 = [
  { month: 'Jan', value: 1_250_000_000, status: 'Recebido' },
  { month: 'Fev', value:   980_000_000, status: 'Recebido' },
  { month: 'Mar', value: 1_450_000_000, status: 'Recebido' },
  { month: 'Abr', value:   870_000_000, status: 'Recebido' },
  { month: 'Mai', value: 1_100_000_000, status: 'Recebido' },
  { month: 'Jun', value: 2_300_000_000, status: 'Recebido' },
  { month: 'Jul', value: 1_650_000_000, status: 'Em Curso' },
  { month: 'Ago', value: 2_800_000_000, status: 'Em Curso' },
  { month: 'Set', value: 1_200_000_000, status: 'Em Curso' },
  { month: 'Out', value:   900_000_000, status: 'Em Curso' },
  { month: 'Nov', value: 1_350_000_000, status: 'Em Curso' },
  { month: 'Dez', value: 1_700_000_000, status: 'Em Curso' },
];

// ─── Amortization schedule generator ─────────────────────────────────────────
function generateSchedule(contractId: string) {
  const ct = CONTRACTS.find(c => c.id === contractId) || CONTRACTS[0];
  const freqMap: Record<string, number> = {
    mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12, unica_vencimento: ct.term_months,
  };
  const periodMonths = freqMap[ct.payment_frequency] || 1;
  const numPeriods   = Math.round(ct.term_months / periodMonths);
  const gracePeriods = Math.round(ct.grace_period_months / periodMonths);
  const amortPeriods = numPeriods - gracePeriods;
  const amortPerPeriod = amortPeriods > 0 ? ct.amount / amortPeriods : 0;

  let capital = ct.amount;
  const rows = [];
  const startDate = new Date(ct.celebration_date);

  for (let i = 1; i <= numPeriods; i++) {
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + i * periodMonths);
    const periodRate = (ct.interest_rate / 100 / 12) * periodMonths;
    const interest   = Math.round(capital * periodRate);
    const amort      = i <= gracePeriods ? 0 : Math.round(amortPerPeriod);
    const total      = amort + interest;
    const residual   = i === numPeriods ? 0 : capital - amort;
    rows.push({
      id: `sch-${contractId}-${i}`,
      contract_id: contractId,
      installment_number: i,
      due_date: due.toISOString().split('T')[0],
      initial_capital: capital,
      amortization: amort,
      interest,
      total_installment: total,
      residual_capital: residual,
      status: residual === 0 ? 'pago' : new Date(due) < new Date() ? 'vencido' : 'futuro',
      paid_amount: null,
      paid_at: null,
    });
    capital = residual;
  }
  return rows;
}

// ─── Liabilities (Rates page uses /liabilities for passivo KPI) ──────────────
const LIABILITIES = {
  kpis: {
    custoMedioPassivo: 7.9,
    totalPassivo: 25_000_000_000,
    utilizacaoMedia: 86,
  },
};

// ─── URL → response.data mapper ───────────────────────────────────────────────
// Returns what should be placed in `response.data` (the axios response `.data` property).
// Query functions use `.then(r => r.data.data)` or `.then(r => r.data)` depending on the endpoint.
// Convention used in this codebase: most endpoints return { success: true, data: <payload> }

type MockResponse = { success: true; data: unknown; [key: string]: unknown };

function wrap(payload: unknown, extra: Record<string, unknown> = {}): MockResponse {
  return { success: true, data: payload, ...extra };
}

export function getMockResponse(url: string): MockResponse | undefined {
  // Remove query string for matching
  const path = url.split('?')[0];

  // Dashboard
  if (path === '/dashboard/kpis')               return wrap(DASHBOARD_KPIS);
  if (path === '/dashboard/contracts')           return wrap(DASHBOARD_CONTRACTS);
  if (path === '/dashboard/alerts')             return wrap(DASHBOARD_ALERTS);
  if (path === '/dashboard/funding-summary')    return wrap(FUNDING_SOURCES.slice(0, 4));
  if (path === '/dashboard/schedule-2026')      return wrap(SCHEDULE_2026);
  if (path === '/dashboard/provincial-exposure') return wrap(PROVINCIAL_EXPOSURE);
  if (path === '/dashboard/portfolio-evolution') return wrap(PORTFOLIO_EVOLUTION);

  // Clients — r.data.data returns {data:[...], total}
  if (path === '/clients')
    return wrap({ data: CLIENTS, total: CLIENTS.length, page: 1, limit: 50 });

  // Contracts — r.data returns {success, data:[...], total}
  if (path === '/contracts')
    return wrap(CONTRACTS, { total: CONTRACTS.length });

  // Contract schedule — dynamic: /contracts/:id/schedule
  if (/^\/contracts\/[^/]+\/schedule$/.test(path)) {
    const id = path.split('/')[2];
    return wrap(generateSchedule(id));
  }

  // Funding
  if (path === '/funding')
    return wrap({ data: FUNDING_SOURCES, kpis: FUNDING_KPIS });

  // Rates
  if (path === '/rates')
    return wrap({ rateTables: RATE_TABLES, commissions: COMMISSIONS });

  // Liabilities (used by Rates page for custo passivo)
  if (path === '/liabilities')
    return wrap(LIABILITIES);

  // Operational costs
  if (path === '/operational-costs')
    return wrap(OPERATIONAL_COSTS);

  // Margin analysis
  if (path === '/margin') {
    const totalReceita = ACTIVE_CONTRACTS.reduce((s, c) => s + c.amount * (c.interest_rate / 100), 0);
    const totalCusto   = FUNDING_SOURCES.filter(f => f.status === 'activa').reduce((s, f) => s + f.total_amount * (f.interest_rate / 100), 0);
    return wrap({
      fontes: FUNDING_SOURCES.map(f => ({
        ...f,
        custo_anual: Math.round(f.total_amount * (f.interest_rate / 100)),
        pct_do_total: totalCusto > 0 ? +((f.total_amount * f.interest_rate / 100 / totalCusto) * 100).toFixed(1) : 0,
      })),
      contratos: ACTIVE_CONTRACTS.map(c => ({
        ...c,
        receita_anual: Math.round(c.amount * (c.interest_rate / 100)),
        pct_do_total: totalReceita > 0 ? +((c.amount * c.interest_rate / 100 / totalReceita) * 100).toFixed(1) : 0,
      })),
      custosOp: OPERATIONAL_COSTS,
      totais: MARGIN_TOTAIS,
    });
  }

  // Alerts — r.data.data returns {data:[...], kpis:{}}
  if (path === '/alerts')
    return wrap({ data: ALERTS, kpis: ALERT_KPIS });

  return undefined;
}
