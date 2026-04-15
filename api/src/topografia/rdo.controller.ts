import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { RdoService } from './rdo.service';
import { PdfService } from '../comercial/pdf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Topografia - RDO')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('topografia/rdo')
export class RdoController {
  constructor(
    private service: RdoService,
    private pdfService: PdfService,
  ) {}

  @Get()
  findAll(@Query('obraId') obraId?: string) { return this.service.findAll(obraId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const rdo = await this.service.findOne(id);
    const buffer = await this.pdfService.gerarRdoPdf(rdo);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="RDO-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Post(':id/enviar-assinatura')
  enviarAssinatura(@Param('id') id: string, @Body() body: { destinatarios: { nome: string; email: string }[] }) {
    return this.service.enviarParaAssinatura(id, body.destinatarios);
  }

  @Post(':id/assinar')
  assinar(@Param('id') id: string, @Body() body: { token: string }) {
    return this.service.assinar(id, body.token);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
