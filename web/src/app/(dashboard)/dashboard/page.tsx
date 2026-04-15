'use client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, DollarSign, AlertTriangle, Triangle, Clock, Building2, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { KpiCard } from '@/components/ui/KpiCard';
import { formatCurrency, formatDate, getEpiStatus } from '@/lib/utils';
import type { Solicitacao, EPI, Oportunidade } from '@/types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  const { data: solicitacoes = [] } = useQuery<Solicitacao[]>({
    queryKey: ['solicitacoes-dashboard'],
    queryFn: () => api.get('/topografia/solicitacoes').then((r) => r.data),
  });

  const { data: epis = [] } = useQuery<EPI[]>({
    queryKey: ['epis-vencendo'],
    queryFn: () => api.get('/rh/epis/vencendo?dias=30').then((r) => r.data),
  });

  const { data: pipeline = [] } = useQuery<Oportunidade[]>({
    queryKey: ['pipeline-dashboard'],
    queryFn: () => api.get('/comercial/pipeline').then((r) => r.data),
  });

  const { data: stats } = useQuery<{ obrasAtivas: number; rdosPendentes: number; solicitacoesSemana: number; orcamentosAprovados: number }>({
    queryKey: ['topografia-stats'],
    queryFn: () => api.get('/topografia/obras/stats').then((r) => r.data),
  });

  const hoje = new Date().toDateString();
  const servicosHoje = solicitacoes.filter((s) => new Date(s.data).toDateString() === hoje);
  const agendados = solicitacoes.filter((s) => s.status === 'AGENDADO').length;
  const episCriticos = epis.filter((e) => e.validade && getEpiStatus(e.validade).color === 'red');

  const leadCount = pipeline.filter((o) => o.estagio === 'LEAD').length;
  const propostaCount = pipeline.filter((o) => o.estagio === 'PROPOSTA').length;
  const fechadoCount = pipeline.filter((o) => o.estagio === 'FECHADO').length;
  const totalPipeline = pipeline.reduce((sum, o) => sum + (o.valor || 0), 0);

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">{saudacao}, {user?.nome?.split(' ')[0]}!</h2>
          <p className="text-sm text-neutral-500 capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* KPIs — linha 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          title="Obras Ativas"
          value={stats?.obrasAtivas ?? '—'}
          icon={<Building2 size={20} />}
          color="green"
          subtitle="Em andamento"
        />
        <KpiCard
          title="RDOs Pendentes"
          value={stats?.rdosPendentes ?? '—'}
          icon={<FileCheck size={20} />}
          color={stats?.rdosPendentes ? 'orange' : 'green'}
          subtitle="Aguardando assinatura"
        />
        <KpiCard
          title="Serviços Hoje"
          value={servicosHoje.length}
          icon={<Calendar size={20} />}
          color="blue"
          subtitle={`${agendados} agendados total`}
        />
        <KpiCard
          title="EPIs Críticos"
          value={episCriticos.length}
          icon={<AlertTriangle size={20} />}
          color={episCriticos.length > 0 ? 'orange' : 'green'}
          subtitle="Vencendo em 7 dias"
        />
      </div>

      {/* KPIs — linha 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Pipeline Total"
          value={formatCurrency(totalPipeline)}
          icon={<DollarSign size={20} />}
          color="blue"
          subtitle={`${pipeline.length} oportunidades`}
        />
        <KpiCard
          title="Propostas Abertas"
          value={propostaCount}
          icon={<Triangle size={20} />}
          color="orange"
          subtitle={`${leadCount} leads ativos`}
        />
        <KpiCard
          title="Orçamentos Aprovados"
          value={stats?.orcamentosAprovados ?? '—'}
          icon={<FileCheck size={20} />}
          color="green"
          subtitle="Total aprovados"
        />
        <KpiCard
          title="Serviços na Semana"
          value={stats?.solicitacoesSemana ?? '—'}
          icon={<Users size={20} />}
          color="blue"
          subtitle="±7 dias"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Próximos Serviços */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Próximos Serviços</h3>
            <Link href="/topografia/calendario" className="text-xs text-primary-700 hover:underline">Ver calendário</Link>
          </div>
          {solicitacoes.filter((s) => s.status === 'AGENDADO').slice(0, 5).length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">Nenhum serviço agendado</p>
          ) : (
            <div className="space-y-2">
              {solicitacoes.filter((s) => s.status === 'AGENDADO').slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 hover:bg-primary-50 transition-colors">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-primary-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{s.obra?.nome}</p>
                    <p className="text-xs text-neutral-500">{(s as any).servico || s.engenheiro?.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-neutral-700">{formatDate(s.data)}</p>
                    <p className="text-xs text-neutral-400">{format(new Date(s.data), 'HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline resumido */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Pipeline de Vendas</h3>
            <Link href="/comercial/pipeline" className="text-xs text-primary-700 hover:underline">Ver pipeline</Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Lead', count: leadCount, color: 'bg-blue-500', total: pipeline.filter(o=>o.estagio==='LEAD') },
              { label: 'Proposta', count: propostaCount, color: 'bg-accent-600', total: pipeline.filter(o=>o.estagio==='PROPOSTA') },
              { label: 'Fechado', count: fechadoCount, color: 'bg-primary-600', total: pipeline.filter(o=>o.estagio==='FECHADO') },
            ].map((stage) => {
              const pct = pipeline.length > 0 ? (stage.count / pipeline.length) * 100 : 0;
              const val = stage.total.reduce((s, o) => s + (o.valor || 0), 0);
              return (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-neutral-700 font-medium">{stage.label}</span>
                    <span className="text-sm text-neutral-500">{stage.count} · {formatCurrency(val)}</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full ${stage.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(episCriticos.length > 0 || (stats?.rdosPendentes ?? 0) > 0) && (
        <div className="card p-5">
          <h3 className="font-semibold text-neutral-900 mb-3">Alertas & Pendências</h3>
          <div className="space-y-2">
            {(stats?.rdosPendentes ?? 0) > 0 && (
              <Link href="/topografia/rdo" className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
                <FileCheck size={16} className="text-yellow-600 flex-shrink-0" />
                <span className="text-sm text-yellow-800">
                  <strong>{stats?.rdosPendentes} RDO(s)</strong> aguardando assinatura
                </span>
              </Link>
            )}
            {episCriticos.map((epi) => {
              const st = getEpiStatus(epi.validade!);
              return (
                <Link key={epi.id} href="/rh/epis" className="flex items-center gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-800">
                    <strong>EPI vencendo:</strong> {epi.descricao} — {epi.funcionario?.nome} — {st.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
