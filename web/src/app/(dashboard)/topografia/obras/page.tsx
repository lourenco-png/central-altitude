'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import toast from 'react-hot-toast';
import type { Obra, Cliente } from '@/types';

export default function ObrasPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Obra | null>(null);
  const [form, setForm] = useState({ nome: '', clienteId: '', endereco: '', status: 'ATIVA' });

  const { data: obras = [], isLoading } = useQuery<Obra[]>({
    queryKey: ['obras'],
    queryFn: () => api.get('/topografia/obras').then(r => r.data),
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: () => api.get('/comercial/clientes').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/topografia/obras', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['obras'] }); toast.success('Obra criada!'); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/topografia/obras/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['obras'] }); toast.success('Obra atualizada!'); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/topografia/obras/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['obras'] }); toast.success('Obra removida'); },
  });

  const openNew = () => { setEditing(null); setForm({ nome: '', clienteId: '', endereco: '', status: 'ATIVA' }); setShowModal(true); };
  const openEdit = (obra: Obra) => { setEditing(obra); setForm({ nome: obra.nome, clienteId: obra.clienteId, endereco: obra.endereco || '', status: obra.status }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div>
      <PageHeader
        title="Obras"
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nova Obra</button>}
      />
      <div className="card">
        <Table<Obra>
          loading={isLoading}
          data={obras}
          columns={[
            { key: 'nome', label: 'Nome da Obra' },
            { key: 'cliente', label: 'Cliente', render: (o) => o.cliente?.nome || '-' },
            { key: 'endereco', label: 'Endereço', render: (o) => o.endereco || '-' },
            { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
            {
              key: 'actions', label: '', className: 'w-20',
              render: (o) => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(o); }} className="p-1.5 rounded hover:bg-neutral-100"><Edit2 size={14} className="text-neutral-500" /></button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir obra?')) deleteMutation.mutate(o.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Obra' : 'Nova Obra'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Cliente *</label>
            <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="input" required>
              <option value="">Selecionar...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Endereço</label>
            <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
              <option value="ATIVA">Ativa</option>
              <option value="PAUSADA">Pausada</option>
              <option value="CONCLUIDA">Concluída</option>
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
