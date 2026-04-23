import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmpresaService } from './empresa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('RH - Empresa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rh/empresa')
export class EmpresaController {
  constructor(private service: EmpresaService) {}

  @Get()
  findFirst() { return this.service.findFirst(); }

  @Get('documentos/vencendo')
  findDocumentosVencendo(@Query('dias') dias?: string) {
    return this.service.findDocumentosVencendo(dias ? parseInt(dias) : 30);
  }

  @Put()
  upsert(@Body() body: any) { return this.service.upsert(body); }

  @Post('socios')
  addSocio(@Body() body: any) { return this.service.addSocio(body.empresaId, body); }

  @Delete('socios/:id')
  removeSocio(@Param('id') id: string) { return this.service.removeSocio(id); }

  @Post('socios/:id/documentos')
  addDocumentoSocio(@Param('id') id: string, @Body() body: any) {
    return this.service.addDocumentoSocio(id, body);
  }

  @Delete('socios/documentos/:id')
  removeDocumentoSocio(@Param('id') id: string) { return this.service.removeDocumentoSocio(id); }

  @Post('documentos')
  addDocumento(@Body() body: any) { return this.service.addDocumento(body.empresaId, body); }

  @Delete('documentos/:id')
  removeDocumento(@Param('id') id: string) { return this.service.removeDocumento(id); }
}
