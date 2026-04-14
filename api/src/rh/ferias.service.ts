import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeriasService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.ferias.findMany({
      where: status ? { status: status as any } : {},
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
      orderBy: { inicio: 'asc' },
    });
  }

  create(data: any) {
    return this.prisma.ferias.create({
      data,
      include: { funcionario: { select: { id: true, nome: true } } },
    });
  }

  update(id: string, data: any) {
    return this.prisma.ferias.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.ferias.delete({ where: { id } });
  }
}
