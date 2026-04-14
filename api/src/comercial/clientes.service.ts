import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.cliente.findMany({
      where: search ? { nome: { contains: search, mode: 'insensitive' } } : {},
      include: {
        _count: { select: { obras: true, contratos: true, orcamentos: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.cliente.findUnique({
      where: { id },
      include: {
        obras: true,
        orcamentos: { orderBy: { createdAt: 'desc' }, take: 10 },
        contratos: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  create(data: any) {
    return this.prisma.cliente.create({ data });
  }

  update(id: string, data: any) {
    return this.prisma.cliente.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.cliente.delete({ where: { id } });
  }
}
