import { Module } from '@nestjs/common';
import { ObrasController } from './obras.controller';
import { ObrasService } from './obras.service';
import { EngenheirosController } from './engenheiros.controller';
import { EngenheirosService } from './engenheiros.service';
import { SolicitacoesController } from './solicitacoes.controller';
import { SolicitacoesService } from './solicitacoes.service';
import { RdoController } from './rdo.controller';
import { RdoService } from './rdo.service';
import { PdfService } from '../comercial/pdf.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [NotificacoesModule],
  controllers: [ObrasController, EngenheirosController, SolicitacoesController, RdoController],
  providers: [ObrasService, EngenheirosService, SolicitacoesService, RdoService, PdfService],
})
export class TopografiaModule {}
