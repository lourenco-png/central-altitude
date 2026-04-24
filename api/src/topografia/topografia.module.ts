import { Module } from '@nestjs/common';
import { ObrasController } from './obras.controller';
import { ObrasService } from './obras.service';
import { EngenheirosController } from './engenheiros.controller';
import { EngenheirosService } from './engenheiros.service';
import { SolicitacoesController } from './solicitacoes.controller';
import { SolicitacoesService } from './solicitacoes.service';
import { RdoController } from './rdo.controller';
import { RdoService } from './rdo.service';
import { LembretesController } from './lembretes.controller';
import { LembretesService } from './lembretes.service';
import { PdfService } from '../comercial/pdf.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [NotificacoesModule],
  controllers: [ObrasController, EngenheirosController, SolicitacoesController, RdoController, LembretesController],
  providers: [ObrasService, EngenheirosService, SolicitacoesService, RdoService, LembretesService, PdfService],
})
export class TopografiaModule {}
