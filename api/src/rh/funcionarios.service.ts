import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FuncionariosService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string, setor?: string) {
    return this.prisma.funcionario.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(setor ? { setor } : {}),
      },
      include: {
        epis: true,
        _count: { select: { epis: true, documentos: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.funcionario.findUnique({
      where: { id },
      include: {
        documentos: { orderBy: { createdAt: 'desc' } },
        epis: true,
        ferias: { orderBy: { inicio: 'desc' } },
        faltas: { orderBy: { data: 'desc' } },
      },
    });
  }

  create(data: any) {
    return this.prisma.funcionario.create({ data });
  }

  update(id: string, data: any) {
    return this.prisma.funcionario.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.funcionario.delete({ where: { id } });
  }

  addDocumento(funcionarioId: string, data: any) {
    return this.prisma.documentoFunc.create({ data: { ...data, funcionarioId } });
  }

  removeDocumento(id: string) {
    return this.prisma.documentoFunc.delete({ where: { id } });
  }
}
