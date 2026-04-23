import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EpisService {
  constructor(private prisma: PrismaService) {}

  private parseDate(dateStr: string): Date {
    return new Date(`${dateStr.split('T')[0]}T12:00:00.000Z`);
  }

  findAll(funcionarioId?: string) {
    return this.prisma.ePI.findMany({
      where: funcionarioId ? { funcionarioId } : {},
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
      orderBy: { validade: 'asc' },
    });
  }

  async findVencendo(dias = 30) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    return this.prisma.ePI.findMany({
      where: { validade: { lte: limite } },
      include: { funcionario: { select: { id: true, nome: true } } },
      orderBy: { validade: 'asc' },
    });
  }

  create(data: any) {
    const { validade, dataEntrega, ...rest } = data;
    return this.prisma.ePI.create({
      data: {
        ...rest,
        ...(validade ? { validade: this.parseDate(validade) } : {}),
        ...(dataEntrega ? { dataEntrega: this.parseDate(dataEntrega) } : {}),
      },
      include: { funcionario: { select: { id: true, nome: true } } },
    });
  }

  update(id: string, data: any) {
    const { validade, dataEntrega, ...rest } = data;
    return this.prisma.ePI.update({
      where: { id },
      data: {
        ...rest,
        ...(validade ? { validade: this.parseDate(validade) } : {}),
        ...(dataEntrega ? { dataEntrega: this.parseDate(dataEntrega) } : {}),
      },
    });
  }

  remove(id: string) {
    return this.prisma.ePI.delete({ where: { id } });
  }
}
