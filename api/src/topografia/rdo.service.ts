import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RdoService {
  constructor(private prisma: PrismaService) {}

  findAll(obraId?: string) {
    return this.prisma.rDO.findMany({
      where: obraId ? { obraId } : {},
      include: { obra: { select: { id: true, nome: true } }, assinaturas: true },
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
    return this.prisma.rDO.create({
      data,
      include: { obra: { select: { id: true, nome: true } }, assinaturas: true },
    });
  }

  update(id: string, data: any) {
    return this.prisma.rDO.update({
      where: { id },
      data,
      include: { obra: { select: { id: true, nome: true } }, assinaturas: true },
    });
  }

  async enviarParaAssinatura(rdoId: string, destinatarios: { nome: string; email: string }[]) {
    const assinaturas = await Promise.all(
      destinatarios.map((d) =>
        this.prisma.assinatura.create({ data: { rdoId, nome: d.nome, email: d.email } }),
      ),
    );
    return assinaturas;
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
