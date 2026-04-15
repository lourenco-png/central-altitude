import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class OrcamentosService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string, clienteId?: string) {
    return this.prisma.orcamento.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(clienteId ? { clienteId } : {}),
      },
      include: { cliente: { select: { id: true, nome: true } }, itens: true, proposta: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.orcamento.findUnique({
      where: { id },
      include: { cliente: true, itens: { orderBy: { ordem: 'asc' } }, proposta: true },
    });
  }

  async create(data: any) {
    const { itens, ...orcamentoData } = data;
    const total = (itens || []).reduce((sum: number, item: any) => sum + item.quantidade * item.unitario, 0);

    return this.prisma.orcamento.create({
      data: {
        ...orcamentoData,
        total: total * (1 - (orcamentoData.desconto || 0) / 100),
        itens: itens ? {
          create: itens.map((item: any, idx: number) => ({
            descricao: item.descricao,
            quantidade: item.quantidade,
            unitario: item.unitario,
            total: item.quantidade * item.unitario,
            ordem: idx,
          })),
        } : undefined,
      },
      include: { cliente: true, itens: { orderBy: { ordem: 'asc' } } },
    });
  }

  async update(id: string, data: any) {
    const { itens, ...orcamentoData } = data;

    if (itens) {
      await this.prisma.itemOrcamento.deleteMany({ where: { orcamentoId: id } });
      const subtotal = itens.reduce((sum: number, item: any) => sum + item.quantidade * item.unitario, 0);
      orcamentoData.total = subtotal * (1 - (orcamentoData.desconto || 0) / 100);
    }

    return this.prisma.orcamento.update({
      where: { id },
      data: {
        ...orcamentoData,
        ...(itens ? {
          itens: {
            create: itens.map((item: any, idx: number) => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              unitario: item.unitario,
              total: item.quantidade * item.unitario,
              ordem: idx,
            })),
          },
        } : {}),
      },
      include: { cliente: true, itens: { orderBy: { ordem: 'asc' } } },
    });
  }

  remove(id: string) {
    return this.prisma.orcamento.delete({ where: { id } });
  }

  // ── Aprovação pelo cliente ─────────────────────────────────

  async gerarLinkAprovacao(id: string) {
    const token = randomUUID();
    const orc = await this.prisma.orcamento.update({
      where: { id },
      data: { aprovacaoToken: token, status: 'ENVIADO' as any },
      include: { cliente: true },
    });
    return { token, orc };
  }

  findByToken(token: string) {
    return this.prisma.orcamento.findUnique({
      where: { aprovacaoToken: token },
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        itens: { orderBy: { ordem: 'asc' } },
      },
    });
  }

  async responderAprovacao(token: string, aprovado: boolean, mensagem?: string) {
    const orc = await this.prisma.orcamento.findUnique({ where: { aprovacaoToken: token } });
    if (!orc) throw new Error('Token inválido');
    return this.prisma.orcamento.update({
      where: { aprovacaoToken: token },
      data: {
        aprovacaoResposta: aprovado ? 'APROVADO' : 'REJEITADO',
        aprovacaoMensagem: mensagem || null,
        status: aprovado ? ('APROVADO' as any) : ('REJEITADO' as any),
      },
      include: { cliente: true, itens: { orderBy: { ordem: 'asc' } } },
    });
  }
}
