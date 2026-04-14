import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.oportunidade.findMany({
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: [{ estagio: 'asc' }, { ordem: 'asc' }],
    });
  }

  create(data: any) {
    return this.prisma.oportunidade.create({ data, include: { cliente: true } });
  }

  update(id: string, data: any) {
    return this.prisma.oportunidade.update({ where: { id }, data, include: { cliente: true } });
  }

  async moverEstagio(id: string, estagio: string) {
    return this.prisma.oportunidade.update({
      where: { id },
      data: { estagio: estagio as any },
      include: { cliente: true },
    });
  }

  remove(id: string) {
    return this.prisma.oportunidade.delete({ where: { id } });
  }
}
