import { Module } from '@nestjs/common';
import { FuncionariosController } from './funcionarios.controller';
import { FuncionariosService } from './funcionarios.service';
import { EpisController } from './epis.controller';
import { EpisService } from './epis.service';
import { FeriasController } from './ferias.controller';
import { FeriasService } from './ferias.service';
import { EmpresaController } from './empresa.controller';
import { EmpresaService } from './empresa.service';

@Module({
  controllers: [FuncionariosController, EpisController, FeriasController, EmpresaController],
  providers: [FuncionariosService, EpisService, FeriasService, EmpresaService],
})
export class RhModule {}
