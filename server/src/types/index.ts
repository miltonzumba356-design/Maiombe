export type UserRole =
  | 'administrador'
  | 'director_executivo'
  | 'director_financeiro'
  | 'gestor_carteira'
  | 'analista_risco'
  | 'juridico'
  | 'contabilidade'
  | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: number;
  last_login_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Express.Request {
  user: TokenPayload;
}

// Permissions matrix by role and module
export type Module =
  | 'dashboard'
  | 'carteira'
  | 'contratos'
  | 'passivo'
  | 'taxas'
  | 'fontes'
  | 'risco'
  | 'garantias'
  | 'cobranca'
  | 'clientes'
  | 'projetos'
  | 'titulos'
  | 'bi'
  | 'alertas'
  | 'users'
  | 'audit';

export type Action = 'read' | 'write' | 'delete' | 'approve' | 'export';

export const PERMISSIONS: Record<UserRole, Partial<Record<Module, Action[]>>> = {
  administrador: {
    dashboard: ['read', 'write', 'delete', 'approve', 'export'],
    carteira: ['read', 'write', 'delete', 'approve', 'export'],
    contratos: ['read', 'write', 'delete', 'approve', 'export'],
    passivo: ['read', 'write', 'delete', 'approve', 'export'],
    taxas: ['read', 'write', 'delete', 'approve', 'export'],
    fontes: ['read', 'write', 'delete', 'approve', 'export'],
    risco: ['read', 'write', 'delete', 'approve', 'export'],
    garantias: ['read', 'write', 'delete', 'approve', 'export'],
    cobranca: ['read', 'write', 'delete', 'approve', 'export'],
    clientes: ['read', 'write', 'delete', 'approve', 'export'],
    projetos: ['read', 'write', 'delete', 'approve', 'export'],
    titulos: ['read', 'write', 'delete', 'approve', 'export'],
    bi: ['read', 'write', 'delete', 'approve', 'export'],
    alertas: ['read', 'write', 'delete', 'approve', 'export'],
    users: ['read', 'write', 'delete', 'approve', 'export'],
    audit: ['read', 'export'],
  },
  director_executivo: {
    dashboard: ['read', 'export'],
    carteira: ['read', 'export'],
    contratos: ['read', 'export'],
    passivo: ['read', 'export'],
    taxas: ['read', 'export'],
    fontes: ['read', 'export'],
    risco: ['read', 'export'],
    garantias: ['read', 'export'],
    cobranca: ['read', 'export'],
    clientes: ['read', 'export'],
    projetos: ['read', 'export'],
    titulos: ['read', 'export'],
    bi: ['read', 'export'],
    alertas: ['read'],
    audit: ['read'],
  },
  director_financeiro: {
    dashboard: ['read', 'export'],
    carteira: ['read', 'write', 'approve', 'export'],
    contratos: ['read', 'approve', 'export'],
    passivo: ['read', 'write', 'approve', 'export'],
    taxas: ['read', 'write', 'approve', 'export'],
    fontes: ['read', 'write', 'approve', 'export'],
    risco: ['read', 'export'],
    garantias: ['read', 'export'],
    cobranca: ['read', 'export'],
    clientes: ['read', 'export'],
    projetos: ['read', 'export'],
    titulos: ['read', 'write', 'approve', 'export'],
    bi: ['read', 'export'],
    alertas: ['read'],
  },
  gestor_carteira: {
    dashboard: ['read'],
    carteira: ['read', 'write', 'export'],
    contratos: ['read', 'write', 'export'],
    passivo: ['read'],
    taxas: ['read'],
    fontes: ['read'],
    risco: ['read'],
    garantias: ['read'],
    cobranca: ['read', 'write'],
    clientes: ['read', 'write'],
    projetos: ['read', 'write'],
    titulos: ['read'],
    bi: ['read'],
    alertas: ['read', 'write'],
  },
  analista_risco: {
    dashboard: ['read'],
    carteira: ['read'],
    contratos: ['read'],
    passivo: ['read'],
    taxas: ['read'],
    risco: ['read', 'write', 'export'],
    garantias: ['read', 'write'],
    cobranca: ['read'],
    clientes: ['read'],
    projetos: ['read'],
    titulos: ['read'],
    bi: ['read'],
    alertas: ['read'],
  },
  juridico: {
    dashboard: ['read'],
    carteira: ['read'],
    contratos: ['read', 'write', 'export'],
    garantias: ['read', 'write', 'export'],
    cobranca: ['read', 'write', 'export'],
    clientes: ['read'],
    alertas: ['read', 'write'],
  },
  contabilidade: {
    dashboard: ['read'],
    carteira: ['read', 'export'],
    contratos: ['read', 'export'],
    passivo: ['read', 'export'],
    taxas: ['read', 'export'],
    fontes: ['read', 'export'],
    clientes: ['read', 'export'],
    titulos: ['read', 'export'],
    bi: ['read', 'export'],
    alertas: ['read'],
  },
  auditor: {
    dashboard: ['read'],
    carteira: ['read'],
    contratos: ['read'],
    passivo: ['read'],
    taxas: ['read'],
    fontes: ['read'],
    risco: ['read'],
    garantias: ['read'],
    cobranca: ['read'],
    clientes: ['read'],
    projetos: ['read'],
    titulos: ['read'],
    bi: ['read'],
    alertas: ['read'],
    users: ['read'],
    audit: ['read'],
  },
};

export function hasPermission(role: UserRole, module: Module, action: Action): boolean {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;
  const modulePerms = rolePerms[module];
  if (!modulePerms) return false;
  return modulePerms.includes(action);
}
