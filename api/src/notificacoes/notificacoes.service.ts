import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacoesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.notificacao.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  countNaoLidas(userId: string) {
    return this.prisma.notificacao.count({ where: { userId, lida: false } });
  }

  create(data: { userId: string; titulo: string; mensagem: string; tipo?: string; link?: string }) {
    return this.prisma.notificacao.create({ data });
  }

  async marcarLida(id: string, userId: string) {
    const n = await this.prisma.notificacao.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    if (n.userId !== userId) throw new ForbiddenException();
    return this.prisma.notificacao.update({ where: { id }, data: { lida: true } });
  }

  marcarTodasLidas(userId: string) {
    return this.prisma.notificacao.updateMany({ where: { userId, lida: false }, data: { lida: true } });
  }

  async remove(id: string, userId: string) {
    const n = await this.prisma.notificacao.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    if (n.userId !== userId) throw new ForbiddenException();
    return this.prisma.notificacao.delete({ where: { id } });
  }

  // Verifica EPIs vencendo e cria notificações automáticas
  async verificarEpisVencendo(userId: string) {
    const hoje = new Date();
    const em7dias = new Date();
    em7dias.setDate(hoje.getDate() + 7);

    const episVencendo = await this.prisma.ePI.findMany({
      where: { validade: { lte: em7dias, gte: hoje } },
      include: { funcionario: true },
    });

    for (const epi of episVencendo) {
      const diasRestantes = Math.ceil((new Date(epi.validade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      await this.create({
        userId,
        titulo: `EPI vencendo: ${epi.descricao}`,
        mensagem: `${epi.descricao} de ${epi.funcionario.nome} vence em ${diasRestantes} dia(s)`,
        tipo: 'warning',
        link: '/rh/epis',
      });
    }
  }
}
