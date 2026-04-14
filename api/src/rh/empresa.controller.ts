import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
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

  @Put()
  upsert(@Body() body: any) { return this.service.upsert(body); }

  @Post('socios')
  addSocio(@Body() body: any) { return this.service.addSocio(body.empresaId, body); }

  @Delete('socios/:id')
  removeSocio(@Param('id') id: string) { return this.service.removeSocio(id); }

  @Post('documentos')
  addDocumento(@Body() body: any) { return this.service.addDocumento(body.empresaId, body); }

  @Delete('documentos/:id')
  removeDocumento(@Param('id') id: string) { return this.service.removeDocumento(id); }
}
