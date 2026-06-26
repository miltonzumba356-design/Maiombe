import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { NotificationService } from './notification.service';
import { eventsBus } from './events.service';

const notif = new NotificationService();

const EXPIRY_DAYS = 7;

function signingLink(token: string) {
  return `${process.env.APP_URL || 'http://localhost:5173'}/assinar/${token}`;
}

function buildWhatsAppMsg(signerName: string, docTitle: string, link: string, summary?: string) {
  return `Olá *${signerName}*,\n\nRecebeu um documento para assinar através do sistema MAIOMBE:\n\n📄 *${docTitle}*\n${summary ? `\n_${summary}_\n` : ''}\nClique no link para visualizar e assinar:\n${link}\n\n⏳ _Link válido por ${EXPIRY_DAYS} dias._\n\n_MAIOMBE — Sistema de Gestão de Crédito_`;
}

function buildEmailBody(signerName: string, docTitle: string, summary?: string) {
  return `Olá ${signerName},\n\nFoi solicitada a sua assinatura digital no seguinte documento:\n\n"${docTitle}"${summary ? `\n\n${summary}` : ''}\n\nClique no botão abaixo para visualizar o documento completo e confirmar a sua assinatura electrónica.\n\nSe não reconhece este pedido, por favor ignore este email.`;
}

export class SignatureService {
  /** Cria um pedido de assinatura e envia o link via WhatsApp e/ou email */
  async requestSignature(data: {
    contractId: string;
    signerName: string;
    signerPhone?: string;
    signerEmail?: string;
    signerRole: string;
    documentTitle: string;
    documentSummary?: string;
    documentType?: string;
    sendVia: 'whatsapp' | 'email' | 'ambos';
    createdBy: string;
  }) {
    const db = getDatabase();
    const id    = uuidv4();
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86400000).toISOString();

    db.prepare(`
      INSERT INTO digital_signatures
        (id, token, contract_id, document_type, signer_name, signer_phone, signer_email,
         signer_role, document_title, document_summary, expires_at, sent_via, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, token, data.contractId,
      data.documentType || 'contrato',
      data.signerName, data.signerPhone || null, data.signerEmail || null,
      data.signerRole, data.documentTitle, data.documentSummary || null,
      expiresAt, data.sendVia, data.createdBy,
    );

    const link = signingLink(token);
    const results: string[] = [];

    // ── WhatsApp ────────────────────────────────────────────────────────────
    if ((data.sendVia === 'whatsapp' || data.sendVia === 'ambos') && data.signerPhone) {
      const r = await notif.sendWhatsApp({
        phone: data.signerPhone,
        message: buildWhatsAppMsg(data.signerName, data.documentTitle, link, data.documentSummary),
        contractId: data.contractId,
        channel: 'assinatura',
        recipientName: data.signerName,
        createdBy: data.createdBy,
      });
      results.push(r.ok ? 'WhatsApp enviado' : `WhatsApp falhou: ${r.error}`);
    }

    // ── Email ───────────────────────────────────────────────────────────────
    if ((data.sendVia === 'email' || data.sendVia === 'ambos') && data.signerEmail) {
      const r = await notif.sendEmail({
        to: data.signerEmail,
        subject: `Documento para assinar: ${data.documentTitle}`,
        title: 'Pedido de Assinatura Digital',
        body: buildEmailBody(data.signerName, data.documentTitle, data.documentSummary),
        ctaLabel: 'Visualizar e Assinar',
        ctaUrl: link,
        contractId: data.contractId,
        channel: 'assinatura',
        recipientName: data.signerName,
        createdBy: data.createdBy,
      });
      results.push(r.ok ? 'Email enviado' : `Email falhou: ${r.error}`);
    }

    return {
      id, token, link, expiresAt,
      sent: results,
    };
  }

  /** Obtém os dados de uma assinatura pelo token (endpoint público) */
  getByToken(token: string) {
    const db = getDatabase();
    const sig = db.prepare('SELECT * FROM digital_signatures WHERE token = ?').get(token) as any;
    if (!sig) return null;

    const contract = sig.contract_id
      ? db.prepare(`
          SELECT c.reference, c.amount, c.interest_rate, c.celebration_date, c.term_months, cl.name as client_name
          FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id
          WHERE c.id = ?
        `).get(sig.contract_id) as any
      : null;

    return {
      id: sig.id,
      documentTitle: sig.document_title,
      documentSummary: sig.document_summary,
      documentType: sig.document_type,
      signerName: sig.signer_name,
      signerRole: sig.signer_role,
      status: sig.status,
      expiresAt: sig.expires_at,
      signedAt: sig.signed_at,
      contract: contract ? {
        reference: contract.reference,
        amount: contract.amount,
        interestRate: contract.interest_rate,
        startDate: contract.celebration_date,
        termMonths: contract.term_months,
        clientName: contract.client_name,
      } : null,
    };
  }

  /** Confirma assinatura (endpoint público — sem auth) */
  async sign(token: string, ipAddress: string, userAgent: string) {
    const db = getDatabase();
    const sig = db.prepare('SELECT * FROM digital_signatures WHERE token = ?').get(token) as any;

    if (!sig) throw new Error('Link inválido ou inexistente.');
    if (sig.status === 'assinado') throw new Error('Este documento já foi assinado.');
    if (sig.status === 'recusado') throw new Error('Este pedido foi recusado.');
    if (new Date(sig.expires_at) < new Date()) {
      db.prepare('UPDATE digital_signatures SET status=? WHERE token=?').run('expirado', token);
      throw new Error('Este link expirou. Solicite um novo pedido de assinatura.');
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE digital_signatures
      SET status='assinado', signed_at=?, ip_address=?, user_agent=?
      WHERE token=?
    `).run(now, ipAddress, userAgent, token);

    // Notificar admin: email do utilizador que criou o pedido + lista CC
    try {
      const creator = sig.created_by
        ? db.prepare('SELECT email, name FROM users WHERE id = ?').get(sig.created_by) as any
        : null;
      const ccList = (db.prepare('SELECT email FROM automation_cc WHERE is_active = 1').all() as any[]).map(r => r.email);
      const contract = sig.contract_id
        ? db.prepare('SELECT reference FROM contracts WHERE id = ?').get(sig.contract_id) as any
        : null;

      const toList: string[] = [];
      if (creator?.email) toList.push(creator.email);
      ccList.forEach((e: string) => { if (!toList.includes(e)) toList.push(e); });

      if (toList.length > 0) {
        const body = `O documento "${sig.document_title}" foi assinado electronicamente por ${sig.signer_name} (${sig.signer_role}) em ${new Date(now).toLocaleString('pt-PT')}.\n\nContrato: ${contract?.reference || '—'}\nIP: ${ipAddress}`;
        for (const to of toList) {
          await notif.sendEmail({
            to,
            subject: `Documento Assinado — ${sig.document_title}`,
            title: 'Assinatura Digital Confirmada',
            body,
            contractId: sig.contract_id,
            channel: 'assinatura',
            recipientName: creator?.name || 'Administrador',
            createdBy: sig.created_by,
          });
        }
      }
    } catch (_) {
      // falha de notificação não deve bloquear a confirmação
    }

    // Emitir evento em tempo real para todos os admins ligados
    eventsBus.broadcast('signature.signed', {
      signerName: sig.signer_name,
      documentTitle: sig.document_title,
      contractId: sig.contract_id,
    });

    return this.getByToken(token);
  }

  /** Recusa assinatura (endpoint público) */
  refuse(token: string) {
    const db = getDatabase();
    const sig = db.prepare('SELECT * FROM digital_signatures WHERE token = ?').get(token) as any;
    if (!sig) throw new Error('Link inválido.');
    if (sig.status !== 'pendente') throw new Error('Este pedido já foi processado.');
    db.prepare('UPDATE digital_signatures SET status=? WHERE token=?').run('recusado', token);

    eventsBus.broadcast('signature.refused', {
      signerName: sig.signer_name,
      documentTitle: sig.document_title,
      contractId: sig.contract_id,
    });

    return { ok: true };
  }

  /** Lista assinaturas de um contrato */
  listByContract(contractId: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM digital_signatures WHERE contract_id=? ORDER BY created_at DESC').all(contractId);
  }

  /** Estado mais recente de assinatura por contrato (usado na tabela de formalização) */
  latestByContracts() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT ds.contract_id, ds.status, ds.signer_name, ds.signed_at, ds.expires_at, ds.created_at
      FROM digital_signatures ds
      INNER JOIN (
        SELECT contract_id, MAX(created_at) as latest
        FROM digital_signatures
        GROUP BY contract_id
      ) latest ON ds.contract_id = latest.contract_id AND ds.created_at = latest.latest
    `).all() as any[];

    const map: Record<string, { status: string; signerName: string; signedAt: string | null; expiresAt: string; createdAt: string }> = {};
    for (const r of rows) {
      map[r.contract_id] = {
        status: r.status,
        signerName: r.signer_name,
        signedAt: r.signed_at,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
      };
    }
    return map;
  }
}
