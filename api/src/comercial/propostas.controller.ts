import { Controller, Get, Post, Patch, Param, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PropostasService } from './propostas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Comercial - Propostas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comercial/propostas')
export class PropostasController {
  constructor(private service: PropostasService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Get(':id/pdf')
  async gerarPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.service.gerarPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proposta-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
