import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FaltasService } from './faltas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('RH - Faltas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rh/faltas')
export class FaltasController {
  constructor(private service: FaltasService) {}

  @Get()
  findAll(
    @Query('funcionarioId') funcionarioId?: string,
    @Query('mes') mes?: string,
  ) {
    return this.service.findAll(funcionarioId, mes);
  }

  @Get('resumo')
  resumo(@Query('funcionarioId') funcionarioId?: string) {
    return this.service.resumo(funcionarioId);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
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
