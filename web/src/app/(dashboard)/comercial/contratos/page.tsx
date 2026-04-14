'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Contrato, Cliente } from '@/types';

export default function ContratosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [form, setForm] = useState({ clienteId: '', objeto: '', valor: 0, inicio: '', fim: '', status: 'AGUARDANDO_ASSINATURA' });

  const { data: contratos = [], isLoading } = useQuery<Contrato[]>({ queryKey: ['contratos'], queryFn: () => api.get('/comercial/contratos').then(r => r.data) });
  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ['clientes'], queryFn: () => api.get('/comercial/clientes').then(r => r.data) });

  const createMut = useMutation({ mutationFn: (d: any) => api.post('/comercial/contratos', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contratos'] }); toast.success('Contrato criado!'); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: any) => api.patch(`/comercial/contratos/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contratos'] }); toast.success('Atualizado!'); closeModal(); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.delete(`/comercial/contratos/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contratos'] }); toast.success('Removido'); } });

  const openEdit = (c: Contrato) => { setEditing(c); setForm({ clienteId: c.clienteId, objeto: c.objeto, valor: c.valor, inicio: c.inicio.split('T')[0], fim: c.fim?.split('T')[0] || '', status: c.status }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  return (
    <div>
      <PageHeader title="Contratos" actions={<button onClick={() => { setEditing(null); setForm({ clienteId: '', objeto: '', valor: 0, inicio: '', fim: '', status: 'AGUARDANDO_ASSINATURA' }); setShowModal(true); }} className="btn-primary"><Plus size={16} /> Novo Contrato</button>} />
      <div className="card">
        <Table<Contrato>
          loading={isLoading} data={contratos}
          columns={[
            { key: 'numero', label: 'Nº', render: (c) => <span className="font-mono">#{c.numero}</span> },
            { key: 'cliente', label: 'Cliente', render: (c) => c.cliente?.nome || '-' },
            { key: 'objeto', label: 'Objeto', render: (c) => <span className="line-clamp-1">{c.objeto}</span> },
            { key: 'valor', label: 'Valor', render: (c) => <span className="font-medium">{formatCurrency(c.valor)}</span> },
            { key: 'inicio', label: 'Início', render: (c) => formatDate(c.inicio) },
            { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
            { key: 'actions', label: '', className: 'w-20', render: (c) => (
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-neutral-100"><Edit2 size={14} className="text-neutral-500" /></button>
                <button onClick={() => { if (confirm('Excluir?')) deleteMut.mutate(c.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
              </div>
            )},
          ]}
        />
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Contrato' : 'Novo Contrato'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate({ id: editing.id, d: form }) : createMut.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Cliente *</label>
            <select value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })} className="input" required>
              <option value="">Selecionar...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div><label className="label">Objeto / Descrição *</label><textarea value={form.objeto} onChange={e => setForm({ ...form, objeto: e.target.value })} className="input" rows={3} required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Valor (R$) *</label><input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })} className="input" required /></div>
            <div><label className="label">Início *</label><input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} className="input" required /></div>
            <div><label className="label">Fim</label><input type="date" value={form.fim} onChange={e => setForm({ ...form, fim: e.target.value })} className="input" /></div>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
              <option value="AGUARDANDO_ASSINATURA">Aguardando Assinatura</option>
              <option value="ATIVO">Ativo</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
