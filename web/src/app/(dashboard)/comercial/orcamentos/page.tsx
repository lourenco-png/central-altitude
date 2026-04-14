'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FileText, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OrcamentoTopografia } from './OrcamentoTopografia';
import { OrcamentoInfraPredial } from './OrcamentoInfraPredial';
import toast from 'react-hot-toast';
import type { Orcamento } from '@/types';

type Tela = 'lista' | 'novo-tipo' | 'form-topo' | 'form-infra' | 'editar';

export default function OrcamentosPage() {
  const qc = useQueryClient();
  const [tela, setTela] = useState<Tela>('lista');
  const [editando, setEditando] = useState<Orcamento | null>(null);

  const { data: orcamentos = [], isLoading } = useQuery<Orcamento[]>({
    queryKey: ['orcamentos'],
    queryFn: () => api.get('/comercial/orcamentos').then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/comercial/orcamentos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); toast.success('Removido'); },
  });

  const createPropostaMut = useMutation({
    mutationFn: (orcamentoId: string) => api.post('/comercial/propostas', { orcamentoId }),
    onSuccess: () => toast.success('Proposta gerada!'),
  });

  const tipoLabel: Record<string, string> = {
    TOPOGRAFIA: 'Topografia',
    INFRA_PREDIAL: 'Infra/Predial',
    GENERICO: 'Genérico',
  };

  const tipoBadge: Record<string, string> = {
    TOPOGRAFIA: 'bg-blue-100 text-blue-800',
    INFRA_PREDIAL: 'bg-purple-100 text-purple-800',
    GENERICO: 'bg-neutral-100 text-neutral-600',
  };

  if (tela === 'form-topo') {
    return (
      <div>
        <button onClick={() => setTela('lista')} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-4">
          <ChevronLeft size={16} /> Voltar
        </button>
        <OrcamentoTopografia
          orcamento={editando}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); setTela('lista'); setEditando(null); }}
          onCancel={() => { setTela('lista'); setEditando(null); }}
        />
      </div>
    );
  }

  if (tela === 'form-infra') {
    return (
      <div>
        <button onClick={() => setTela('lista')} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-4">
          <ChevronLeft size={16} /> Voltar
        </button>
        <OrcamentoInfraPredial
          orcamento={editando}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); setTela('lista'); setEditando(null); }}
          onCancel={() => { setTela('lista'); setEditando(null); }}
        />
      </div>
    );
  }

  if (tela === 'novo-tipo') {
    return (
      <div>
        <button onClick={() => setTela('lista')} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-4">
          <ChevronLeft size={16} /> Voltar
        </button>
        <PageHeader title="Novo Orçamento" subtitle="Selecione o tipo de orçamento" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          <button
            onClick={() => { setEditando(null); setTela('form-topo'); }}
            className="card p-6 text-left hover:border-primary-400 hover:bg-primary-50 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-blue-700 font-bold text-sm">TOP</span>
            </div>
            <h3 className="font-semibold text-neutral-900 group-hover:text-primary-800">Topografia</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Levantamentos, georeferenciamento, mapeamento
            </p>
          </button>

          <button
            onClick={() => { setEditando(null); setTela('form-infra'); }}
            className="card p-6 text-left hover:border-primary-400 hover:bg-primary-50 transition-all group"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-purple-700 font-bold text-sm">INF</span>
            </div>
            <h3 className="font-semibold text-neutral-900 group-hover:text-primary-800">Infra & Predial</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Água, esgoto, drenagem, terraplanagem, macrodrenagem
            </p>
          </button>
        </div>
      </div>
    );
  }

  // Lista
  return (
    <div>
      <PageHeader
        title="Orçamentos"
        actions={
          <button onClick={() => setTela('novo-tipo')} className="btn-primary">
            <Plus size={16} /> Novo Orçamento
          </button>
        }
      />

      {isLoading ? (
        <p className="text-neutral-400 text-center py-12">Carregando...</p>
      ) : orcamentos.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 mb-4">Nenhum orçamento criado</p>
          <button onClick={() => setTela('novo-tipo')} className="btn-primary mx-auto">
            <Plus size={16} /> Criar primeiro orçamento
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Nº</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Data</th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium">#{o.numero}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tipoBadge[(o as any).tipo] || tipoBadge.GENERICO}`}>
                      {tipoLabel[(o as any).tipo] || 'Genérico'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{o.cliente?.nome || '-'}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(o.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditando(o);
                          setTela((o as any).tipo === 'INFRA_PREDIAL' ? 'form-infra' : 'form-topo');
                        }}
                        className="p-1.5 rounded hover:bg-neutral-100" title="Editar"
                      >
                        <Edit2 size={14} className="text-neutral-500" />
                      </button>
                      {!(o as any).proposta && (
                        <button onClick={() => createPropostaMut.mutate(o.id)} className="p-1.5 rounded hover:bg-primary-50" title="Gerar Proposta">
                          <FileText size={14} className="text-primary-700" />
                        </button>
                      )}
                      <button onClick={() => { if (confirm('Excluir?')) deleteMut.mutate(o.id); }} className="p-1.5 rounded hover:bg-red-50">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
