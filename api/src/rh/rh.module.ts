import { Module } from '@nestjs/common';

import { FuncionariosController } from './funcionarios.controller';
import { FuncionariosService } from './funcionarios.service';
import { EpisController } from './epis.controller';
import { EpisService } from './epis.service';
import { FeriasController } from './ferias.controller';
import { FeriasService } from './ferias.service';
import { EmpresaController } from './empresa.controller';
import { EmpresaService } from './empresa.service';
import { FaltasController } from './faltas.controller';
import { FaltasService } from './faltas.service';
import { DisciplinarController } from './disciplinar.controller';
import { DisciplinarService } from './disciplinar.service';
import { DisciplinarPdfService } from './disciplinar-pdf.service';
@Module({
  controllers: [
    FuncionariosController,
    EpisController,
    FeriasController,
    EmpresaController,
    FaltasController,
    DisciplinarController,
  ],
  providers: [
    FuncionariosService,
    EpisService,
    FeriasService,
    EmpresaService,
    FaltasService,
    DisciplinarService,
    DisciplinarPdfService,
  ],
})
export class RhModule {}
