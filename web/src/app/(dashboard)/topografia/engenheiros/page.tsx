'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import type { Engenheiro } from '@/types';

export default function EngenheirosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Engenheiro | null>(null);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', ativo: true });

  const { data = [], isLoading } = useQuery<Engenheiro[]>({
    queryKey: ['engenheiros'],
    queryFn: () => api.get('/topografia/engenheiros').then(r => r.data),
  });

  const createMut = useMutation({ mutationFn: (d: any) => api.post('/topografia/engenheiros', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['engenheiros'] }); toast.success('Engenheiro criado!'); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: any) => api.patch(`/topografia/engenheiros/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['engenheiros'] }); toast.success('Atualizado!'); closeModal(); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.delete(`/topografia/engenheiros/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['engenheiros'] }); toast.success('Removido'); } });

  const openEdit = (e: Engenheiro) => { setEditing(e); setForm({ nome: e.nome, telefone: e.telefone || '', email: e.email || '', ativo: e.ativo }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };
  const handleSubmit = (ev: React.FormEvent) => { ev.preventDefault(); editing ? updateMut.mutate({ id: editing.id, d: form }) : createMut.mutate(form); };

  return (
    <div>
      <PageHeader title="Engenheiros" actions={<button onClick={() => { setEditing(null); setForm({ nome: '', telefone: '', email: '', ativo: true }); setShowModal(true); }} className="btn-primary"><Plus size={16} /> Novo Engenheiro</button>} />
      <div className="card">
        <Table<Engenheiro>
          loading={isLoading} data={data}
          columns={[
            { key: 'nome', label: 'Nome' },
            { key: 'telefone', label: 'Telefone', render: (e) => e.telefone || '-' },
            { key: 'email', label: 'E-mail', render: (e) => e.email || '-' },
            { key: 'ativo', label: 'Status', render: (e) => e.ativo ? <span className="badge-green"><CheckCircle size={12} /> Ativo</span> : <span className="badge-red"><XCircle size={12} /> Inativo</span> },
            { key: 'actions', label: '', className: 'w-20', render: (e) => (
              <div className="flex gap-1">
                <button onClick={() => openEdit(e)} className="p-1.5 rounded hover:bg-neutral-100"><Edit2 size={14} className="text-neutral-500" /></button>
                <button onClick={() => { if (confirm('Excluir?')) deleteMut.mutate(e.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
              </div>
            )},
          ]}
        />
      </div>
      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Engenheiro' : 'Novo Engenheiro'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input" required /></div>
          <div><label className="label">Telefone</label><input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="input" /></div>
          <div><label className="label">E-mail</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
