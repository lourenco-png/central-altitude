import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ObrasService } from './obras.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Topografia - Obras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('topografia/obras')
export class ObrasController {
  constructor(private service: ObrasService) {}

  @Get('stats')
  getStats() { return this.service.getStats(); }

  @Get('dashboard')
  getDashboard() { return this.service.getDashboard(); }

  @Get()
  findAll(@Query('status') status?: string) { return this.service.findAll(status); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  // ── Fotos ──────────────────────────────────────────────────

  @Post(':id/fotos')
  addFoto(@Param('id') id: string, @Body() body: { url: string }) {
    return this.service.addFoto(id, body.url);
  }

  @Delete(':id/fotos')
  removeFoto(@Param('id') id: string, @Body() body: { url: string }) {
    return this.service.removeFoto(id, body.url);
  }

  // ── Medições ───────────────────────────────────────────────

  @Get(':id/medicoes')
  getMedicoes(@Param('id') id: string) { return this.service.getMedicoes(id); }

  @Post(':id/medicoes')
  createMedicao(@Param('id') id: string, @Body() body: any) {
    return this.service.createMedicao(id, { ...body, data: new Date(body.data) });
  }

  @Patch('medicoes/:medicaoId')
  updateMedicao(@Param('medicaoId') id: string, @Body() body: any) {
    return this.service.updateMedicao(id, body);
  }

  @Delete('medicoes/:medicaoId')
  removeMedicao(@Param('medicaoId') id: string) { return this.service.removeMedicao(id); }
}
