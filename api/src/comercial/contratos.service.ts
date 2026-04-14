import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContratosService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string, clienteId?: string) {
    return this.prisma.contrato.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(clienteId ? { clienteId } : {}),
      },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true },
    });
  }

  create(data: any) {
    return this.prisma.contrato.create({ data, include: { cliente: true } });
  }

  update(id: string, data: any) {
    return this.prisma.contrato.update({ where: { id }, data, include: { cliente: true } });
  }

  remove(id: string) {
    return this.prisma.contrato.delete({ where: { id } });
  }
}
