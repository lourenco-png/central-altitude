import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmpresaService {
  constructor(private prisma: PrismaService) {}

  findFirst() {
    return this.prisma.empresa.findFirst({ include: { socios: true, documentos: true } });
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

  addSocio(empresaId: string, data: any) {
    return this.prisma.socio.create({ data: { ...data, empresaId } });
  }

  removeSocio(id: string) {
    return this.prisma.socio.delete({ where: { id } });
  }

  addDocumento(empresaId: string, data: any) {
    return this.prisma.documentoEmpresa.create({ data: { ...data, empresaId } });
  }

  removeDocumento(id: string) {
    return this.prisma.documentoEmpresa.delete({ where: { id } });
  }
}
