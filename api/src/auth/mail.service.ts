import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  private get from() {
    return `"Central Altitude" <${process.env.MAIL_USER || 'noreply@centralaltitude.com'}>`;
  }

  private async send(to: string, subject: string, html: string) {
    if (!process.env.MAIL_USER) {
      this.logger.warn(`[MAIL] ${subject} → ${to}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Erro ao enviar e-mail para ${to}: ${err.message}`);
    }
  }

  private base(body: string) {
    return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:0;border-radius:12px;overflow:hidden">
        <div style="background:#1a1a2e;padding:20px 28px;display:flex;align-items:center;gap:12px">
          <span style="color:#4ade80;font-size:22px;font-weight:900">Central Altitude</span>
          <span style="color:#94a3b8;font-size:13px">· Topografia</span>
        </div>
        <div style="background:#ffffff;padding:28px 32px">
          ${body}
        </div>
        <div style="background:#f1f5f9;padding:14px 28px;text-align:center;font-size:11px;color:#94a3b8">
          Central Altitude Topografia e Engenharia Ltda · Este é um e-mail automático, não responda.
        </div>
      </div>`;
  }

  // ── Password reset ──────────────────────────────────────────
  async sendPasswordReset(email: string, nome: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    await this.send(email, 'Redefinição de senha — Central Altitude', this.base(`
      <h2 style="color:#1a1a2e;margin-top:0">Redefinir senha</h2>
      <p>Olá, <strong>${nome}</strong>!</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo — o link expira em <strong>30 minutos</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
        Redefinir senha
      </a>
      <p style="color:#94a3b8;font-size:12px;margin-bottom:0">Se não foi você, ignore este e-mail.</p>
    `));
  }

  // ── Nova solicitação ────────────────────────────────────────
  async sendNovaSolicitacao(to: string, engNome: string, obraNome: string, dataFormatada: string) {
    await this.send(to, `Nova solicitação: ${obraNome}`, this.base(`
      <h2 style="color:#1a1a2e;margin-top:0">📋 Nova Solicitação Agendada</h2>
      <p>Olá, <strong>${engNome}</strong>!</p>
      <p>Você foi designado para uma nova solicitação de topografia:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600;border-radius:6px 0 0 6px;width:120px">Obra</td>
            <td style="padding:8px 12px;background:#f8fafc;border-radius:0 6px 6px 0">${obraNome}</td></tr>
        <tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600;border-radius:6px 0 0 6px;margin-top:4px">Data</td>
            <td style="padding:8px 12px;background:#f8fafc;border-radius:0 6px 6px 0">${dataFormatada}</td></tr>
      </table>
      <p style="color:#475569">Acesse o sistema para ver os detalhes completos da solicitação.</p>
    `));
  }

  // ── Mudança de status da solicitação ───────────────────────
  async sendStatusSolicitacao(to: string, engNome: string, obraNome: string, novoStatus: string) {
    const statusLabel: Record<string, { emoji: string; label: string; color: string }> = {
      AGENDADO:  { emoji: '📅', label: 'Agendado',  color: '#2563eb' },
      CONCLUIDO: { emoji: '✅', label: 'Concluído', color: '#16a34a' },
      CANCELADO: { emoji: '❌', label: 'Cancelado', color: '#dc2626' },
    };
    const st = statusLabel[novoStatus] || { emoji: '🔄', label: novoStatus, color: '#64748b' };
    await this.send(to, `Solicitação atualizada: ${obraNome}`, this.base(`
      <h2 style="color:#1a1a2e;margin-top:0">${st.emoji} Status Atualizado</h2>
      <p>Olá, <strong>${engNome}</strong>!</p>
      <p>O status da sua solicitação foi atualizado:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600;border-radius:6px 0 0 6px;width:120px">Obra</td>
            <td style="padding:8px 12px;background:#f8fafc;border-radius:0 6px 6px 0">${obraNome}</td></tr>
        <tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600;border-radius:6px 0 0 6px;margin-top:4px">Novo Status</td>
            <td style="padding:8px 12px;background:#f8fafc;border-radius:0 6px 6px 0">
              <span style="color:${st.color};font-weight:700">${st.emoji} ${st.label}</span>
            </td></tr>
      </table>
    `));
  }

  // ── RDO enviado para assinatura ─────────────────────────────
  async sendRdoAssinatura(to: string, engNome: string, obraNome: string, rdoNumero: string, frontendUrl?: string) {
    const url = (frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000') + '/topografia/rdo';
    await this.send(to, `RDO ${rdoNumero ? `Nº${rdoNumero}` : ''} aguardando assinatura — ${obraNome}`, this.base(`
      <h2 style="color:#1a1a2e;margin-top:0">⏳ RDO Aguardando Assinatura</h2>
      <p>Olá, <strong>${engNome}</strong>!</p>
      <p>Um RDO da obra <strong>${obraNome}</strong> foi enviado para sua assinatura:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600;border-radius:6px 0 0 6px;width:120px">Obra</td>
            <td style="padding:8px 12px;background:#f8fafc;border-radius:0 6px 6px 0">${obraNome}</td></tr>
        ${rdoNumero ? `<tr><td style="padding:8px 12px;background:#f1f5f9;font-weight:600;border-radius:6px 0 0 6px;margin-top:4px">Nº RDO</td>
            <td style="padding:8px 12px;background:#f8fafc;border-radius:0 6px 6px 0">${rdoNumero}</td></tr>` : ''}
      </table>
      <a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
        Acessar e Assinar RDO
      </a>
    `));
  }
}
