import nodemailer from 'nodemailer';
import axios from 'axios';
import { getDatabase } from '../database/connection';
import { createLogger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { eventsBus } from './events.service';

const logger = createLogger({ silent: true });

// ── Formata telefone para Z-API (remove não-dígitos, garante código país) ───
function formatPhone(phone: string): string {
  let n = phone.replace(/\D/g, '');
  if (n.startsWith('0')) n = '244' + n.slice(1);
  if (!n.startsWith('244') && n.length === 9) n = '244' + n;
  return n;
}

// ── Template HTML de email ───────────────────────────────────────────────────
function buildEmailHtml(title: string, body: string, ctaLabel?: string, ctaUrl?: string) {
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1A7A3C;padding:24px 28px">
      <div style="color:#FFC72C;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase">MAIOMBE</div>
      <div style="color:#fff;font-size:11px;margin-top:2px;opacity:.8">Sistema de Gestão de Crédito</div>
    </div>
    <div style="padding:28px">
      <h2 style="margin:0 0 16px;color:#1A7A3C;font-size:18px">${title}</h2>
      <div style="color:#333;font-size:14px;line-height:1.7;white-space:pre-line">${body}</div>
      ${ctaUrl ? `
      <div style="margin:24px 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#26B870;color:#fff;text-decoration:none;padding:13px 28px;border-radius:6px;font-weight:bold;font-size:14px">${ctaLabel || 'Abrir'}</a>
      </div>
      <p style="font-size:11px;color:#999">Ou copie este link: <a href="${ctaUrl}" style="color:#26B870">${ctaUrl}</a></p>
      ` : ''}
    </div>
    <div style="background:#f9f9f9;padding:16px 28px;border-top:1px solid #eee;font-size:11px;color:#999">
      MAIOMBE — Este é um email automático. Não responda a este endereço.
    </div>
  </div>
</body>
</html>`;
}

// ── NotificationService ──────────────────────────────────────────────────────
export class NotificationService {
  private get zapiBase() {
    return `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`;
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  async sendWhatsApp(opts: {
    phone: string;
    message: string;
    contractId?: string;
    channel: 'cobranca' | 'assinatura' | 'alerta' | 'geral';
    recipientName?: string;
    createdBy?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const db = getDatabase();
    const id = uuidv4();
    const phone = formatPhone(opts.phone);

    try {
      if (!process.env.ZAPI_INSTANCE_ID || process.env.ZAPI_INSTANCE_ID === 'YOUR_INSTANCE_ID') {
        throw new Error('Z-API não configurado. Defina ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN no .env');
      }
      await axios.post(`${this.zapiBase}/send-text`, {
        phone,
        message: opts.message,
      }, {
        headers: {
          'Client-Token': process.env.ZAPI_CLIENT_TOKEN || '',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      db.prepare(`INSERT INTO notification_logs (id,type,channel,recipient_name,recipient_phone,message,status,contract_id,created_by)
        VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(id, 'whatsapp', opts.channel, opts.recipientName || null, phone, opts.message, 'sent', opts.contractId || null, opts.createdBy || null);

      if (opts.channel !== 'assinatura') {
        eventsBus.broadcast('notification.sent', { channel: opts.channel, recipientName: opts.recipientName, contractId: opts.contractId });
      }
      return { ok: true };
    } catch (err: any) {
      const error = err?.response?.data?.message || err?.message || 'Erro desconhecido';
      db.prepare(`INSERT INTO notification_logs (id,type,channel,recipient_name,recipient_phone,message,status,error,contract_id,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(id, 'whatsapp', opts.channel, opts.recipientName || null, phone, opts.message, 'failed', error, opts.contractId || null, opts.createdBy || null);
      return { ok: false, error };
    }
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  async sendEmail(opts: {
    to: string;
    subject: string;
    title: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
    contractId?: string;
    channel: 'cobranca' | 'assinatura' | 'alerta' | 'geral';
    recipientName?: string;
    createdBy?: string;
    ccList?: string[];
  }): Promise<{ ok: boolean; error?: string }> {
    const db = getDatabase();
    const id = uuidv4();

    try {
      if (!process.env.SMTP_USER || process.env.SMTP_USER === 'seuemail@gmail.com') {
        throw new Error('SMTP não configurado. Defina SMTP_USER e SMTP_PASS no .env');
      }
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
      });

      await transporter.sendMail({
        from: `"MAIOMBE — Sistema" <${process.env.SMTP_USER}>`,
        to: opts.to,
        cc: opts.ccList && opts.ccList.length ? opts.ccList.join(',') : undefined,
        subject: opts.subject,
        html: buildEmailHtml(opts.title, opts.body, opts.ctaLabel, opts.ctaUrl),
      });

      db.prepare(`INSERT INTO notification_logs (id,type,channel,recipient_name,recipient_email,subject,message,status,contract_id,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(id, 'email', opts.channel, opts.recipientName || null, opts.to, opts.subject, opts.body, 'sent', opts.contractId || null, opts.createdBy || null);

      if (opts.channel !== 'assinatura') {
        eventsBus.broadcast('notification.sent', { channel: opts.channel, recipientName: opts.recipientName, contractId: opts.contractId });
      }
      return { ok: true };
    } catch (err: any) {
      const error = err?.message || 'Erro desconhecido';
      db.prepare(`INSERT INTO notification_logs (id,type,channel,recipient_name,recipient_email,subject,message,status,error,contract_id,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(id, 'email', opts.channel, opts.recipientName || null, opts.to, opts.subject, opts.body, 'failed', error, opts.contractId || null, opts.createdBy || null);
      return { ok: false, error };
    }
  }

  // ── Listar logs ────────────────────────────────────────────────────────────
  getLogs(contractId?: string) {
    const db = getDatabase();
    if (contractId) {
      return db.prepare('SELECT * FROM notification_logs WHERE contract_id=? ORDER BY created_at DESC LIMIT 50').all(contractId);
    }
    return db.prepare('SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 100').all();
  }
}
