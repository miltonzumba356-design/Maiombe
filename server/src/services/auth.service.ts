import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { config } from '../config';
import { User, TokenPayload } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export class AuthService {
  async login(email: string, password: string, ip: string): Promise<{ accessToken: string; refreshToken: string; user: Partial<User> }> {
    const db = getDatabase();

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(email.toLowerCase()) as User | undefined;

    if (!user) {
      // Prevent timing attacks
      await argon2.hash('dummy_password');
      throw new UnauthorizedError('Credenciais inválidas');
    }

    if (!user.is_active) {
      throw new ForbiddenError('Conta desactivada. Contacte o administrador.');
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new ForbiddenError(`Conta temporariamente bloqueada. Tente novamente em ${remainingMin} minuto(s).`);
    }

    const valid = await argon2.verify(user.password_hash, password);

    if (!valid) {
      const newAttempts = user.failed_login_attempts + 1;
      let lockedUntil: string | null = null;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockDate = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
        lockedUntil = lockDate.toISOString();
        logger.warn(`Account locked: ${email} after ${newAttempts} failed attempts from ${ip}`);
      }

      db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?')
        .run(newAttempts, lockedUntil, user.id);

      throw new UnauthorizedError('Credenciais inválidas');
    }

    // Reset on success
    db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?')
      .run(new Date().toISOString(), user.id);

    const payload: TokenPayload = { sub: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), user.id, refreshHash, refreshExpires);

    logger.info(`User logged in: ${email} from ${ip}`);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const db = getDatabase();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const stored = db.prepare(`
      SELECT rt.*, u.id as uid, u.name, u.email, u.role, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = ? AND rt.revoked_at IS NULL AND rt.expires_at > datetime('now')
    `).get(tokenHash) as (User & { uid: string; token_hash: string; expires_at: string; revoked_at: string | null }) | undefined;

    if (!stored) {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    if (!stored.is_active) {
      throw new ForbiddenError('Conta desactivada');
    }

    const payload: TokenPayload = { sub: stored.uid, email: stored.email, role: stored.role, name: stored.name };
    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const db = getDatabase();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?')
      .run(new Date().toISOString(), tokenHash);
  }

  async logoutAll(userId: string): Promise<void> {
    const db = getDatabase();
    db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
      .run(new Date().toISOString(), userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
    if (!user) throw new UnauthorizedError();

    const valid = await argon2.verify(user.password_hash, currentPassword);
    if (!valid) throw new UnauthorizedError('Palavra-passe actual incorrecta');

    const newHash = await argon2.hash(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(newHash, new Date().toISOString(), userId);

    await this.logoutAll(userId);
  }
}
