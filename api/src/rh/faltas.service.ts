import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaltasService {
  constructor(private prisma: PrismaService) {}

  private parseDate(dateStr: string): Date {
    // Use noon UTC to avoid timezone shifts (e.g. UTC-3 turning "2026-04-23" into Apr 22)
    return new Date(`${dateStr.split('T')[0]}T12:00:00.000Z`);
  }

  findAll(funcionarioId?: string, mes?: string) {
    const where: any = {};
    if (funcionarioId) where.funcionarioId = funcionarioId;
    if (mes) {
      const [ano, m] = mes.split('-').map(Number);
      where.data = {
        gte: new Date(Date.UTC(ano, m - 1, 1)),
        lt: new Date(Date.UTC(ano, m, 1)),
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
    const { data: dataFalta, ...rest } = data;
    return this.prisma.falta.create({
      data: { ...rest, data: this.parseDate(dataFalta) },
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
    });
  }

  update(id: string, data: any) {
    const { data: dataFalta, ...rest } = data;
    return this.prisma.falta.update({
      where: { id },
      data: { ...rest, ...(dataFalta ? { data: this.parseDate(dataFalta) } : {}) },
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
