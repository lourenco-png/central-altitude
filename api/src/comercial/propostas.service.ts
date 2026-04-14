import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';

@Injectable()
export class PropostasService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
  ) {}

  findAll() {
    return this.prisma.proposta.findMany({
      include: {
        orcamento: { include: { cliente: true, itens: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.proposta.findUnique({
      where: { id },
      include: { orcamento: { include: { cliente: true, itens: { orderBy: { ordem: 'asc' } } } } },
    });
  }

  create(data: { orcamentoId: string; validade?: number; observacoes?: string }) {
    return this.prisma.proposta.create({
      data,
      include: { orcamento: { include: { cliente: true, itens: true } } },
    });
  }

  update(id: string, data: any) {
    return this.prisma.proposta.update({ where: { id }, data });
  }

  async gerarPdf(id: string): Promise<Buffer> {
    const proposta = await this.findOne(id);
    return this.pdfService.gerarPropostaPdf(proposta);
  }
}
