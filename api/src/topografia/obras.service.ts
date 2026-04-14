import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ObrasService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.obra.findMany({
      where: status ? { status: status as any } : {},
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.obra.findUnique({
      where: { id },
      include: {
        cliente: true,
        solicitacoes: { include: { engenheiro: true }, orderBy: { data: 'desc' } },
      },
    });
  }

  create(data: { nome: string; clienteId: string; endereco?: string }) {
    return this.prisma.obra.create({ data, include: { cliente: true } });
  }

  update(id: string, data: any) {
    return this.prisma.obra.update({ where: { id }, data, include: { cliente: true } });
  }

  remove(id: string) {
    return this.prisma.obra.delete({ where: { id } });
  }
}
