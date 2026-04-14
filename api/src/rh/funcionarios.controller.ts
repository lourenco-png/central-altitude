import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FuncionariosService } from './funcionarios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('RH - Funcionários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rh/funcionarios')
export class FuncionariosController {
  constructor(private service: FuncionariosService) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('setor') setor?: string) {
    return this.service.findAll(status, setor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post(':id/documentos')
  addDocumento(@Param('id') id: string, @Body() body: any) {
    return this.service.addDocumento(id, body);
  }

  @Delete('documentos/:docId')
  removeDocumento(@Param('docId') docId: string) {
    return this.service.removeDocumento(docId);
  }
}
