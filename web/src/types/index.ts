// ============================================================
// TOPOGRAFIA
// ============================================================

export interface Obra {
  id: string;
  nome: string;
  clienteId: string;
  cliente?: Cliente;
  status: 'ATIVA' | 'PAUSADA' | 'CONCLUIDA';
  endereco?: string;
  createdAt: string;
}

export interface Engenheiro {
  id: string;
  nome: string;
  crea?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
}

export interface Solicitacao {
  id: string;
  obraId: string;
  obra?: Obra;
  engenheiroId: string;
  engenheiro?: Engenheiro;
  data: string;
  status: 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO';
  observacoes?: string;
  arquivos: string[];
  createdAt: string;
}

export interface RDO {
  id: string;
  obraId: string;
  obra?: Obra;
  data: string;
  clima?: string;
  atividades?: string;
  observacoes?: string;
  fotos: string[];
  equipe?: any;
  assinaturas: Assinatura[];
  createdAt: string;
}

export interface Assinatura {
  id: string;
  rdoId: string;
  nome: string;
  email: string;
  assinado: boolean;
  assinadoEm?: string;
}

// ============================================================
// RH / DP
// ============================================================

export interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  setor?: string;
  telefone?: string;
  email?: string;
  admissao: string;
  status: 'ATIVO' | 'AFASTADO' | 'DEMITIDO';
  foto?: string;
  documentos?: DocumentoFunc[];
  epis?: EPI[];
  ferias?: Ferias[];
  faltas?: Falta[];
}

export interface Falta {
  id: string;
  funcionarioId: string;
  funcionario?: { id: string; nome: string; cargo: string; setor?: string };
  data: string;
  tipo: 'FALTA' | 'ATRASO' | 'SAIDA_ANTECIPADA';
  justificada: boolean;
  motivo?: string;
  observacao?: string;
  createdAt: string;
}

export interface DocumentoFunc {
  id: string;
  funcionarioId: string;
  nome: string;
  arquivo?: string;
  emissao?: string;
  validade?: string;
}

export interface EPI {
  id: string;
  funcionarioId: string;
  funcionario?: { id: string; nome: string };
  descricao: string;
  ca?: string;
  validade?: string;
}

export interface Ferias {
  id: string;
  funcionarioId: string;
  funcionario?: { id: string; nome: string };
  inicio: string;
  fim: string;
  dias: number;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  logo?: string;
  socios: Socio[];
  documentos: DocumentoEmpresa[];
}

export interface Socio {
  id: string;
  empresaId: string;
  nome: string;
  cpf?: string;
  cargo?: string;
}

export interface DocumentoEmpresa {
  id: string;
  empresaId: string;
  nome: string;
  arquivo?: string;
  validade?: string;
}

// ============================================================
// COMERCIAL
// ============================================================

export interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  _count?: { obras: number; contratos: number; orcamentos: number };
}

export interface ItemOrcamento {
  id?: string;
  descricao: string;
  quantidade: number;
  unitario: number;
  total: number;
  ordem?: number;
}

export interface Orcamento {
  id: string;
  numero: number;
  clienteId: string;
  cliente?: Cliente;
  tipo: 'GENERICO' | 'TOPOGRAFIA' | 'INFRA_PREDIAL';
  itens: ItemOrcamento[];
  desconto: number;
  total: number;
  condicoes?: string;
  status: 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'REJEITADO';
  dadosEspecificos?: any;
  proposta?: Proposta;
  createdAt: string;
}

export interface Proposta {
  id: string;
  orcamentoId: string;
  orcamento?: Orcamento;
  validade: number;
  observacoes?: string;
  status: 'ENVIADA' | 'APROVADA' | 'REJEITADA';
  createdAt: string;
}

export interface Contrato {
  id: string;
  numero: number;
  clienteId: string;
  cliente?: Cliente;
  objeto: string;
  valor: number;
  inicio: string;
  fim?: string;
  status: 'AGUARDANDO_ASSINATURA' | 'ATIVO' | 'ENCERRADO';
  createdAt: string;
}

export interface Oportunidade {
  id: string;
  titulo: string;
  clienteId?: string;
  cliente?: Cliente;
  valor?: number;
  responsavel?: string;
  estagio: 'LEAD' | 'PROPOSTA' | 'FECHADO';
  ordem: number;
  createdAt: string;
}

// ============================================================
// NOTIFICAÇÕES
// ============================================================

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  link?: string;
  createdAt: string;
}
