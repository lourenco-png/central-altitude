import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SolicitacoesService {
  constructor(private prisma: PrismaService) {}

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

  create(data: any) {
    return this.prisma.solicitacao.create({
      data,
      include: {
        obra: { select: { id: true, nome: true } },
        engenheiro: { select: { id: true, nome: true } },
      },
    });
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
