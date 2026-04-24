import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LembretesService {
  private readonly logger = new Logger(LembretesService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 8 * * *')
  async verificarLembretes() {
    const hoje = new Date();
    const dia = hoje.getDate();

    if (dia >= 1 && dia <= 7) {
      await this.gerarLembretesMedicao();
    }

    if (dia >= 8 && dia <= 14) {
      await this.gerarLembretesNotaFiscal();
    }
  }

  async gerarLembretesMedicao() {
    const hoje = new Date();
    const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
    // periodoRef = mês atual (mês seguinte à conclusão da solicitação)
    const periodoRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    const solicitacoes = await this.prisma.solicitacao.findMany({
      where: {
        status: 'CONCLUIDO',
        data: { gte: inicioMesPassado, lte: fimMesPassado },
      },
    });

    let criados = 0;
    for (const sol of solicitacoes) {
      const existing = await this.prisma.lembrete.findUnique({
        where: {
          tipo_solicitacaoId_periodoReferencia: {
            tipo: 'MEDICAO',
            solicitacaoId: sol.id,
            periodoReferencia: periodoRef,
          },
        },
      });
      if (!existing) {
        await this.prisma.lembrete.create({
          data: {
            tipo: 'MEDICAO',
            solicitacaoId: sol.id,
            periodoReferencia: periodoRef,
            status: 'PENDENTE',
          },
        });
        criados++;
      }
    }

    this.logger.log(`[Lembretes] Medição: ${criados} criados para período ${periodoRef}`);
    return { criados, periodo: periodoRef, tipo: 'MEDICAO' };
  }

  async gerarLembretesNotaFiscal() {
    const hoje = new Date();
    // periodoRef = mês atual (mês seguinte à conclusão da solicitação)
    const periodoRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    const medicoesEmitidas = await this.prisma.lembrete.findMany({
      where: {
        tipo: 'MEDICAO',
        status: 'EMITIDO',
        periodoReferencia: periodoRef,
      },
    });

    let criados = 0;
    for (const med of medicoesEmitidas) {
      const existing = await this.prisma.lembrete.findUnique({
        where: {
          tipo_solicitacaoId_periodoReferencia: {
            tipo: 'NOTA_FISCAL',
            solicitacaoId: med.solicitacaoId,
            periodoReferencia: periodoRef,
          },
        },
      });
      if (!existing) {
        await this.prisma.lembrete.create({
          data: {
            tipo: 'NOTA_FISCAL',
            solicitacaoId: med.solicitacaoId,
            periodoReferencia: periodoRef,
            status: 'PENDENTE',
          },
        });
        criados++;
      }
    }

    this.logger.log(`[Lembretes] Nota Fiscal: ${criados} criados para período ${periodoRef}`);
    return { criados, periodo: periodoRef, tipo: 'NOTA_FISCAL' };
  }

  findAll(filters?: { status?: string; tipo?: string; periodo?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.tipo) where.tipo = filters.tipo;
    if (filters?.periodo) where.periodoReferencia = filters.periodo;

    return this.prisma.lembrete.findMany({
      where,
      include: {
        solicitacao: {
          include: {
            obra: { include: { cliente: { select: { id: true, nome: true } } } },
            engenheiro: { select: { id: true, nome: true } },
          },
        },
      },
      orderBy: [{ periodoReferencia: 'desc' }, { tipo: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async marcarEmitido(id: string) {
    const lembrete = await this.prisma.lembrete.update({
      where: { id },
      data: { status: 'EMITIDO', dataEmissao: new Date() },
    });

    // Se é medição emitida, verificar se deve gerar NF automaticamente (na 2ª semana)
    if (lembrete.tipo === 'MEDICAO') {
      const hoje = new Date();
      const dia = hoje.getDate();
      if (dia >= 8 && dia <= 14) {
        await this.prisma.lembrete.upsert({
          where: {
            tipo_solicitacaoId_periodoReferencia: {
              tipo: 'NOTA_FISCAL',
              solicitacaoId: lembrete.solicitacaoId,
              periodoReferencia: lembrete.periodoReferencia,
            },
          },
          create: {
            tipo: 'NOTA_FISCAL',
            solicitacaoId: lembrete.solicitacaoId,
            periodoReferencia: lembrete.periodoReferencia,
            status: 'PENDENTE',
          },
          update: {},
        });
      }
    }

    return lembrete;
  }

  async gerarManual(tipo: 'MEDICAO' | 'NOTA_FISCAL', periodo?: string) {
    if (tipo === 'MEDICAO') {
      if (periodo) {
        return this.gerarLembretesMedicaoPeriodo(periodo);
      }
      return this.gerarLembretesMedicao();
    } else {
      if (periodo) {
        return this.gerarLembretesNotaFiscalPeriodo(periodo);
      }
      return this.gerarLembretesNotaFiscal();
    }
  }

  private async gerarLembretesMedicaoPeriodo(periodoRef: string) {
    const [ano, mes] = periodoRef.split('-').map(Number);
    // Busca solicitações concluídas no mês ANTERIOR ao período de referência
    const inicioMes = new Date(ano, mes - 2, 1);
    const fimMes = new Date(ano, mes - 1, 0, 23, 59, 59);

    const solicitacoes = await this.prisma.solicitacao.findMany({
      where: {
        status: 'CONCLUIDO',
        data: { gte: inicioMes, lte: fimMes },
      },
    });

    let criados = 0;
    for (const sol of solicitacoes) {
      const existing = await this.prisma.lembrete.findUnique({
        where: {
          tipo_solicitacaoId_periodoReferencia: {
            tipo: 'MEDICAO',
            solicitacaoId: sol.id,
            periodoReferencia: periodoRef,
          },
        },
      });
      if (!existing) {
        await this.prisma.lembrete.create({
          data: {
            tipo: 'MEDICAO',
            solicitacaoId: sol.id,
            periodoReferencia: periodoRef,
            status: 'PENDENTE',
          },
        });
        criados++;
      }
    }

    return { criados, periodo: periodoRef, tipo: 'MEDICAO' };
  }

  private async gerarLembretesNotaFiscalPeriodo(periodoRef: string) {
    const medicoesEmitidas = await this.prisma.lembrete.findMany({
      where: {
        tipo: 'MEDICAO',
        status: 'EMITIDO',
        periodoReferencia: periodoRef,
      },
    });

    let criados = 0;
    for (const med of medicoesEmitidas) {
      const existing = await this.prisma.lembrete.findUnique({
        where: {
          tipo_solicitacaoId_periodoReferencia: {
            tipo: 'NOTA_FISCAL',
            solicitacaoId: med.solicitacaoId,
            periodoReferencia: periodoRef,
          },
        },
      });
      if (!existing) {
        await this.prisma.lembrete.create({
          data: {
            tipo: 'NOTA_FISCAL',
            solicitacaoId: med.solicitacaoId,
            periodoReferencia: periodoRef,
            status: 'PENDENTE',
          },
        });
        criados++;
      }
    }

    return { criados, periodo: periodoRef, tipo: 'NOTA_FISCAL' };
  }
}
