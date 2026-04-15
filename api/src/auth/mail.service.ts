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

  async sendPasswordReset(email: string, nome: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (!process.env.MAIL_USER) {
      this.logger.warn(`[RESET TOKEN] ${email} → ${resetUrl}`);
      return;
    }

    await this.transporter.sendMail({
      from: `"Central Altitude" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Redefinição de senha — Central Altitude',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#2E7D32">Central Altitude</h2>
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha. O link expira em <strong>30 minutos</strong>.</p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#2E7D32;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
            Redefinir senha
          </a>
          <p style="color:#888;font-size:12px">Se não foi você, ignore este e-mail.</p>
        </div>
      `,
    });
  }
}
