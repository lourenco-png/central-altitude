import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

const INCLUDE = { obra: { select: { id: true, nome: true } }, assinaturas: true };

@Injectable()
export class RdoService {
  constructor(
    private prisma: PrismaService,
    private notificacoes: NotificacoesService,
  ) {}

  private async notificarAdmins(titulo: string, mensagem: string, link?: string) {
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', ativo: true }, select: { id: true } });
    await Promise.all(admins.map(a => this.notificacoes.create({ userId: a.id, titulo, mensagem, tipo: 'info', link })));
  }

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

  async create(data: any) {
    const { moi, mod, equipamentos, tarefas, ocorrencias, ...rest } = data;
    const rdo = await this.prisma.rDO.create({
      data: {
        ...rest,
        ...(moi !== undefined ? { moi } : {}),
        ...(mod !== undefined ? { mod } : {}),
        ...(equipamentos !== undefined ? { equipamentos } : {}),
        ...(tarefas !== undefined ? { tarefas } : {}),
        ...(ocorrencias !== undefined ? { ocorrencias } : {}),
      },
      include: { obra: { select: { id: true, nome: true } }, assinaturas: true },
    });
    await this.notificarAdmins(
      'Novo RDO criado',
      `RDO ${rdo.numero ? `Nº ${rdo.numero}` : ''} — Obra: ${rdo.obra?.nome || ''}`,
      '/topografia/rdo',
    );
    return rdo;
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
