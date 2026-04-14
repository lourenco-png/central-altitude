import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FeriasService } from './ferias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('RH - Férias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rh/ferias')
export class FeriasController {
  constructor(private service: FeriasService) {}

  @Get()
  findAll(@Query('status') status?: string) { return this.service.findAll(status); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
