import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../auth/mail.service';

const INCLUDE = { obra: { select: { id: true, nome: true } }, assinaturas: true };

@Injectable()
export class RdoService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

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

  async update(id: string, data: any) {
    const { moi, mod, equipamentos, tarefas, ocorrencias, ...rest } = data;
    const rdo = await this.prisma.rDO.update({
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

    // Notificar engenheiro quando enviado para assinatura
    if (data.rdoStatus === 'aguardando_assinatura') {
      this.notificarAssinatura(id).catch(() => {});
    }

    return rdo;
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

  async enviarParaAssinatura(rdoId: string, destinatarios: { nome: string; email: string }[]) {
    const rdo = await this.prisma.rDO.update({
      where: { id: rdoId },
      data: { rdoStatus: 'aguardando_assinatura' },
      include: { ...INCLUDE, obra: { select: { id: true, nome: true } } },
    });

    const assinaturas = await Promise.all(
      destinatarios.map((d) =>
        this.prisma.assinatura.create({ data: { rdoId, nome: d.nome, email: d.email } }),
      ),
    );

    // Notificar cada destinatário
    for (const d of destinatarios) {
      if (d.email) {
        this.mailService.sendRdoAssinatura(
          d.email,
          d.nome,
          (rdo as any).obra?.nome || '',
          (rdo as any).numero || '',
        ).catch(() => {});
      }
    }

    return [rdo, ...assinaturas];
  }

  async notificarAssinatura(rdoId: string) {
    // Chamado quando rdoStatus é atualizado via PATCH para aguardando_assinatura
    const rdo = await this.prisma.rDO.findUnique({
      where: { id: rdoId },
      include: { obra: { select: { nome: true } }, assinaturas: true },
    });
    if (!rdo) return;

    // Busca engenheiro da obra via solicitacoes
    const sol = await this.prisma.solicitacao.findFirst({
      where: { obraId: rdo.obraId },
      include: { engenheiro: true },
      orderBy: { createdAt: 'desc' },
    });

    if (sol?.engenheiro?.email) {
      this.mailService.sendRdoAssinatura(
        sol.engenheiro.email,
        sol.engenheiro.nome,
        (rdo as any).obra?.nome || '',
        (rdo as any).numero || '',
      ).catch(() => {});
    }
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
