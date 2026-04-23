import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmpresaService {
  constructor(private prisma: PrismaService) {}

  findFirst() {
    return this.prisma.empresa.findFirst({
      include: {
        socios: { include: { documentos: true } },
        documentos: true,
      },
    });
  }

  async upsert(data: any) {
    const { socios, documentos, id: _id, createdAt, updatedAt, ...empresaData } = data;
    const payload = {
      nome: empresaData.nome,
      cnpj: empresaData.cnpj,
      endereco: empresaData.endereco || null,
      telefone: empresaData.telefone || null,
      email: empresaData.email || null,
    };
    const existing = await this.prisma.empresa.findFirst();
    if (existing) {
      return this.prisma.empresa.update({
        where: { id: existing.id },
        data: payload,
        include: { socios: true, documentos: true },
      });
    }
    return this.prisma.empresa.create({
      data: payload,
      include: { socios: true, documentos: true },
    });
  }

  async findDocumentosVencendo(dias = 30) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const [docsFunc, docsEmpresa] = await Promise.all([
      this.prisma.documentoFunc.findMany({
        where: { validade: { not: null, lte: limite } },
        include: { funcionario: { select: { id: true, nome: true } } },
        orderBy: { validade: 'asc' },
      }),
      this.prisma.documentoEmpresa.findMany({
        where: { validade: { not: null, lte: limite } },
        orderBy: { validade: 'asc' },
      }),
    ]);
    return {
      funcionarios: docsFunc,
      empresa: docsEmpresa,
    };
  }

  addSocio(empresaId: string, data: any) {
    const { documentos, ...socioData } = data;
    return this.prisma.socio.create({
      data: { ...socioData, empresaId },
      include: { documentos: true },
    });
  }

  removeSocio(id: string) {
    return this.prisma.socio.delete({ where: { id } });
  }

  addDocumentoSocio(socioId: string, data: { nome: string; arquivo?: string; emissao?: string; validade?: string }) {
    return this.prisma.documentoSocio.create({
      data: {
        socioId,
        nome: data.nome,
        arquivo: data.arquivo || null,
        emissao: data.emissao ? new Date(`${data.emissao.split('T')[0]}T12:00:00.000Z`) : null,
        validade: data.validade ? new Date(`${data.validade.split('T')[0]}T12:00:00.000Z`) : null,
      },
    });
  }

  removeDocumentoSocio(id: string) {
    return this.prisma.documentoSocio.delete({ where: { id } });
  }

  addDocumento(empresaId: string, data: any) {
    return this.prisma.documentoEmpresa.create({
      data: {
        empresaId,
        nome: data.nome,
        arquivo: data.arquivo || null,
        validade: data.validade ? new Date(`${String(data.validade).split('T')[0]}T12:00:00.000Z`) : null,
      },
    });
  }

  removeDocumento(id: string) {
    return this.prisma.documentoEmpresa.delete({ where: { id } });
  }
}
