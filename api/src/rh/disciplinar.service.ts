import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NivelRisco = 'OK' | 'ADVERTENCIA' | 'SUSPENSAO' | 'RISCO_JUSTA_CAUSA' | 'JUSTA_CAUSA' | 'ABANDONO_POSSIVEL';

@Injectable()
export class DisciplinarService {
  constructor(private prisma: PrismaService) {}

  private parseDate(dateStr: string): Date {
    return new Date(`${dateStr.split('T')[0]}T12:00:00.000Z`);
  }

  // ── Cálculo de risco ────────────────────────────────────────────────────────

  calcularNivelRisco(
    faltasInjNaoPunidas: number,
    acoes: { tipo: string; createdAt: Date }[],
    ultimaFalta: Date | null,
  ): NivelRisco {
    const hoje = new Date();
    const diasSemRegistro = ultimaFalta
      ? Math.floor((hoje.getTime() - ultimaFalta.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (diasSemRegistro !== null && diasSemRegistro >= 30) return 'ABANDONO_POSSIVEL';

    const tipos = acoes.map((a) => a.tipo);
    const temJustaCausa = tipos.includes('JUSTA_CAUSA');
    if (temJustaCausa) return 'JUSTA_CAUSA';

    const qtdSuspensoes = tipos.filter((t) => t === 'SUSPENSAO').length;
    if (qtdSuspensoes >= 2) return 'RISCO_JUSTA_CAUSA';

    const temSuspensao = qtdSuspensoes >= 1;
    if (temSuspensao && faltasInjNaoPunidas >= 1) return 'RISCO_JUSTA_CAUSA';
    if (temSuspensao) return 'SUSPENSAO';

    const temAdvEscrita = tipos.includes('ADVERTENCIA_ESCRITA');
    if (temAdvEscrita && faltasInjNaoPunidas >= 2) return 'SUSPENSAO';
    if (temAdvEscrita) return 'ADVERTENCIA';

    if (faltasInjNaoPunidas >= 3) return 'SUSPENSAO';
    if (faltasInjNaoPunidas >= 1) return 'ADVERTENCIA';

    return 'OK';
  }

  sugerirProximaAcao(
    faltasInjNaoPunidas: number,
    acoes: { tipo: string }[],
    nivel: NivelRisco,
  ): { tipo: string; diasSuspensao?: number; mensagem: string } | null {
    if (nivel === 'OK') return null;

    const tipos = acoes.map((a) => a.tipo);
    const qtdSuspensoes = tipos.filter((t) => t === 'SUSPENSAO').length;

    if (nivel === 'ABANDONO_POSSIVEL') {
      return { tipo: 'CARTA_ABANDONO', mensagem: 'Funcionário com possível abandono de emprego (30+ dias sem registro). Emitir carta de abandono.' };
    }

    if (nivel === 'RISCO_JUSTA_CAUSA' || (qtdSuspensoes >= 2 && faltasInjNaoPunidas >= 1)) {
      return { tipo: 'JUSTA_CAUSA', mensagem: 'Funcionário em reincidência grave. Medida recomendada: Justa causa por desídia.' };
    }

    if (nivel === 'SUSPENSAO') {
      if (qtdSuspensoes === 0) {
        return { tipo: 'SUSPENSAO', diasSuspensao: 3, mensagem: 'Reincidência após advertência escrita. Suspensão recomendada: 1 a 3 dias.' };
      }
      return { tipo: 'SUSPENSAO', diasSuspensao: 5, mensagem: 'Nova reincidência. Suspensão recomendada: 3 a 5 dias.' };
    }

    if (nivel === 'ADVERTENCIA') {
      if (tipos.includes('ADVERTENCIA_VERBAL') || faltasInjNaoPunidas >= 2) {
        return { tipo: 'ADVERTENCIA_ESCRITA', mensagem: '2ª ou 3ª ocorrência injustificada. Aplicar advertência escrita.' };
      }
      return { tipo: 'ADVERTENCIA_VERBAL', mensagem: '1ª falta injustificada. Aplicar advertência verbal/registrada.' };
    }

    return null;
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboard() {
    const funcionarios = await this.prisma.funcionario.findMany({
      where: { status: { not: 'DEMITIDO' } },
      include: {
        faltas: { orderBy: { data: 'desc' } },
        acoesDisciplinares: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { nome: 'asc' },
    });

    const lista = funcionarios.map((f) => {
      const faltasInj = f.faltas.filter((fa) => !fa.justificada && !fa.punida);
      const ultimaFalta = f.faltas.length > 0 ? new Date(f.faltas[0].data) : null;
      const nivel = this.calcularNivelRisco(faltasInj.length, f.acoesDisciplinares, ultimaFalta);
      const sugestao = this.sugerirProximaAcao(faltasInj.length, f.acoesDisciplinares, nivel);

      return {
        funcionario: { id: f.id, nome: f.nome, cargo: f.cargo, setor: f.setor, status: f.status },
        totalFaltas: f.faltas.length,
        faltasInjustificadasNaoPunidas: faltasInj.length,
        ultimaFalta,
        nivel,
        sugestao,
        acoes: f.acoesDisciplinares,
      };
    });

    const comAlerta = lista.filter((l) => l.nivel !== 'OK');
    return {
      totais: {
        advertencias: lista.filter((l) => l.nivel === 'ADVERTENCIA').length,
        suspensoes: lista.filter((l) => l.nivel === 'SUSPENSAO').length,
        riscoJustaCausa: lista.filter((l) => l.nivel === 'RISCO_JUSTA_CAUSA' || l.nivel === 'JUSTA_CAUSA').length,
        abandonoPossivel: lista.filter((l) => l.nivel === 'ABANDONO_POSSIVEL').length,
      },
      funcionariosEmAlerta: comAlerta,
      todos: lista,
    };
  }

  // ── Por funcionário ─────────────────────────────────────────────────────────

  async findByFuncionario(funcionarioId: string) {
    const funcionario = await this.prisma.funcionario.findUnique({
      where: { id: funcionarioId },
      include: {
        faltas: { orderBy: { data: 'desc' } },
        acoesDisciplinares: { orderBy: { data: 'desc' } },
      },
    });
    if (!funcionario) throw new NotFoundException('Funcionário não encontrado');

    const faltasInj = funcionario.faltas.filter((f) => !f.justificada && !f.punida);
    const ultimaFalta = funcionario.faltas.length > 0 ? new Date(funcionario.faltas[0].data) : null;
    const nivel = this.calcularNivelRisco(faltasInj.length, funcionario.acoesDisciplinares, ultimaFalta);
    const sugestao = this.sugerirProximaAcao(faltasInj.length, funcionario.acoesDisciplinares, nivel);

    return { funcionario, nivel, sugestao };
  }

  async getSugestao(funcionarioId: string) {
    const f = await this.prisma.funcionario.findUnique({
      where: { id: funcionarioId },
      include: {
        faltas: true,
        acoesDisciplinares: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!f) throw new NotFoundException('Funcionário não encontrado');

    const faltasInj = f.faltas.filter((fa) => !fa.justificada && !fa.punida);
    const ultimaFalta = f.faltas.length > 0 ? new Date(f.faltas[0].data) : null;
    const nivel = this.calcularNivelRisco(faltasInj.length, f.acoesDisciplinares, ultimaFalta);
    return this.sugerirProximaAcao(faltasInj.length, f.acoesDisciplinares, nivel);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async findAll(tipo?: string, status?: string) {
    return this.prisma.acaoDisciplinar.findMany({
      where: {
        ...(tipo ? { tipo: tipo as any } : {}),
        ...(status ? { statusAssinatura: status as any } : {}),
      },
      include: {
        funcionario: { select: { id: true, nome: true, cargo: true, setor: true } },
      },
      orderBy: { data: 'desc' },
    });
  }

  async create(data: {
    funcionarioId: string;
    tipo: string;
    data: string;
    motivo: string;
    diasSuspensao?: number;
    faltasVinculadas?: string[];
    observacao?: string;
    overrideJustificativa?: string;
  }) {
    // Verificar dupla punição
    if (data.faltasVinculadas && data.faltasVinculadas.length > 0) {
      const faltasPunidas = await this.prisma.falta.findMany({
        where: { id: { in: data.faltasVinculadas }, punida: true },
      });
      if (faltasPunidas.length > 0 && !data.overrideJustificativa) {
        throw new BadRequestException(
          `${faltasPunidas.length} falta(s) já foram utilizadas em outra ação disciplinar. Use o campo de justificativa para override.`,
        );
      }
    }

    const acao = await this.prisma.acaoDisciplinar.create({
      data: {
        funcionarioId: data.funcionarioId,
        tipo: data.tipo as any,
        data: this.parseDate(data.data),
        motivo: data.motivo,
        diasSuspensao: data.diasSuspensao || null,
        faltasVinculadas: data.faltasVinculadas || [],
        observacao: data.observacao || null,
        overrideJustificativa: data.overrideJustificativa || null,
      },
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
    });

    // Marcar faltas como punidas
    if (data.faltasVinculadas && data.faltasVinculadas.length > 0) {
      await this.prisma.falta.updateMany({
        where: { id: { in: data.faltasVinculadas } },
        data: { punida: true },
      });
    }

    // Criar notificação para todos os admins
    await this.criarNotificacaoDisciplinar(acao);

    return acao;
  }

  async update(id: string, data: any) {
    const acao = await this.prisma.acaoDisciplinar.findUnique({ where: { id } });
    if (!acao) throw new NotFoundException('Ação disciplinar não encontrada');

    const { data: dataStr, ...rest } = data;
    return this.prisma.acaoDisciplinar.update({
      where: { id },
      data: {
        ...rest,
        ...(dataStr ? { data: this.parseDate(dataStr) } : {}),
      },
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
    });
  }

  async marcarAssinado(id: string, documentoAssinado?: string) {
    return this.prisma.acaoDisciplinar.update({
      where: { id },
      data: {
        statusAssinatura: 'ASSINADO',
        ...(documentoAssinado ? { documentoAssinado } : {}),
      },
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
    });
  }

  async remove(id: string) {
    const acao = await this.prisma.acaoDisciplinar.findUnique({ where: { id } });
    if (!acao) throw new NotFoundException('Ação disciplinar não encontrada');

    // Desmarcar faltas vinculadas
    if (acao.faltasVinculadas.length > 0) {
      await this.prisma.falta.updateMany({
        where: { id: { in: acao.faltasVinculadas } },
        data: { punida: false },
      });
    }

    return this.prisma.acaoDisciplinar.delete({ where: { id } });
  }

  async verificarAbandono() {
    const funcionarios = await this.prisma.funcionario.findMany({
      where: { status: 'ATIVO' },
      include: {
        faltas: { orderBy: { data: 'desc' }, take: 1 },
        acoesDisciplinares: { where: { tipo: 'CARTA_ABANDONO' }, take: 1 },
      },
    });

    const hoje = new Date();
    const abandonos: any[] = [];

    for (const f of funcionarios) {
      if (f.acoesDisciplinares.length > 0) continue; // já tem carta emitida
      const ultimaFalta = f.faltas[0];
      if (!ultimaFalta) continue;

      const diasSemRegistro = Math.floor(
        (hoje.getTime() - new Date(ultimaFalta.data).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diasSemRegistro >= 30) {
        abandonos.push({ funcionario: f, diasSemRegistro });
      }
    }

    return abandonos;
  }

  private async criarNotificacaoDisciplinar(acao: any) {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER'] }, ativo: true },
    });

    const tipoLabel: Record<string, string> = {
      ADVERTENCIA_VERBAL: 'Advertência Verbal',
      ADVERTENCIA_ESCRITA: 'Advertência Escrita',
      SUSPENSAO: 'Suspensão',
      JUSTA_CAUSA: 'Justa Causa',
      CARTA_ABANDONO: 'Carta de Abandono',
    };

    for (const admin of admins) {
      await this.prisma.notificacao.create({
        data: {
          userId: admin.id,
          titulo: `Ação disciplinar registrada`,
          mensagem: `${tipoLabel[acao.tipo] || acao.tipo} aplicada ao funcionário ${acao.funcionario?.nome || acao.funcionarioId}.`,
          tipo: acao.tipo === 'JUSTA_CAUSA' || acao.tipo === 'CARTA_ABANDONO' ? 'danger' : 'warning',
          link: '/rh/disciplinar',
        },
      });
    }
  }
}
