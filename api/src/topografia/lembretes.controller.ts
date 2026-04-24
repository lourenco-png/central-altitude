import { Controller, Get, Patch, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LembretesService } from './lembretes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Topografia - Lembretes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('topografia/lembretes')
export class LembretesController {
  constructor(private service: LembretesService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('tipo') tipo?: string,
    @Query('periodo') periodo?: string,
  ) {
    return this.service.findAll({ status, tipo, periodo });
  }

  @Patch(':id/emitir')
  marcarEmitido(@Param('id') id: string) {
    return this.service.marcarEmitido(id);
  }

  @Post('gerar')
  gerarManual(@Body() body: { tipo: 'MEDICAO' | 'NOTA_FISCAL'; periodo?: string }) {
    return this.service.gerarManual(body.tipo, body.periodo);
  }
}
