'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import type { Cliente } from '@/types';

export default function ClientesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ nome: '', cnpj: '', email: '', telefone: '', cidade: '' });

  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ['clientes', search],
    queryFn: () => api.get(`/comercial/clientes?search=${search}`).then(r => r.data),
  });

  const createMut = useMutation({ mutationFn: (d: any) => api.post('/comercial/clientes', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast.success('Cliente criado!'); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: any) => api.patch(`/comercial/clientes/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast.success('Atualizado!'); closeModal(); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.delete(`/comercial/clientes/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast.success('Removido'); } });

  const openEdit = (c: Cliente) => { setEditing(c); setForm({ nome: c.nome, cnpj: c.cnpj || '', email: c.email || '', telefone: c.telefone || '', cidade: c.cidade || '' }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); editing ? updateMut.mutate({ id: editing.id, d: form }) : createMut.mutate(form); };

  return (
    <div>
      <PageHeader title="Clientes" actions={<button onClick={() => { setEditing(null); setForm({ nome: '', cnpj: '', email: '', telefone: '', cidade: '' }); setShowModal(true); }} className="btn-primary"><Plus size={16} /> Novo Cliente</button>} />

      <div className="card">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
          <Search size={16} className="text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar clientes..." className="input border-0 shadow-none p-0 focus:ring-0" />
        </div>
        <Table<Cliente>
          loading={isLoading} data={clientes}
          columns={[
            { key: 'nome', label: 'Nome', render: (c) => <span className="font-medium">{c.nome}</span> },
            { key: 'cnpj', label: 'CNPJ', render: (c) => c.cnpj || '-' },
            { key: 'cidade', label: 'Cidade', render: (c) => c.cidade || '-' },
            { key: 'email', label: 'E-mail', render: (c) => c.email || '-' },
            { key: '_count', label: 'Contratos', render: (c) => c._count?.contratos || 0 },
            { key: 'actions', label: '', className: 'w-20', render: (c) => (
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-neutral-100"><Edit2 size={14} className="text-neutral-500" /></button>
                <button onClick={() => { if (confirm('Excluir cliente?')) deleteMut.mutate(c.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
              </div>
            )},
          ]}
        />
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Cliente' : 'Novo Cliente'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input" required /></div>
          <div><label className="label">CNPJ</label><input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">E-mail</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" /></div>
            <div><label className="label">Telefone</label><input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">Cidade</label><input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} className="input" /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
