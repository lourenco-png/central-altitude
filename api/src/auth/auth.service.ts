import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async login(emailOrUsername: string, password: string) {
    // Allow login with just the username part (e.g., "admin" instead of "admin@centralaltitude.com")
    const email = emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@centralaltitude.com`;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.ativo) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, nome: user.nome, role: user.role, avatar: user.avatar },
    };
  }

  async register(email: string, password: string, nome: string, role?: string, requestingUserRole?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    // Apenas ADMIN pode definir roles. Outros sempre criam como VIEWER.
    const safeRole = requestingUserRole === 'ADMIN' && role ? role : 'VIEWER';

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hashed, nome, role: safeRole as any },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, nome: user.nome, role: user.role },
    };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nome: true, role: true, avatar: true },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: 'Senha alterada com sucesso' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user || !user.ativo) return { message: 'Se o e-mail existir, você receberá as instruções.' };

    // Invalidate previous tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    const resetToken = await this.prisma.passwordResetToken.create({
      data: { userId: user.id, expiresAt },
    });

    await this.mailService.sendPasswordReset(user.email, user.nome, resetToken.token);
    return { message: 'Se o e-mail existir, você receberá as instruções.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: record.userId }, data: { password: hashed } });
    await this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } });

    return { message: 'Senha redefinida com sucesso' };
  }

  async adminResetPassword(userId: string, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: 'Senha redefinida com sucesso' };
  }
}
