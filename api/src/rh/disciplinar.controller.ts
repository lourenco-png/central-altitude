import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DisciplinarService } from './disciplinar.service';
import { DisciplinarPdfService } from './disciplinar-pdf.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('rh/disciplinar')
export class DisciplinarController {
  constructor(
    private readonly service: DisciplinarService,
    private readonly pdfService: DisciplinarPdfService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('verificar-abandono')
  verificarAbandono() {
    return this.service.verificarAbandono();
  }

  @Get('funcionario/:id')
  findByFuncionario(@Param('id') id: string) {
    return this.service.findByFuncionario(id);
  }

  @Get('sugestao/:id')
  getSugestao(@Param('id') id: string) {
    return this.service.getSugestao(id);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const acao = await this.prisma.acaoDisciplinar.findUnique({
      where: { id },
      include: { funcionario: true },
    });
    if (!acao) { res.status(404).json({ message: 'Ação não encontrada' }); return; }

    const empresa = await this.prisma.empresa.findFirst();
    const pdfBuffer = await this.pdfService.gerarPdf(acao, acao.funcionario, empresa);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="disciplinar-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get()
  findAll(@Query('tipo') tipo?: string, @Query('status') status?: string) {
    return this.service.findAll(tipo, status);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id/assinar')
  marcarAssinado(@Param('id') id: string, @Body() body: { documentoAssinado?: string }) {
    return this.service.marcarAssinado(id, body.documentoAssinado);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
