import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import authRoutes from './auth.routes';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { DashboardService } from '../services/dashboard.service';
import { ContractsController } from '../controllers/contracts.controller';
import { ClientsService } from '../services/clients.service';
import { LiabilitiesService } from '../services/liabilities.service';
import { GuaranteesService } from '../services/guarantees.service';
import { RiskService } from '../services/risk.service';
import { SecuritiesService } from '../services/securities.service';
import { AlertsService } from '../services/alerts.service';
import { FundingService } from '../services/funding.service';
import { ProjectsService } from '../services/projects.service';
import { sendSuccess } from '../utils/response';
import { getDatabase } from '../database/connection';
import { auditLog } from '../middlewares/audit.middleware';
import { ManagementCapitalService } from '../services/management_capital.service';
import { NotificationService } from '../services/notification.service';
import { SignatureService } from '../services/signature.service';
import { TemplateService } from '../services/template.service';
import { AutomationService } from '../services/automation.service';
import { TEMPLATE_VARIABLES } from '../services/template.service';
import { eventsBus } from '../services/events.service';
import { config } from '../config';

const router    = Router();
const notifSvc  = new NotificationService();
const sigSvc    = new SignatureService();
const tmplSvc   = new TemplateService();
const autoSvc   = new AutomationService();

function firstQuery(value: string | string[] | undefined): string | undefined {
  const result = Array.isArray(value) ? value[0] : value;
  return result || undefined;
}

function stringQuery(query: Request['query']): Record<string, string | undefined> {
  const source = query as unknown as Record<string, string | string[] | undefined>;
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, firstQuery(value)])
  ) as Record<string, string | undefined>;
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

// Auth
router.use('/auth', authRoutes);

// ── SSE — eventos em tempo real ───────────────────────────────────────────────
router.get('/events', (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) { res.status(401).end(); return; }
  try { jwt.verify(token, config.jwt.secret); } catch { res.status(401).end(); return; }

  const clientId = eventsBus.addClient(res);

  req.on('close', () => eventsBus.removeClient(clientId));
});

// ── ENDPOINTS PÚBLICOS (sem autenticação) ─────────────────────────────────────
// Ver documento a assinar
router.get('/public/sign/:token', (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = sigSvc.getByToken(routeParam(req.params.token));
    if (!data) { res.status(404).json({ success: false, message: 'Link inválido ou expirado.' }); return; }
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// Confirmar assinatura
router.post('/public/sign/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const result = await sigSvc.sign(routeParam(req.params.token), ip, ua);
    sendSuccess(res, result, 200, 'Documento assinado com sucesso.');
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// Recusar assinatura
router.post('/public/sign/:token/refuse', (req: Request, res: Response, next: NextFunction) => {
  try {
    sigSvc.refuse(routeParam(req.params.token));
    sendSuccess(res, null, 200, 'Pedido recusado.');
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// All routes below require authentication
router.use(authenticate);

// DASHBOARD
const dashSvc = new DashboardService();
router.get('/dashboard/kpis', authorize('dashboard', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, dashSvc.getKpis()); } catch (e) { next(e); }
});
router.get('/dashboard/contracts', authorize('dashboard', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, dashSvc.getContratosAtivos()); } catch (e) { next(e); }
});
router.get('/dashboard/alerts', authorize('dashboard', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, dashSvc.getAlertas()); } catch (e) { next(e); }
});
router.get('/dashboard/funding-summary', authorize('dashboard', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, dashSvc.getFontesResumo()); } catch (e) { next(e); }
});
router.get('/dashboard/schedule-2026', authorize('dashboard', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, dashSvc.getCronograma2026()); } catch (e) { next(e); }
});
router.get('/dashboard/provincial-exposure', authorize('dashboard', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, dashSvc.getExposicaoProvincial()); } catch (e) { next(e); }
});
router.get('/dashboard/portfolio-evolution', authorize('dashboard', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, dashSvc.getPortfolioEvolution()); } catch (e) { next(e); }
});

// PORTFOLIO ANALYTICS
router.get('/portfolio/analytics', authorize('carteira', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();

    const entityExposure = db.prepare(`
      SELECT cl.entity_type,
             COALESCE(SUM(c.amount), 0) as total_amount,
             COUNT(*) as count
      FROM contracts c
      JOIN clients cl ON cl.id = c.client_id
      WHERE c.status = 'recebidos'
      GROUP BY cl.entity_type
      ORDER BY total_amount DESC
    `).all() as Array<{ entity_type: string; total_amount: number; count: number }>;

    const maxAmount = entityExposure.reduce((m, r) => Math.max(m, r.total_amount), 0);

    const sectorDistribution = db.prepare(`
      SELECT p.sector,
             COALESCE(SUM(p.financed_amount), 0) as total_financed,
             COUNT(*) as count
      FROM projects p
      WHERE p.contract_id IS NOT NULL AND p.sector IS NOT NULL
      GROUP BY p.sector
      ORDER BY total_financed DESC
    `).all() as Array<{ sector: string; total_financed: number; count: number }>;

    const allFinanced = sectorDistribution.reduce((s, r) => s + r.total_financed, 0);

    sendSuccess(res, {
      entityExposure: entityExposure.map(r => ({
        ...r,
        pct: maxAmount > 0 ? Math.round((r.total_amount / maxAmount) * 100) : 0,
      })),
      sectorDistribution: sectorDistribution.map(r => ({
        ...r,
        pct: allFinanced > 0 ? Math.round((r.total_financed / allFinanced) * 100) : 0,
      })),
    });
  } catch (e) { next(e); }
});

// CONTRACTS
const contractsCtrl = new ContractsController();
router.get('/contracts', authorize('contratos', 'read'), contractsCtrl.list.bind(contractsCtrl));
router.get('/contracts/simulate', authorize('contratos', 'read'), contractsCtrl.simulate.bind(contractsCtrl));
router.get('/contracts/:id', authorize('contratos', 'read'), contractsCtrl.findById.bind(contractsCtrl));
router.post('/contracts', authorize('contratos', 'write'), auditLog('CREATE', 'contract'), contractsCtrl.create.bind(contractsCtrl));
router.put('/contracts/:id', authorize('contratos', 'write'), auditLog('UPDATE', 'contract'), contractsCtrl.update.bind(contractsCtrl));
router.patch('/contracts/:id/approve-disbursement', authorize('contratos', 'approve'), auditLog('APPROVE_DISBURSEMENT', 'contract'), contractsCtrl.approveDisbursement.bind(contractsCtrl));
router.get('/contracts/:id/schedule', authorize('contratos', 'read'), contractsCtrl.getSchedule.bind(contractsCtrl));
router.post('/contracts/:id/payments', authorize('contratos', 'write'), auditLog('PAYMENT', 'contract'), contractsCtrl.registerPayment.bind(contractsCtrl));

// CLIENTS
const clientsSvc = new ClientsService();
router.get('/clients', authorize('clientes', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entity_type, search, page, limit } = stringQuery(req.query);
    const r = clientsSvc.list({ entity_type, search, page: Number(page ?? 1) || 1, limit: Number(limit ?? 20) || 20 });
    sendSuccess(res, r);
  } catch (e) { next(e); }
});
router.get('/clients/:id', authorize('clientes', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, clientsSvc.findById(routeParam(req.params.id))); } catch (e) { next(e); }
});
router.post('/clients', authorize('clientes', 'write'), auditLog('CREATE', 'client'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, clientsSvc.create(req.body, req.user!.sub), 201); } catch (e) { next(e); }
});
router.put('/clients/:id', authorize('clientes', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, clientsSvc.update(routeParam(req.params.id), req.body)); } catch (e) { next(e); }
});

// LIABILITIES
const liabSvc = new LiabilitiesService();
router.get('/liabilities', authorize('passivo', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, { kpis: liabSvc.getKpis(), data: liabSvc.list() }); } catch (e) { next(e); }
});
router.get('/liabilities/:id', authorize('passivo', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, liabSvc.findById(routeParam(req.params.id))); } catch (e) { next(e); }
});
router.post('/liabilities', authorize('passivo', 'write'), auditLog('CREATE', 'liability'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, liabSvc.create(req.body, req.user!.sub), 201); } catch (e) { next(e); }
});
router.patch('/liabilities/:id/action', authorize('passivo', 'write'), auditLog('UPDATE', 'liability'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, liabSvc.registerAction(routeParam(req.params.id), req.body)); } catch (e) { next(e); }
});

// GUARANTEES
const guarSvc = new GuaranteesService();
router.get('/guarantees', authorize('garantias', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, { kpis: guarSvc.getKpis(), data: guarSvc.list(stringQuery(req.query)) });
  } catch (e) { next(e); }
});
router.get('/guarantees/:id', authorize('garantias', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, guarSvc.findById(routeParam(req.params.id))); } catch (e) { next(e); }
});
router.post('/guarantees', authorize('garantias', 'write'), auditLog('CREATE', 'guarantee'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, guarSvc.create(req.body, req.user!.sub), 201); } catch (e) { next(e); }
});
router.put('/guarantees/:id', authorize('garantias', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, guarSvc.update(routeParam(req.params.id), req.body)); } catch (e) { next(e); }
});

// RISK
const riskSvc = new RiskService();
router.get('/risk', authorize('risco', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, {
      kpis: riskSvc.getKpis(), matrix: riskSvc.getMatrix(),
      watchList: riskSvc.getWatchList(), ratingByType: riskSvc.getRatingByEntityType(),
      scoringIndicators: riskSvc.getScoringIndicators(),
    });
  } catch (e) { next(e); }
});
router.post('/risk/assessments', authorize('risco', 'write'), auditLog('CREATE', 'risk_assessment'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, riskSvc.createAssessment(req.body, req.user!.sub), 201); } catch (e) { next(e); }
});

// SECURITIES
const secSvc = new SecuritiesService();
router.get('/securities', authorize('titulos', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, { kpis: secSvc.getKpis(), data: secSvc.list(stringQuery(req.query)), policy: secSvc.getPolicy() });
  } catch (e) { next(e); }
});
router.get('/securities/:id', authorize('titulos', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, secSvc.findById(routeParam(req.params.id))); } catch (e) { next(e); }
});
router.post('/securities', authorize('titulos', 'write'), auditLog('CREATE', 'security'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, secSvc.create(req.body, req.user!.sub), 201); } catch (e) { next(e); }
});
router.patch('/securities/:id/status', authorize('titulos', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, secSvc.updateStatus(routeParam(req.params.id), req.body.status)); } catch (e) { next(e); }
});
router.put('/securities/policy', authorize('titulos', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, secSvc.updatePolicy(req.body)); } catch (e) { next(e); }
});

// ALERTS
const alertsSvc = new AlertsService();
router.get('/alerts', authorize('alertas', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, { kpis: alertsSvc.getKpis(), data: alertsSvc.list(stringQuery(req.query)) });
  } catch (e) { next(e); }
});
router.post('/alerts', authorize('alertas', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, alertsSvc.create(req.body), 201); } catch (e) { next(e); }
});
router.patch('/alerts/:id/resolve', authorize('alertas', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, alertsSvc.resolve(routeParam(req.params.id), req.user!.sub)); } catch (e) { next(e); }
});

// FUNDING SOURCES
const fundingSvc = new FundingService();
router.get('/funding', authorize('fontes', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, { kpis: fundingSvc.getKpis(), data: fundingSvc.list() }); } catch (e) { next(e); }
});
router.post('/funding', authorize('fontes', 'write'), auditLog('CREATE', 'funding'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, fundingSvc.create(req.body), 201); } catch (e) { next(e); }
});

// MANAGEMENT CAPITAL (CAPITAL DE GESTÃO)
const mcSvc = new ManagementCapitalService();
router.get('/management-capital', authorize('passivo', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, { kpis: mcSvc.getKpis(), data: mcSvc.list() }); } catch (e) { next(e); }
});
router.post('/management-capital', authorize('passivo', 'write'), auditLog('CREATE', 'management_capital'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, mcSvc.create(req.body, req.user!.sub), 201); } catch (e) { next(e); }
});

// PROJECTS
const projSvc = new ProjectsService();
router.get('/projects', authorize('projetos', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, { kpis: projSvc.getKpis(), data: projSvc.list(stringQuery(req.query)) });
  } catch (e) { next(e); }
});
router.get('/projects/analytics', authorize('projetos', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, projSvc.getAnalytics()); } catch (e) { next(e); }
});
router.get('/projects/:id', authorize('projetos', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, projSvc.findById(routeParam(req.params.id))); } catch (e) { next(e); }
});
router.post('/projects', authorize('projetos', 'write'), auditLog('CREATE', 'project'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, projSvc.create(req.body, req.user!.sub), 201); } catch (e) { next(e); }
});
router.put('/projects/:id', authorize('projetos', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, projSvc.update(routeParam(req.params.id), req.body)); } catch (e) { next(e); }
});

// RATES
router.get('/rates', authorize('taxas', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    sendSuccess(res, {
      rateTables: db.prepare('SELECT * FROM rate_tables ORDER BY min_rate').all(),
      commissions: db.prepare('SELECT * FROM commission_types').all(),
    });
  } catch (e) { next(e); }
});
router.post('/rates', authorize('taxas', 'write'), auditLog('CREATE', 'rate_table'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { entity_type, min_rate, base_rate, max_rate, management_commission, opening_commission } = req.body;
    if (!entity_type) throw new Error('Tipo de mutuário obrigatório');
    const exists = db.prepare('SELECT id FROM rate_tables WHERE entity_type = ?').get(entity_type);
    if (exists) throw new Error('Já existe uma tabela para este tipo de mutuário');
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    db.prepare(`
      INSERT INTO rate_tables (id, entity_type, min_rate, base_rate, max_rate, management_commission, opening_commission, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, entity_type, min_rate || 0, base_rate || 0, max_rate || 0, management_commission || 0, opening_commission || 0, new Date().toISOString(), req.user!.sub);
    const created = db.prepare('SELECT * FROM rate_tables WHERE id = ?').get(id);
    sendSuccess(res, created, 201, 'Tabela de taxas criada');
  } catch (e) { next(e); }
});
router.put('/rates/:id', authorize('taxas', 'write'), auditLog('UPDATE', 'rate_table'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { min_rate, base_rate, max_rate, management_commission, opening_commission } = req.body;
    db.prepare(`
      UPDATE rate_tables SET min_rate = ?, base_rate = ?, max_rate = ?, management_commission = ?, opening_commission = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `).run(min_rate, base_rate, max_rate, management_commission, opening_commission, new Date().toISOString(), req.user!.sub, routeParam(req.params.id));
    const updated = db.prepare('SELECT * FROM rate_tables WHERE id = ?').get(routeParam(req.params.id));
    sendSuccess(res, updated, 200, 'Taxa actualizada');
  } catch (e) { next(e); }
});
router.delete('/rates/:id', authorize('taxas', 'write'), auditLog('DELETE', 'rate_table'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM rate_tables WHERE id = ?').run(routeParam(req.params.id));
    sendSuccess(res, null, 200, 'Tabela de taxas eliminada');
  } catch (e) { next(e); }
});

// COMMISSIONS (Política Interna de Comissões)
router.put('/commissions/:id', authorize('taxas', 'write'), auditLog('UPDATE', 'commission'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { name, calculation_base, rate_min, rate_max, periodicity, is_capitalizable, can_reinvest, description } = req.body;
    db.prepare(`
      UPDATE commission_types
      SET name=?, calculation_base=?, rate_min=?, rate_max=?, periodicity=?, is_capitalizable=?, can_reinvest=?, description=?
      WHERE id=?
    `).run(name, calculation_base, rate_min, rate_max, periodicity, is_capitalizable ? 1 : 0, can_reinvest ? 1 : 0, description, routeParam(req.params.id));
    sendSuccess(res, db.prepare('SELECT * FROM commission_types WHERE id=?').get(routeParam(req.params.id)), 200, 'Comissão actualizada');
  } catch (e) { next(e); }
});
router.post('/commissions', authorize('taxas', 'write'), auditLog('CREATE', 'commission'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { v4: uuidv4 } = require('uuid');
    const { name, calculation_base, rate_min, rate_max, periodicity, is_capitalizable, can_reinvest, description } = req.body;
    if (!name || !calculation_base || !periodicity) throw new Error('Nome, base de cálculo e periodicidade são obrigatórios');
    const id = uuidv4();
    db.prepare(`
      INSERT INTO commission_types (id, name, calculation_base, rate_min, rate_max, periodicity, is_capitalizable, can_reinvest, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, calculation_base, rate_min ?? 0, rate_max ?? 0, periodicity, is_capitalizable ? 1 : 0, can_reinvest ? 1 : 0, description ?? '');
    sendSuccess(res, db.prepare('SELECT * FROM commission_types WHERE id=?').get(id), 201, 'Comissão criada');
  } catch (e) { next(e); }
});
router.delete('/commissions/:id', authorize('taxas', 'write'), auditLog('DELETE', 'commission'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM commission_types WHERE id=?').run(routeParam(req.params.id));
    sendSuccess(res, null, 200, 'Comissão eliminada');
  } catch (e) { next(e); }
});

// BI ANALYTICS
router.get('/bi', authorize('bi', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();

    const recovery = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN status='pago' THEN total_installment END),0) as paid,
             COALESCE(SUM(total_installment),0) as total
      FROM amortization_schedules WHERE status IN ('pago','vencido','pendente')
    `).get() as { paid: number; total: number };
    const taxaRecuperacao = recovery.total > 0 ? Math.round(recovery.paid / recovery.total * 1000) / 10 : null;

    const creditoTotal = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM contracts WHERE status='recebidos' AND deleted_at IS NULL`).get() as { v: number };
    const creditoVencido = db.prepare(`SELECT COALESCE(SUM(total_installment - COALESCE(paid_amount,0)),0) as v FROM amortization_schedules WHERE status='vencido'`).get() as { v: number };
    const nplRatio = creditoTotal.v > 0 ? Math.round(creditoVencido.v / creditoTotal.v * 1000) / 10 : null;

    const garantiasTotal = db.prepare(`SELECT COALESCE(SUM(value),0) as v FROM guarantees WHERE status='activa' AND deleted_at IS NULL`).get() as { v: number };
    const coberturaGarantias = creditoTotal.v > 0 ? Math.round(garantiasTotal.v / creditoTotal.v * 1000) / 10 : null;

    const avgContractRate = db.prepare(`SELECT COALESCE(AVG(interest_rate),0) as v FROM contracts WHERE status='recebidos' AND deleted_at IS NULL`).get() as { v: number };
    const avgFundingRate = db.prepare(`SELECT COALESCE(AVG(interest_rate),0) as v FROM funding_sources WHERE status='activa'`).get() as { v: number };
    const spread = avgContractRate.v > 0 || avgFundingRate.v > 0 ? Math.round((avgContractRate.v - avgFundingRate.v) * 10) / 10 : null;

    const otRecebimentos = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN payment_method IN ('ot','bt') THEN amount END),0) as ot,
             COALESCE(SUM(amount),0) as total
      FROM payments
    `).get() as { ot: number; total: number };
    const otPct = otRecebimentos.total > 0 ? Math.round(otRecebimentos.ot / otRecebimentos.total * 1000) / 10 : null;

    const top3 = db.prepare(`
      SELECT SUM(c.amount) as top3total
      FROM contracts c WHERE c.status='recebidos' AND c.deleted_at IS NULL
      AND c.client_id IN (
        SELECT client_id FROM contracts WHERE status='recebidos' AND deleted_at IS NULL
        GROUP BY client_id ORDER BY SUM(amount) DESC LIMIT 3
      )
    `).get() as { top3total: number };
    const concentracao = creditoTotal.v > 0 && top3.top3total ? Math.round(top3.top3total / creditoTotal.v * 1000) / 10 : null;

    function rating(value: number | null, target: number, higherIsBetter: boolean): string {
      if (value === null) return '—';
      const ok = higherIsBetter ? value >= target : value <= target;
      if (ok) return 'Óptimo';
      const dist = Math.abs(value - target) / target;
      return dist < 0.15 ? 'Normal' : dist < 0.3 ? 'Atenção' : 'Crítico';
    }

    const kpis = [
      { kpi: 'Taxa de Recuperação', value: taxaRecuperacao, target: 90.0, unit: '%', delta: taxaRecuperacao != null ? Math.round((taxaRecuperacao - 90) * 10)/10 : null, rating: rating(taxaRecuperacao, 90, true) },
      { kpi: 'Índice Cobertura Garantias', value: coberturaGarantias, target: 110.0, unit: '%', delta: coberturaGarantias != null ? Math.round((coberturaGarantias - 110) * 10)/10 : null, rating: rating(coberturaGarantias, 110, true) },
      { kpi: 'NPL Ratio', value: nplRatio, target: 6.0, unit: '%', delta: nplRatio != null ? Math.round((nplRatio - 6) * 10)/10 : null, rating: rating(nplRatio, 6, false) },
      { kpi: 'Spread Médio (Activo − Passivo)', value: spread, target: 1.5, unit: 'pp', delta: spread != null ? Math.round((spread - 1.5) * 10)/10 : null, rating: rating(spread, 1.5, true) },
      { kpi: 'OT como % dos Recebimentos', value: otPct, target: 25.0, unit: '%', delta: otPct != null ? Math.round((25 - otPct) * 10)/10 : null, rating: rating(otPct, 25, false) },
      { kpi: 'Concentração Top-3 Mutuários', value: concentracao, target: 35.0, unit: '%', delta: concentracao != null ? Math.round((concentracao - 35) * 10)/10 : null, rating: rating(concentracao, 35, false) },
    ];

    const sectorExposure = db.prepare(`
      SELECT p.sector, COALESCE(SUM(c.amount), 0) as total
      FROM projects p JOIN contracts c ON c.id = p.contract_id
      WHERE c.deleted_at IS NULL GROUP BY p.sector ORDER BY total DESC
    `).all();

    const monthlyPayments = db.prepare(`
      SELECT strftime('%m', paid_at) as m, COALESCE(SUM(amount),0) as received
      FROM payments WHERE strftime('%Y', paid_at) = '2026' GROUP BY m ORDER BY m
    `).all() as Array<{ m: string; received: number }>;

    const monthlyScheduled = db.prepare(`
      SELECT strftime('%m', due_date) as m, COALESCE(SUM(total_installment),0) as scheduled
      FROM amortization_schedules WHERE strftime('%Y', due_date) = '2026' GROUP BY m ORDER BY m
    `).all() as Array<{ m: string; scheduled: number }>;

    // NPL mensal 2026 (prestações vencidas por mês como proxy da evolução NPL)
    const nplMonthly = db.prepare(`
      SELECT strftime('%m', due_date) as m,
             COALESCE(SUM(total_installment),0) as vencido
      FROM amortization_schedules
      WHERE status = 'vencido' AND strftime('%Y', due_date) = '2026'
      GROUP BY m ORDER BY m
    `).all() as Array<{ m: string; vencido: number }>;

    const nplEvolution = ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => {
      const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const found = nplMonthly.find(r => r.m === m);
      return { month: labels[i], vencido: found ? Math.round(found.vencido / 1e6) : 0 };
    });

    // Cash flow: cobranças (entradas) vs reembolsos do passivo (saídas) por mês 2026
    const liabOut = db.prepare(`
      SELECT strftime('%m', due_date) as m,
             COALESCE(SUM(total_installment),0) as saida
      FROM liability_schedules
      WHERE strftime('%Y', due_date) = '2026'
      GROUP BY m ORDER BY m
    `).all() as Array<{ m: string; saida: number }>;

    const cashFlow = ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => {
      const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const inFound = (monthlyPayments as Array<{m:string;received:number}>).find(r => r.m === m);
      const outFound = liabOut.find(r => r.m === m);
      return {
        month: labels[i],
        entrada: inFound ? Math.round(inFound.received / 1e6) : 0,
        saida: outFound ? Math.round(outFound.saida / 1e6) : 0,
      };
    });

    sendSuccess(res, { kpis, sectorExposure, monthlyPayments, monthlyScheduled, nplEvolution, cashFlow });
  } catch (e) { next(e); }
});

// COBRANÇA
router.get('/collections', authorize('cobranca', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const calendar = db.prepare(`
      SELECT a.*, c.reference, c.client_id,
        cl.name as client_name, cl.phone as client_phone, cl.email as client_email
      FROM amortization_schedules a
      JOIN contracts c ON c.id = a.contract_id
      JOIN clients cl ON cl.id = c.client_id
      WHERE a.due_date >= date('now', '-7 days') AND a.due_date <= date('now', '+60 days')
      AND a.status IN ('pendente','vencido','pago')
      ORDER BY a.due_date ASC LIMIT 50
    `).all();

    const recuperadoMes = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as v FROM payments
      WHERE strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')
    `).get() as { v: number }).v;

    const emLitigio = (db.prepare(`
      SELECT COUNT(*) as v FROM contracts c
      JOIN risk_assessments ra ON ra.contract_id = c.id
      WHERE c.status = 'recebidos' AND c.deleted_at IS NULL AND ra.risk_level = 'critico'
    `).get() as { v: number }).v;

    const monthlyRecovery = db.prepare(`
      SELECT strftime('%m', paid_at) as month,
             COALESCE(SUM(amount), 0) as value
      FROM payments
      WHERE strftime('%Y', paid_at) = '2026'
      GROUP BY month ORDER BY month
    `).all() as Array<{ month: string; value: number }>;

    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const recovery12 = months.map((m, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      const found = monthlyRecovery.find(r => r.month === monthNum);
      return { month: m, value: found ? Math.round(found.value / 1e6) : 0 };
    });

    sendSuccess(res, { calendar, kpis: { recuperadoMes, emLitigio }, recovery12 });
  } catch (e) { next(e); }
});

// USERS (admin only)
router.get('/users', authorize('users', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const users = db.prepare('SELECT id, name, email, role, is_active, last_login_at, created_at FROM users WHERE deleted_at IS NULL').all();
    sendSuccess(res, users);
  } catch (e) { next(e); }
});

// AUDIT LOG
router.get('/audit', authorize('audit', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200').all();
    sendSuccess(res, logs);
  } catch (e) { next(e); }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
router.post('/notifications/whatsapp', authorize('contratos', 'write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, message, contractId, recipientName, channel } = req.body;
    if (!phone || !message) throw new Error('Telefone e mensagem são obrigatórios');
    const result = await notifSvc.sendWhatsApp({
      phone, message, contractId, recipientName,
      channel: channel || 'geral',
      createdBy: req.user!.sub,
    });
    if (!result.ok) res.status(502).json({ success: false, message: result.error });
    else sendSuccess(res, result, 200, 'WhatsApp enviado');
  } catch (e) { next(e); }
});

router.post('/notifications/email', authorize('contratos', 'write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, subject, title, body, ctaLabel, ctaUrl, contractId, recipientName, channel } = req.body;
    if (!to || !subject || !body) throw new Error('Destinatário, assunto e mensagem são obrigatórios');
    const result = await notifSvc.sendEmail({
      to, subject, title: title || subject, body, ctaLabel, ctaUrl, contractId, recipientName,
      channel: channel || 'geral',
      createdBy: req.user!.sub,
    });
    if (!result.ok) res.status(502).json({ success: false, message: result.error });
    else sendSuccess(res, result, 200, 'Email enviado');
  } catch (e) { next(e); }
});

router.get('/notifications/logs', authorize('contratos', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contract_id } = stringQuery(req.query);
    sendSuccess(res, notifSvc.getLogs(contract_id));
  } catch (e) { next(e); }
});

// ── DIGITAL SIGNATURES ────────────────────────────────────────────────────────
// Pedido de assinatura (requer auth)
router.post('/signatures/request', authorize('contratos', 'write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contractId, signerName, signerPhone, signerEmail, signerRole, documentTitle, documentSummary, documentType, sendVia } = req.body;
    if (!contractId || !signerName || !documentTitle) throw new Error('Contrato, nome do signatário e título do documento são obrigatórios');
    if (!signerPhone && !signerEmail) throw new Error('Forneça pelo menos telefone ou email do signatário');
    const result = await sigSvc.requestSignature({
      contractId, signerName, signerPhone, signerEmail,
      signerRole: signerRole || 'mutuario',
      documentTitle, documentSummary, documentType,
      sendVia: sendVia || 'ambos',
      createdBy: req.user!.sub,
    });
    sendSuccess(res, result, 201, 'Pedido de assinatura enviado');
  } catch (e) { next(e); }
});

// Lista assinaturas de um contrato (requer auth)
router.get('/signatures/contract/:contractId', authorize('contratos', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, sigSvc.listByContract(routeParam(req.params.contractId)));
  } catch (e) { next(e); }
});

// Estado da assinatura mais recente por contrato (para a tabela de formalização)
router.get('/signatures/latest-by-contracts', authorize('contratos', 'read'), (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, sigSvc.latestByContracts());
  } catch (e) { next(e); }
});

// ── TEMPLATES ────────────────────────────────────────────────────────────────
router.get('/templates', authorize('alertas', 'read'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, channel } = stringQuery(req.query);
    sendSuccess(res, { templates: tmplSvc.list(category, channel), variables: TEMPLATE_VARIABLES });
  } catch (e) { next(e); }
});

router.post('/templates', authorize('alertas', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, category, channel, subject, body } = req.body;
    if (!name || !category || !channel || !body) throw new Error('name, category, channel e body são obrigatórios');
    sendSuccess(res, tmplSvc.create({ name, category, channel, subject, body }, req.user!.sub), 201);
  } catch (e) { next(e); }
});

router.put('/templates/:id', authorize('alertas', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, tmplSvc.update(routeParam(req.params.id), req.body));
  } catch (e) { next(e); }
});

router.delete('/templates/:id', authorize('alertas', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try {
    tmplSvc.delete(routeParam(req.params.id));
    sendSuccess(res, null, 200, 'Template eliminado');
  } catch (e) { next(e); }
});

// ── AUTOMATION RULES ──────────────────────────────────────────────────────────
router.get('/automation/rules', authorize('alertas', 'read'), (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, tmplSvc.listRules()); } catch (e) { next(e); }
});

router.patch('/automation/rules/:id', authorize('alertas', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try {
    tmplSvc.updateRule(routeParam(req.params.id), req.body);
    sendSuccess(res, null, 200, 'Regra actualizada');
  } catch (e) { next(e); }
});

// ── AUTOMATION CC ─────────────────────────────────────────────────────────────
router.get('/automation/cc', authorize('alertas', 'read'), (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, tmplSvc.listCC()); } catch (e) { next(e); }
});

router.post('/automation/cc', authorize('alertas', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email || !role) throw new Error('name, email e role são obrigatórios');
    sendSuccess(res, tmplSvc.createCC({ name, email, role }), 201);
  } catch (e) { next(e); }
});

router.patch('/automation/cc/:id', authorize('alertas', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try {
    tmplSvc.updateCC(routeParam(req.params.id), req.body);
    sendSuccess(res, null, 200, 'CC actualizado');
  } catch (e) { next(e); }
});

router.delete('/automation/cc/:id', authorize('alertas', 'write'), (req: Request, res: Response, next: NextFunction) => {
  try {
    tmplSvc.deleteCC(routeParam(req.params.id));
    sendSuccess(res, null, 200, 'CC removido');
  } catch (e) { next(e); }
});

// ── AUTOMATION RUN & STATUS ───────────────────────────────────────────────────
router.post('/automation/run', authorize('alertas', 'write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await autoSvc.runDaily();
    eventsBus.broadcast('automation.ran', stats);
    sendSuccess(res, stats, 200, `Automação concluída: ${stats.sent} enviados`);
  } catch (e) { next(e); }
});

router.get('/automation/last-sent', authorize('alertas', 'read'), (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, autoSvc.lastSentPerRule()); } catch (e) { next(e); }
});

router.get('/automation/clients-without-contacts', authorize('alertas', 'read'), (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, autoSvc.clientsWithoutContacts()); } catch (e) { next(e); }
});

export default router;
