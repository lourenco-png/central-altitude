import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmpresaService {
  constructor(private prisma: PrismaService) {}

  findFirst() {
    return this.prisma.empresa.findFirst({ include: { socios: true, documentos: true } });
  }

  upsert(data: any) {
    const { socios, documentos, ...empresaData } = data;
    return this.prisma.empresa.upsert({
      where: { cnpj: empresaData.cnpj },
      update: empresaData,
      create: empresaData,
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
