import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const INCLUDE = { obra: { select: { id: true, nome: true } }, assinaturas: true };

@Injectable()
export class RdoService {
  constructor(private prisma: PrismaService) {}

  findAll(obraId?: string) {
    return this.prisma.rDO.findMany({
      where: obraId ? { obraId } : {},
      include: INCLUDE,
      orderBy: { data: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.rDO.findUnique({
      where: { id },
      include: { obra: { include: { cliente: true } }, assinaturas: true },
    });
  }

  create(data: any) {
    const { moi, mod, equipamentos, tarefas, ocorrencias, ...rest } = data;
    return this.prisma.rDO.create({
      data: {
        ...rest,
        ...(moi !== undefined ? { moi } : {}),
        ...(mod !== undefined ? { mod } : {}),
        ...(equipamentos !== undefined ? { equipamentos } : {}),
        ...(tarefas !== undefined ? { tarefas } : {}),
        ...(ocorrencias !== undefined ? { ocorrencias } : {}),
      },
      include: INCLUDE,
    });
  }

  update(id: string, data: any) {
    const { moi, mod, equipamentos, tarefas, ocorrencias, ...rest } = data;
    return this.prisma.rDO.update({
      where: { id },
      data: {
        ...rest,
        ...(moi !== undefined ? { moi } : {}),
        ...(mod !== undefined ? { mod } : {}),
        ...(equipamentos !== undefined ? { equipamentos } : {}),
        ...(tarefas !== undefined ? { tarefas } : {}),
        ...(ocorrencias !== undefined ? { ocorrencias } : {}),
      },
      include: INCLUDE,
    });
  }

  assinarEng(id: string, nome: string) {
    return this.prisma.rDO.update({
      where: { id },
      data: {
        rdoStatus: 'assinado',
        assinaturaEngNome: nome,
        assinaturaEngData: new Date().toISOString().slice(0, 10),
      },
      include: INCLUDE,
    });
  }

  enviarParaAssinatura(rdoId: string, destinatarios: { nome: string; email: string }[]) {
    return Promise.all([
      this.prisma.rDO.update({
        where: { id: rdoId },
        data: { rdoStatus: 'aguardando_assinatura' },
        include: INCLUDE,
      }),
      ...destinatarios.map((d) =>
        this.prisma.assinatura.create({ data: { rdoId, nome: d.nome, email: d.email } }),
      ),
    ]);
  }

  async assinar(rdoId: string, token: string) {
    const assinatura = await this.prisma.assinatura.findFirst({ where: { rdoId, token } });
    if (!assinatura) throw new Error('Token inválido');
    return this.prisma.assinatura.update({
      where: { id: assinatura.id },
      data: { assinado: true, assinadoEm: new Date() },
    });
  }

  remove(id: string) {
    return this.prisma.rDO.delete({ where: { id } });
  }
}
