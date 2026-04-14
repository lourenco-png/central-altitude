import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EngenheirosService } from './engenheiros.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Topografia - Engenheiros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('topografia/engenheiros')
export class EngenheirosController {
  constructor(private service: EngenheirosService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
