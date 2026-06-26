export type UserRole =
  | 'administrador'
  | 'director_executivo'
  | 'director_financeiro'
  | 'gestor_carteira'
  | 'analista_risco'
  | 'juridico'
  | 'contabilidade'
  | 'auditor';

export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  director_executivo: 'Director Executivo',
  director_financeiro: 'Director Financeiro',
  gestor_carteira: 'Gestor de Carteira',
  analista_risco: 'Analista de Risco',
  juridico: 'Jurídico',
  contabilidade: 'Contabilidade',
  auditor: 'Auditor',
};

export type Module =
  | 'dashboard' | 'carteira' | 'contratos' | 'passivo' | 'taxas'
  | 'fontes' | 'risco' | 'garantias' | 'cobranca' | 'clientes'
  | 'projetos' | 'titulos' | 'bi' | 'alertas';

export type Action = 'read' | 'write' | 'delete' | 'approve' | 'export';

export const PERMISSIONS: Record<UserRole, Partial<Record<Module, Action[]>>> = {
  administrador: {
    dashboard: ['read','write','delete','approve','export'],
    carteira:  ['read','write','delete','approve','export'],
    contratos: ['read','write','delete','approve','export'],
    passivo:   ['read','write','delete','approve','export'],
    taxas:     ['read','write','delete','approve','export'],
    fontes:    ['read','write','delete','approve','export'],
    risco:     ['read','write','delete','approve','export'],
    garantias: ['read','write','delete','approve','export'],
    cobranca:  ['read','write','delete','approve','export'],
    clientes:  ['read','write','delete','approve','export'],
    projetos:  ['read','write','delete','approve','export'],
    titulos:   ['read','write','delete','approve','export'],
    bi:        ['read','write','delete','approve','export'],
    alertas:   ['read','write','delete','approve','export'],
  },
  director_executivo: {
    dashboard: ['read','export'], carteira:  ['read','export'],
    contratos: ['read','export'], passivo:   ['read','export'],
    taxas:     ['read','export'], fontes:    ['read','export'],
    risco:     ['read','export'], garantias: ['read','export'],
    cobranca:  ['read','export'], clientes:  ['read','export'],
    projetos:  ['read','export'], titulos:   ['read','export'],
    bi:        ['read','export'], alertas:   ['read'],
  },
  director_financeiro: {
    dashboard: ['read','export'],
    carteira:  ['read','write','approve','export'],
    contratos: ['read','approve','export'],
    passivo:   ['read','write','approve','export'],
    taxas:     ['read','write','approve','export'],
    fontes:    ['read','write','approve','export'],
    risco:     ['read','export'], garantias: ['read','export'],
    cobranca:  ['read','export'], clientes:  ['read','export'],
    projetos:  ['read','export'],
    titulos:   ['read','write','approve','export'],
    bi:        ['read','export'], alertas:   ['read'],
  },
  gestor_carteira: {
    dashboard: ['read'],
    carteira:  ['read','write','export'],
    contratos: ['read','write','export'],
    passivo:   ['read'], taxas: ['read'], fontes: ['read'],
    risco:     ['read'], garantias: ['read'],
    cobranca:  ['read','write'],
    clientes:  ['read','write'],
    projetos:  ['read','write'],
    titulos:   ['read'], bi: ['read'],
    alertas:   ['read','write'],
  },
  analista_risco: {
    dashboard: ['read'], carteira:  ['read'], contratos: ['read'],
    passivo:   ['read'], taxas: ['read'],
    risco:     ['read','write','export'],
    garantias: ['read','write'],
    cobranca:  ['read'], clientes:  ['read'],
    projetos:  ['read'], titulos:   ['read'],
    bi:        ['read'], alertas:   ['read'],
  },
  juridico: {
    dashboard: ['read'], carteira:  ['read'],
    contratos: ['read','write','export'],
    garantias: ['read','write','export'],
    cobranca:  ['read','write','export'],
    clientes:  ['read'], alertas:   ['read','write'],
  },
  contabilidade: {
    dashboard: ['read'],
    carteira:  ['read','export'],
    contratos: ['read','export'],
    passivo:   ['read','export'],
    taxas:     ['read','export'],
    fontes:    ['read','export'],
    clientes:  ['read','export'],
    titulos:   ['read','export'],
    bi:        ['read','export'],
    alertas:   ['read'],
  },
  auditor: {
    dashboard: ['read'], carteira:  ['read'], contratos: ['read'],
    passivo:   ['read'], taxas: ['read'],     fontes: ['read'],
    risco:     ['read'], garantias: ['read'], cobranca:  ['read'],
    clientes:  ['read'], projetos:  ['read'], titulos:   ['read'],
    bi:        ['read'], alertas:   ['read'],
  },
};

export function canAccess(role: UserRole, module: Module, action: Action = 'read'): boolean {
  const perms = PERMISSIONS[role]?.[module];
  return perms ? perms.includes(action) : false;
}

export interface AuthUser {
  sub: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Contract {
  id: string;
  reference: string;
  contract_type: 'modelo_a' | 'modelo_b' | 'modelo_c';
  status: string;
  client_id: string;
  client_name: string;
  entity_type: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  payment_frequency: string;
  celebration_date: string;
  first_disbursement_date?: string;
  late_interest_rate: number;
  opening_commission: number;
  repayment_methods: string;
  main_guarantee?: string;
  guarantee_value?: number;
  object?: string;
  risk_level: string;
  digital_signature: number;
}

export interface Client {
  id: string;
  code: string;
  name: string;
  nif: string;
  entity_type: string;
  province?: string;
  risk_rating?: string;
  risk_score?: number;
  total_contracts?: number;
  total_exposure?: number;
}

export interface AmortizationSchedule {
  id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  initial_capital: number;
  amortization: number;
  interest: number;
  total_installment: number;
  residual_capital: number;
  status: string;
}

export interface Guarantee {
  id: string;
  reference: string;
  contract_id: string;
  contract_reference?: string;
  client_name?: string;
  guarantee_type: string;
  guarantor: string;
  value: number;
  coverage_percentage?: number;
  start_date: string;
  expiry_date: string;
  status: string;
}

export interface Liability {
  id: string;
  reference: string;
  liability_type: string;
  creditor_name: string;
  total_amount: number;
  outstanding_amount: number;
  interest_rate: number;
  start_date: string;
  maturity_date?: string;
  payment_frequency?: string;
  guarantee_given?: string;
  status: string;
}

export interface Security {
  id: string;
  series: string;
  security_type: 'OT' | 'BT';
  client_name: string;
  contract_reference: string;
  face_value: number;
  maturity_date: string;
  yield_rate?: number;
  discount_accepted: number;
  credit_deducted: number;
  status: string;
}

export interface Alert {
  id: string;
  alert_type: string;
  severity: 'urgente' | 'atencao' | 'informativo';
  title: string;
  description: string;
  entity_type?: string;
  entity_id?: string;
  is_read: number;
  is_resolved: number;
  created_at: string;
}

export interface RiskAssessment {
  id: string;
  contract_id: string;
  client_id: string;
  reference?: string;
  client_name?: string;
  contract_amount?: number;
  risk_level: string;
  overall_score: number;
  recommended_action?: string;
  action_deadline?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  executing_entity: string;
  beneficiary?: string;
  location?: string;
  province?: string;
  sector?: string;
  total_value: number;
  financed_amount: number;
  execution_percentage: number;
  contract_id?: string;
  contract_reference?: string;
  status: string;
}

export interface FundingSource {
  id: string;
  name: string;
  source_type: string;
  institution?: string;
  product?: string;
  total_amount: number;
  utilized_amount: number;
  interest_rate: number;
  maturity_date?: string;
  guarantee_given?: string;
  status: string;
}
