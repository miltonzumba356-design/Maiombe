import { Request, Response, NextFunction } from 'express';
import { ContractsService } from '../services/contracts.service';
import { sendSuccess, sendPaginated } from '../utils/response';

const service = new ContractsService();

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

export class ContractsController {
  list(req: Request, res: Response, next: NextFunction): void {
    try {
      const query = req.query as unknown as Record<string, string | string[] | undefined>;
      const status = firstParam(query.status);
      const client_id = firstParam(query.client_id);
      const search = firstParam(query.search);
      const page = firstParam(query.page) || '1';
      const limit = firstParam(query.limit) || '20';
      const result = service.list({ status, client_id, search, page: +page, limit: +limit });
      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  }

  findById(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = service.findById(firstParam(req.params.id));
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }

  create(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = service.create(req.body, req.user!.sub);
      sendSuccess(res, result, 201, 'Contrato criado com sucesso');
    } catch (err) { next(err); }
  }

  update(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = service.update(firstParam(req.params.id), req.body, req.user!.sub);
      sendSuccess(res, result, 200, 'Contrato actualizado');
    } catch (err) { next(err); }
  }

  approveDisbursement(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = service.approveDisbursement(firstParam(req.params.id), req.user!.sub, req.body?.disbursement_date);
      sendSuccess(res, result, 200, 'Contrato aprovado e transferido para recebidos');
    } catch (err) { next(err); }
  }

  getSchedule(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = service.getSchedule(firstParam(req.params.id));
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }

  registerPayment(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = service.registerPayment(firstParam(req.params.id), req.body, req.user!.sub);
      sendSuccess(res, result, 201, 'Pagamento registado');
    } catch (err) { next(err); }
  }

  simulate(req: Request, res: Response, next: NextFunction): void {
    try {
      const query = req.query as unknown as Record<string, string | string[] | undefined>;
      const amount = firstParam(query.amount);
      const rate = firstParam(query.rate);
      const termMonths = firstParam(query.termMonths);
      const frequency = firstParam(query.frequency);
      const gracePeriodMonths = firstParam(query.gracePeriodMonths);
      const result = service.simulateAmortization(+amount, +rate, +termMonths, frequency, +(gracePeriodMonths || 0));
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }
}
