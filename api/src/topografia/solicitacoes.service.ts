import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

@Injectable()
export class SolicitacoesService {
  constructor(
    private prisma: PrismaService,
    private notificacoes: NotificacoesService,
  ) {}

  private async notificarAdmins(titulo: string, mensagem: string, link?: string) {
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', ativo: true }, select: { id: true } });
    await Promise.all(admins.map(a => this.notificacoes.create({ userId: a.id, titulo, mensagem, tipo: 'info', link })));
  }

  findAll(filters?: { status?: string; engenheiroId?: string; obraId?: string; from?: string; to?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.engenheiroId) where.engenheiroId = filters.engenheiroId;
    if (filters?.obraId) where.obraId = filters.obraId;
    if (filters?.from || filters?.to) {
      where.data = {};
      if (filters.from) where.data.gte = new Date(filters.from);
      if (filters.to) where.data.lte = new Date(filters.to);
    }

    return this.prisma.solicitacao.findMany({
      where,
      include: {
        obra: { select: { id: true, nome: true } },
        engenheiro: { select: { id: true, nome: true } },
      },
      orderBy: { data: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.solicitacao.findUnique({
      where: { id },
      include: {
        obra: { include: { cliente: true } },
        engenheiro: true,
      },
    });
  }

  async create(data: any) {
    const sol = await this.prisma.solicitacao.create({
      data,
      include: {
        obra: { select: { id: true, nome: true } },
        engenheiro: { select: { id: true, nome: true } },
      },
    });
    await this.notificarAdmins(
      'Nova solicitação agendada',
      `Serviço: ${sol.servico || 'Topografia'} — Obra: ${sol.obra?.nome || ''} — Eng: ${sol.engenheiro?.nome || ''}`,
      '/topografia/solicitacoes',
    );
    return sol;
  }

  update(id: string, data: any) {
    return this.prisma.solicitacao.update({
      where: { id },
      data,
      include: {
        obra: { select: { id: true, nome: true } },
        engenheiro: { select: { id: true, nome: true } },
      },
    });
  }

  remove(id: string) {
    return this.prisma.solicitacao.delete({ where: { id } });
  }
}
