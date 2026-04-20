import { Controller, Get, Patch, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificacoesService } from './notificacoes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Notificações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private service: NotificacoesService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.userId);
  }

  @Get('count')
  count(@Request() req) {
    return this.service.countNaoLidas(req.user.userId);
  }

  @Patch(':id/lida')
  marcarLida(@Param('id') id: string, @Request() req) {
    return this.service.marcarLida(id, req.user.userId);
  }

  @Patch('marcar-todas-lidas')
  marcarTodasLidas(@Request() req) {
    return this.service.marcarTodasLidas(req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, req.user.userId);
  }
}
