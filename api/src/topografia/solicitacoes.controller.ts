import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SolicitacoesService } from './solicitacoes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Topografia - Solicitações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('topografia/solicitacoes')
export class SolicitacoesController {
  constructor(private service: SolicitacoesService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('engenheiroId') engenheiroId?: string,
    @Query('obraId') obraId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({ status, engenheiroId, obraId, from, to });
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
