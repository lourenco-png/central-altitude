import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrcamentosService } from './orcamentos.service';

@ApiTags('Proposta Pública')
@Controller('publico/proposta')
export class PropostaPublicaController {
  constructor(private service: OrcamentosService) {}

  @Get(':token')
  findByToken(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Post(':token/responder')
  responder(
    @Param('token') token: string,
    @Body() body: { aprovado: boolean; mensagem?: string },
  ) {
    return this.service.responderAprovacao(token, body.aprovado, body.mensagem);
  }
}
