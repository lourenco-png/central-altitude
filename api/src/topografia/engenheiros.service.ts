import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EngenheirosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.engenheiro.findMany({ orderBy: { nome: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.engenheiro.findUnique({
      where: { id },
      include: {
        solicitacoes: {
          include: { obra: { select: { id: true, nome: true } } },
          orderBy: { data: 'desc' },
          take: 20,
        },
      },
    });
  }

  create(data: any) {
    return this.prisma.engenheiro.create({ data });
  }

  update(id: string, data: any) {
    return this.prisma.engenheiro.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.engenheiro.delete({ where: { id } });
  }
}
