import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaltasService {
  constructor(private prisma: PrismaService) {}

  findAll(funcionarioId?: string, mes?: string) {
    const where: any = {};
    if (funcionarioId) where.funcionarioId = funcionarioId;
    if (mes) {
      const [ano, m] = mes.split('-').map(Number);
      where.data = {
        gte: new Date(ano, m - 1, 1),
        lt: new Date(ano, m, 1),
      };
    }
    return this.prisma.falta.findMany({
      where,
      include: {
        funcionario: { select: { id: true, nome: true, cargo: true, setor: true } },
      },
      orderBy: { data: 'desc' },
    });
  }

  create(data: any) {
    return this.prisma.falta.create({
      data,
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
    });
  }

  update(id: string, data: any) {
    return this.prisma.falta.update({
      where: { id },
      data,
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
    });
  }

  remove(id: string) {
    return this.prisma.falta.delete({ where: { id } });
  }

  async resumo(funcionarioId?: string) {
    const where: any = funcionarioId ? { funcionarioId } : {};
    const [total, justificadas, porTipo] = await Promise.all([
      this.prisma.falta.count({ where }),
      this.prisma.falta.count({ where: { ...where, justificada: true } }),
      this.prisma.falta.groupBy({ by: ['tipo'], where, _count: true }),
    ]);
    return {
      total,
      justificadas,
      naoJustificadas: total - justificadas,
      porTipo,
    };
  }
}
