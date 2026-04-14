import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EpisService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.ePI.create({
      data,
      include: { funcionario: { select: { id: true, nome: true } } },
    });
  }

  update(id: string, data: any) {
    return this.prisma.ePI.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.ePI.delete({ where: { id } });
  }
}
