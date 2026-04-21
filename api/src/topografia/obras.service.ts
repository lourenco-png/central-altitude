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
        medicoes: { orderBy: { data: 'desc' } },
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

  // ── Fotos ──────────────────────────────────────────────────

  async addFoto(id: string, url: string) {
    const obra = await this.prisma.obra.findUnique({ where: { id } });
    const fotos = [...(obra?.fotos || []), url];
    return this.prisma.obra.update({ where: { id }, data: { fotos }, include: { cliente: true } });
  }

  async removeFoto(id: string, url: string) {
    const obra = await this.prisma.obra.findUnique({ where: { id } });
    const fotos = (obra?.fotos || []).filter((f: string) => f !== url);
    return this.prisma.obra.update({ where: { id }, data: { fotos }, include: { cliente: true } });
  }

  // ── Medições ───────────────────────────────────────────────

  getMedicoes(obraId: string) {
    return this.prisma.medicao.findMany({ where: { obraId }, orderBy: { data: 'desc' } });
  }

  createMedicao(obraId: string, data: { descricao: string; valor: number; data: Date; status?: string }) {
    return this.prisma.medicao.create({ data: { ...data, obraId } });
  }

  updateMedicao(id: string, data: any) {
    return this.prisma.medicao.update({ where: { id }, data });
  }

  removeMedicao(id: string) {
    return this.prisma.medicao.delete({ where: { id } });
  }

  // ── Stats ──────────────────────────────────────────────────

  async getStats() {
    const [obrasAtivas, rdosPendentes, solicitacoesSemana, orcamentosAprovados] = await Promise.all([
      this.prisma.obra.count({ where: { status: 'ATIVA' } }),
      this.prisma.rDO.count({ where: { rdoStatus: 'aguardando_assinatura' } }),
      this.prisma.solicitacao.count({
        where: {
          status: 'AGENDADO',
          data: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
            lte: new Date(new Date().setDate(new Date().getDate() + 7)),
          },
        },
      }),
      this.prisma.orcamento.count({ where: { status: 'APROVADO' } }),
    ]);
    return { obrasAtivas, rdosPendentes, solicitacoesSemana, orcamentosAprovados };
  }

  // ── Dashboard consolidado (1 round-trip) ───────────────────

  async getDashboard() {
    const hoje = new Date();
    const limite30 = new Date(hoje);
    limite30.setDate(hoje.getDate() + 30);
    const semanaAtras = new Date(hoje);
    semanaAtras.setDate(hoje.getDate() - 7);
    const semanaFrente = new Date(hoje);
    semanaFrente.setDate(hoje.getDate() + 7);

    const [
      obrasAtivas,
      rdosPendentes,
      solicitacoesSemana,
      orcamentosAprovados,
      solicitacoes,
      episVencendo,
      pipeline,
      docsFunc,
      docsEmpresa,
    ] = await Promise.all([
      this.prisma.obra.count({ where: { status: 'ATIVA' } }),
      this.prisma.rDO.count({ where: { rdoStatus: 'aguardando_assinatura' } }),
      this.prisma.solicitacao.count({
        where: { status: 'AGENDADO', data: { gte: semanaAtras, lte: semanaFrente } },
      }),
      this.prisma.orcamento.count({ where: { status: 'APROVADO' } }),
      this.prisma.solicitacao.findMany({
        include: {
          obra: { select: { id: true, nome: true } },
          engenheiro: { select: { id: true, nome: true } },
        },
        orderBy: { data: 'asc' },
        take: 100,
      }),
      this.prisma.ePI.findMany({
        where: { validade: { lte: limite30 } },
        include: { funcionario: { select: { id: true, nome: true } } },
        orderBy: { validade: 'asc' },
      }),
      this.prisma.oportunidade.findMany({
        include: { cliente: { select: { id: true, nome: true } } },
        orderBy: [{ estagio: 'asc' }, { ordem: 'asc' }],
      }),
      this.prisma.documentoFunc.findMany({
        where: { validade: { not: null, lte: limite30 } },
        include: { funcionario: { select: { id: true, nome: true } } },
        orderBy: { validade: 'asc' },
      }),
      this.prisma.documentoEmpresa.findMany({
        where: { validade: { not: null, lte: limite30 } },
        orderBy: { validade: 'asc' },
      }),
    ]);

    return {
      stats: { obrasAtivas, rdosPendentes, solicitacoesSemana, orcamentosAprovados },
      solicitacoes,
      episVencendo,
      pipeline,
      documentos: { funcionarios: docsFunc, empresa: docsEmpresa },
    };
  }
}
