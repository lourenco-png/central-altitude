'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Clock, FileText, Receipt, RefreshCw, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Lembrete, TipoLembrete } from '@/types';

function periodoLabel(periodo: string) {
  const [ano, mes] = periodo.split('-');
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[parseInt(mes) - 1]} / ${ano}`;
}

function periodoAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

function periodoAnterior() {
  const hoje = new Date();
  const ant = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  return `${ant.getFullYear()}-${String(ant.getMonth() + 1).padStart(2, '0')}`;
}

export default function LembretesPage() {
  const qc = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [gerandoTipo, setGerandoTipo] = useState<TipoLembrete | null>(null);

  const params = new URLSearchParams();
  if (filtroStatus) params.set('status', filtroStatus);
  if (filtroTipo) params.set('tipo', filtroTipo);
  if (filtroPeriodo) params.set('periodo', filtroPeriodo);

  const { data: lembretes = [], isLoading } = useQuery<Lembrete[]>({
    queryKey: ['lembretes', filtroStatus, filtroTipo, filtroPeriodo],
    queryFn: () => api.get(`/topografia/lembretes?${params.toString()}`).then(r => r.data),
  });

  const emitirMut = useMutation({
    mutationFn: (id: string) => api.patch(`/topografia/lembretes/${id}/emitir`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lembretes'] });
      toast.success('Marcado como emitido!');
    },
  });

  const gerarMut = useMutation({
    mutationFn: (payload: { tipo: TipoLembrete; periodo?: string }) =>
      api.post('/topografia/lembretes/gerar', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['lembretes'] });
      const { criados, tipo, periodo } = res.data;
      toast.success(`${criados} lembrete(s) de ${tipo === 'MEDICAO' ? 'Medição' : 'Nota Fiscal'} gerado(s) para ${periodoLabel(periodo)}`);
      setGerandoTipo(null);
    },
    onError: () => {
      toast.error('Erro ao gerar lembretes');
      setGerandoTipo(null);
    },
  });

  const handleGerar = (tipo: TipoLembrete) => {
    setGerandoTipo(tipo);
    const periodo = filtroPeriodo || periodoAnterior();
    gerarMut.mutate({ tipo, periodo });
  };

  const medicaoPendentes = lembretes.filter(l => l.tipo === 'MEDICAO' && l.status === 'PENDENTE').length;
  const nfPendentes = lembretes.filter(l => l.tipo === 'NOTA_FISCAL' && l.status === 'PENDENTE').length;

  return (
    <div>
      <PageHeader
        title="Lembretes"
        subtitle="Medições e Notas Fiscais"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => handleGerar('MEDICAO')}
              disabled={gerarMut.isPending}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={gerandoTipo === 'MEDICAO' && gerarMut.isPending ? 'animate-spin' : ''} />
              Gerar Medições
            </button>
            <button
              onClick={() => handleGerar('NOTA_FISCAL')}
              disabled={gerarMut.isPending}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={gerandoTipo === 'NOTA_FISCAL' && gerarMut.isPending ? 'animate-spin' : ''} />
              Gerar Notas Fiscais
            </button>
          </div>
        }
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50">
            <FileText size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Medições Pendentes</p>
            <p className="text-2xl font-bold text-neutral-900">{medicaoPendentes}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-50">
            <Receipt size={22} className="text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Notas Fiscais Pendentes</p>
            <p className="text-2xl font-bold text-neutral-900">{nfPendentes}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="px-4 py-3 border-b border-neutral-100 flex flex-wrap items-center gap-3">
          <Filter size={14} className="text-neutral-400" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Status:</span>
            {[
              { value: '', label: 'Todos' },
              { value: 'PENDENTE', label: 'Pendente' },
              { value: 'EMITIDO', label: 'Emitido' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFiltroStatus(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filtroStatus === opt.value ? 'bg-primary-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Tipo:</span>
            {[
              { value: '', label: 'Todos' },
              { value: 'MEDICAO', label: 'Medição' },
              { value: 'NOTA_FISCAL', label: 'Nota Fiscal' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFiltroTipo(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filtroTipo === opt.value ? 'bg-primary-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-neutral-500">Período:</span>
            <input
              type="month"
              value={filtroPeriodo}
              onChange={e => setFiltroPeriodo(e.target.value)}
              className="input text-xs py-1 px-2 h-7 w-40"
              placeholder="Selecionar mês"
            />
            {filtroPeriodo && (
              <button onClick={() => setFiltroPeriodo('')} className="text-xs text-neutral-400 hover:text-neutral-600">limpar</button>
            )}
          </div>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : lembretes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-300">
            <Bell size={48} className="mb-3" />
            <p className="text-sm text-neutral-400">Nenhum lembrete encontrado</p>
            <p className="text-xs text-neutral-300 mt-1">Use os botões acima para gerar lembretes do período anterior</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {lembretes.map(l => (
              <LembreteRow key={l.id} lembrete={l} onEmitir={() => emitirMut.mutate(l.id)} emitindo={emitirMut.isPending} />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-400 text-center">
        Lembretes são gerados automaticamente: Medição na 1ª semana do mês, Nota Fiscal na 2ª semana.
      </p>
    </div>
  );
}

function LembreteRow({ lembrete: l, onEmitir, emitindo }: { lembrete: Lembrete; onEmitir: () => void; emitindo: boolean }) {
  const isMedicao = l.tipo === 'MEDICAO';
  const isPendente = l.status === 'PENDENTE';

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-neutral-50 transition-colors">
      {/* Ícone tipo */}
      <div className={`p-2 rounded-lg flex-shrink-0 ${isMedicao ? 'bg-blue-50' : 'bg-orange-50'}`}>
        {isMedicao ? (
          <FileText size={16} className="text-blue-600" />
        ) : (
          <Receipt size={16} className="text-orange-600" />
        )}
      </div>

      {/* Tipo badge */}
      <div className="flex-shrink-0 w-24">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isMedicao ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
          {isMedicao ? 'Medição' : 'Nota Fiscal'}
        </span>
      </div>

      {/* Solicitação / Obra */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">
          {l.solicitacao?.obra?.nome || '—'}
        </p>
        <p className="text-xs text-neutral-500 truncate">
          {l.solicitacao?.obra?.cliente?.nome || '—'}
          {l.solicitacao?.servico ? ` · ${l.solicitacao.servico}` : ''}
        </p>
      </div>

      {/* Período */}
      <div className="flex-shrink-0 text-center w-32">
        <p className="text-xs font-medium text-neutral-700">{periodoLabel(l.periodoReferencia)}</p>
        <p className="text-xs text-neutral-400">ref. {l.periodoReferencia}</p>
      </div>

      {/* Status */}
      <div className="flex-shrink-0 w-28 text-center">
        {isPendente ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            <Clock size={11} /> Pendente
          </span>
        ) : (
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              <CheckCircle size={11} /> Emitido
            </span>
            {l.dataEmissao && (
              <p className="text-xs text-neutral-400 mt-0.5">{formatDate(l.dataEmissao)}</p>
            )}
          </div>
        )}
      </div>

      {/* Ação */}
      <div className="flex-shrink-0 w-28 text-right">
        {isPendente ? (
          <button
            onClick={onEmitir}
            disabled={emitindo}
            className="btn-primary text-xs py-1 px-3"
          >
            Marcar Emitido
          </button>
        ) : (
          <span className="text-xs text-neutral-300">—</span>
        )}
      </div>
    </div>
  );
}
