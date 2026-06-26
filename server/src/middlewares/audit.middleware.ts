import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';

export function auditLog(action: string, entityType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode < 400 && req.user) {
        try {
          const db = getDatabase();
          db.prepare(`
            INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, new_values, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            req.user.sub,
            req.user.name,
            action,
            entityType,
            (req.params.id as string) || null,
            JSON.stringify(req.body),
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || null
          );
        } catch {
          // audit failure must not break the response
        }
      }
      return originalJson(body);
    };
    next();
  };
}
