import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EpisService } from './epis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('RH - EPIs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rh/epis')
export class EpisController {
  constructor(private service: EpisService) {}

  @Get()
  findAll(@Query('funcionarioId') funcionarioId?: string) {
    return this.service.findAll(funcionarioId);
  }

  @Get('vencendo')
  findVencendo(@Query('dias') dias?: string) {
    return this.service.findVencendo(dias ? parseInt(dias) : 30);
  }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
