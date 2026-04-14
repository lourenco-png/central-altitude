'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, GripVertical } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Oportunidade, Cliente } from '@/types';

const ESTAGIOS = [
  { key: 'LEAD', label: 'Lead', color: 'border-blue-400', bg: 'bg-blue-50', badge: 'badge-blue' },
  { key: 'PROPOSTA', label: 'Proposta', color: 'border-orange-400', bg: 'bg-orange-50', badge: 'badge-orange' },
  { key: 'FECHADO', label: 'Fechado', color: 'border-green-500', bg: 'bg-green-50', badge: 'badge-green' },
];

export default function PipelinePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ titulo: '', clienteId: '', valor: 0, responsavel: '', estagio: 'LEAD' });
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: oportunidades = [], isLoading } = useQuery<Oportunidade[]>({
    queryKey: ['pipeline'],
    queryFn: () => api.get('/comercial/pipeline').then(r => r.data),
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ['clientes'], queryFn: () => api.get('/comercial/clientes').then(r => r.data) });

  const createMut = useMutation({ mutationFn: (d: any) => api.post('/comercial/pipeline', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline'] }); toast.success('Oportunidade criada!'); setShowModal(false); } });
  const moverMut = useMutation({ mutationFn: ({ id, estagio }: any) => api.patch(`/comercial/pipeline/${id}/mover`, { estagio }), onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.delete(`/comercial/pipeline/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline'] }); toast.success('Removido'); } });

  const byEstagio = (key: string) => oportunidades.filter(o => o.estagio === key);
  const totalByEstagio = (key: string) => byEstagio(key).reduce((sum, o) => sum + (o.valor || 0), 0);

  const handleDrop = (estagio: string) => {
    if (dragId && oportunidades.find(o => o.id === dragId)?.estagio !== estagio) {
      moverMut.mutate({ id: dragId, estagio });
    }
    setDragId(null);
  };

  return (
    <div>
      <PageHeader
        title="Pipeline de Vendas"
        actions={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Nova Oportunidade</button>}
      />

      {isLoading ? (
        <p className="text-neutral-400 text-center py-12">Carregando...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {ESTAGIOS.map((estagio) => {
            const cards = byEstagio(estagio.key);
            return (
              <div
                key={estagio.key}
                className="flex flex-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(estagio.key)}
              >
                {/* Column header */}
                <div className={`p-3 rounded-t-xl border-t-2 ${estagio.color} ${estagio.bg} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{estagio.label}</span>
                    <span className="text-xs bg-white/70 px-1.5 py-0.5 rounded-full font-medium">{cards.length}</span>
                  </div>
                  <span className="text-xs font-medium text-neutral-600">{formatCurrency(totalByEstagio(estagio.key))}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 bg-neutral-100/60 border border-neutral-200 border-t-0 rounded-b-xl p-2 min-h-[400px] space-y-2">
                  {cards.map((op) => (
                    <div
                      key={op.id}
                      draggable
                      onDragStart={() => setDragId(op.id)}
                      className="bg-white border border-neutral-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{op.titulo}</p>
                          {op.cliente && <p className="text-xs text-neutral-500 truncate mt-0.5">{op.cliente.nome}</p>}
                          {op.valor && <p className="text-sm font-semibold text-primary-700 mt-1">{formatCurrency(op.valor)}</p>}
                          {op.responsavel && <p className="text-xs text-neutral-400 mt-0.5">{op.responsavel}</p>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <GripVertical size={14} className="text-neutral-300" />
                          <button onClick={() => deleteMut.mutate(op.id)} className="p-0.5 rounded hover:bg-red-50">
                            <X size={12} className="text-neutral-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {cards.length === 0 && (
                    <div className="text-center py-8 text-sm text-neutral-400">
                      Arraste cards aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Oportunidade">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <div><label className="label">Título *</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="input" required /></div>
          <div>
            <label className="label">Cliente</label>
            <select value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })} className="input">
              <option value="">Sem cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Valor (R$)</label><input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })} className="input" /></div>
            <div><label className="label">Responsável</label><input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} className="input" /></div>
          </div>
          <div>
            <label className="label">Estágio</label>
            <select value={form.estagio} onChange={e => setForm({ ...form, estagio: e.target.value })} className="input">
              <option value="LEAD">Lead</option>
              <option value="PROPOSTA">Proposta</option>
              <option value="FECHADO">Fechado</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
