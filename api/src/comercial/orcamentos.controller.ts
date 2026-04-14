import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrcamentosService } from './orcamentos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Comercial - Orçamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comercial/orcamentos')
export class OrcamentosController {
  constructor(private service: OrcamentosService) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('clienteId') clienteId?: string) {
    return this.service.findAll(status, clienteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
