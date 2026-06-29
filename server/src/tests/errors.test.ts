import { describe, it, expect } from 'vitest';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errors';

// ─────────────────────────────────────────────────────────────────────────────
describe('AppError hierarchy', () => {

  it('AppError preserva statusCode e mensagem', () => {
    const err = new AppError('algo correu mal', 500);
    expect(err.message).toBe('algo correu mal');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
  });

  it('AppError é instância de Error', () => {
    expect(new AppError('x', 400)).toBeInstanceOf(Error);
  });

  it('UnauthorizedError usa status 401 e mensagem por defeito', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Não autorizado');
  });

  it('UnauthorizedError aceita mensagem personalizada', () => {
    const err = new UnauthorizedError('Credenciais inválidas');
    expect(err.message).toBe('Credenciais inválidas');
  });

  it('ForbiddenError usa status 403', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it('NotFoundError usa status 404', () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });

  it('ValidationError usa status 422', () => {
    const err = new ValidationError('Campo obrigatório');
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe('Campo obrigatório');
  });

  it('ConflictError usa status 409', () => {
    const err = new ConflictError('Recurso duplicado');
    expect(err.statusCode).toBe(409);
  });

  it('cada subclasse é instanceof AppError', () => {
    expect(new UnauthorizedError()).toBeInstanceOf(AppError);
    expect(new ForbiddenError()).toBeInstanceOf(AppError);
    expect(new NotFoundError()).toBeInstanceOf(AppError);
    expect(new ValidationError('x')).toBeInstanceOf(AppError);
    expect(new ConflictError('x')).toBeInstanceOf(AppError);
  });
});
