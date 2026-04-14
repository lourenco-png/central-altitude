import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PipelineService } from './pipeline.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Comercial - Pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comercial/pipeline')
export class PipelineController {
  constructor(private service: PipelineService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Patch(':id/mover')
  mover(@Param('id') id: string, @Body() body: { estagio: string }) {
    return this.service.moverEstagio(id, body.estagio);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
