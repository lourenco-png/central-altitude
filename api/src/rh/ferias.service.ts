import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeriasService {
  constructor(private prisma: PrismaService) {}

  private parseDate(dateStr: string): Date {
    return new Date(`${dateStr.split('T')[0]}T12:00:00.000Z`);
  }

  findAll(status?: string) {
    return this.prisma.ferias.findMany({
      where: status ? { status: status as any } : {},
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
      orderBy: { inicio: 'asc' },
    });
  }

  create(data: any) {
    const { inicio, fim, ...rest } = data;
    return this.prisma.ferias.create({
      data: {
        ...rest,
        inicio: this.parseDate(inicio),
        fim: this.parseDate(fim),
      },
      include: { funcionario: { select: { id: true, nome: true } } },
    });
  }

  update(id: string, data: any) {
    const { inicio, fim, ...rest } = data;
    return this.prisma.ferias.update({
      where: { id },
      data: {
        ...rest,
        ...(inicio ? { inicio: this.parseDate(inicio) } : {}),
        ...(fim ? { fim: this.parseDate(fim) } : {}),
      },
    });
  }

  remove(id: string) {
    return this.prisma.ferias.delete({ where: { id } });
  }
}
