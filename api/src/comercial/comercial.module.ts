import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { OrcamentosController } from './orcamentos.controller';
import { OrcamentosService } from './orcamentos.service';
import { PropostasController } from './propostas.controller';
import { PropostasService } from './propostas.service';
import { ContratosController } from './contratos.controller';
import { ContratosService } from './contratos.service';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';
import { PdfService } from './pdf.service';
import { PropostaPublicaController } from './proposta-publica.controller';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [NotificacoesModule],
  controllers: [ClientesController, OrcamentosController, PropostasController, ContratosController, PipelineController, PropostaPublicaController],
  providers: [ClientesService, OrcamentosService, PropostasService, ContratosService, PipelineService, PdfService],
})
export class ComercialModule {}
