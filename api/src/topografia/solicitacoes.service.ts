import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../auth/mail.service';

@Injectable()
export class SolicitacoesService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

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
        engenheiro: { select: { id: true, nome: true, email: true } },
      },
    });

    // Notificar engenheiro
    if (sol.engenheiro?.email) {
      const dataFormatada = new Date(sol.data).toLocaleDateString('pt-BR');
      this.mailService.sendNovaSolicitacao(
        sol.engenheiro.email,
        sol.engenheiro.nome,
        sol.obra.nome,
        dataFormatada,
      ).catch(() => {}); // fire-and-forget
    }

    return sol;
  }

  async update(id: string, data: any) {
    // Busca estado anterior para detectar mudança de status
    const anterior = await this.prisma.solicitacao.findUnique({
      where: { id },
      include: { engenheiro: true, obra: { select: { nome: true } } },
    });

    const sol = await this.prisma.solicitacao.update({
      where: { id },
      data,
      include: {
        obra: { select: { id: true, nome: true } },
        engenheiro: { select: { id: true, nome: true, email: true } },
      },
    });

    // Notificar engenheiro se status mudou
    if (
      data.status &&
      anterior?.status !== data.status &&
      sol.engenheiro?.email
    ) {
      this.mailService.sendStatusSolicitacao(
        sol.engenheiro.email,
        sol.engenheiro.nome,
        sol.obra.nome,
        data.status,
      ).catch(() => {});
    }

    return sol;
  }

  remove(id: string) {
    return this.prisma.solicitacao.delete({ where: { id } });
  }
}
