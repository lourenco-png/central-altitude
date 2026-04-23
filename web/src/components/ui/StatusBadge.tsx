import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<string, { label: string; className: string }> = {
  // Solicitações
  AGENDADO:   { label: 'Agendado',   className: 'badge-blue' },
  CONCLUIDO:  { label: 'Concluído',  className: 'badge-green' },
  CANCELADO:  { label: 'Cancelado',  className: 'badge-red' },
  // Obras
  ATIVA:      { label: 'Ativa',      className: 'badge-green' },
  PAUSADA:    { label: 'Pausada',    className: 'badge-orange' },
  CONCLUIDA:  { label: 'Concluída',  className: 'badge-gray' },
  // Funcionários
  ATIVO:      { label: 'Ativo',      className: 'badge-green' },
  AFASTADO:   { label: 'Afastado',   className: 'badge-orange' },
  DEMITIDO:   { label: 'Demitido',   className: 'badge-red' },
  // Férias
  PENDENTE:   { label: 'Pendente',   className: 'badge-orange' },
  APROVADO:   { label: 'Aprovado',   className: 'badge-green' },
  REJEITADO:  { label: 'Rejeitado',  className: 'badge-red' },
  // Orçamentos/Propostas
  RASCUNHO:   { label: 'Rascunho',   className: 'badge-gray' },
  ENVIADO:    { label: 'Enviado',    className: 'badge-blue' },
  APROVADO_O: { label: 'Aprovado',   className: 'badge-green' },
  REJEITADO_O:{ label: 'Rejeitado',  className: 'badge-red' },
  ENVIADA:    { label: 'Enviada',    className: 'badge-blue' },
  APROVADA:   { label: 'Aprovada',   className: 'badge-green' },
  REJEITADA:  { label: 'Rejeitada',  className: 'badge-red' },
  // Contratos
  AGUARDANDO_ASSINATURA: { label: 'Aguard. Assinatura', className: 'badge-orange' },
  ENCERRADO:  { label: 'Encerrado',  className: 'badge-gray' },
  // Pipeline
  LEAD:    { label: 'Lead',    className: 'badge-blue' },
  PROPOSTA:{ label: 'Proposta', className: 'badge-orange' },
  FECHADO: { label: 'Fechado',  className: 'badge-green' },
  // Disciplinar — tipo de ação
  ADVERTENCIA_VERBAL:  { label: 'Adv. Verbal',  className: 'badge-orange' },
  ADVERTENCIA_ESCRITA: { label: 'Adv. Escrita',  className: 'badge-orange' },
  SUSPENSAO:           { label: 'Suspensão',      className: 'badge-red' },
  JUSTA_CAUSA:         { label: 'Justa Causa',    className: 'badge-red' },
  CARTA_ABANDONO:      { label: 'Carta Abandono', className: 'badge-gray' },
  // Disciplinar — status assinatura
  ASSINADO:  { label: 'Assinado',  className: 'badge-green' },
  RECUSADO:  { label: 'Recusado',  className: 'badge-red' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] || { label: status, className: 'badge-gray' };
  return <span className={config.className}>{config.label}</span>;
}
