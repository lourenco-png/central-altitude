'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Solicitacao, Obra, Engenheiro } from '@/types';

export default function SolicitacoesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Solicitacao | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ obraId: '', engenheiroId: '', data: '', horario: '08:00', status: 'AGENDADO', servico: '', observacoes: '' });

  const { data = [], isLoading } = useQuery<Solicitacao[]>({
    queryKey: ['solicitacoes', statusFilter],
    queryFn: () => api.get(`/topografia/solicitacoes${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });

  const { data: obras = [] } = useQuery<Obra[]>({ queryKey: ['obras'], queryFn: () => api.get('/topografia/obras').then(r => r.data) });
  const { data: engenheiros = [] } = useQuery<Engenheiro[]>({ queryKey: ['engenheiros'], queryFn: () => api.get('/topografia/engenheiros').then(r => r.data) });

  const createMut = useMutation({ mutationFn: (d: any) => api.post('/topografia/solicitacoes', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitacoes'] }); toast.success('Criado!'); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: any) => api.patch(`/topografia/solicitacoes/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitacoes'] }); toast.success('Atualizado!'); closeModal(); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.delete(`/topografia/solicitacoes/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitacoes'] }); toast.success('Removido'); } });

  const openEdit = (s: Solicitacao) => {
    setEditing(s);
    const dt = new Date(s.data);
    setForm({ obraId: s.obraId, engenheiroId: s.engenheiroId, data: format(dt, 'yyyy-MM-dd'), horario: format(dt, 'HH:mm'), status: s.status, servico: (s as any).servico || '', observacoes: s.observacoes || '' });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new Date(`${form.data}T${form.horario}:00`);
    const d = { obraId: form.obraId, engenheiroId: form.engenheiroId, data, status: form.status, servico: form.servico || null, observacoes: form.observacoes };
    editing ? updateMut.mutate({ id: editing.id, d }) : createMut.mutate(d);
  };

  return (
    <div>
      <PageHeader
        title="Solicitações de Topografia"
        actions={<button onClick={() => { setEditing(null); setForm({ obraId: '', engenheiroId: '', data: '', horario: '08:00', status: 'AGENDADO', observacoes: '' }); setShowModal(true); }} className="btn-primary"><Plus size={16} /> Nova Solicitação</button>}
      />
      <div className="card">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
          <span className="text-sm text-neutral-500">Filtrar:</span>
          {['', 'AGENDADO', 'CONCLUIDO', 'CANCELADO'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
              {s || 'Todos'}
            </button>
          ))}
        </div>
        <Table<Solicitacao>
          loading={isLoading} data={data}
          columns={[
            { key: 'obra', label: 'Obra', render: (s) => s.obra?.nome || '-' },
            { key: 'engenheiro', label: 'Engenheiro', render: (s) => s.engenheiro?.nome || '-' },
            { key: 'servico', label: 'Serviço', render: (s) => <span className="line-clamp-1">{(s as any).servico || '-'}</span> },
            { key: 'data', label: 'Data/Hora', render: (s) => `${formatDate(s.data)} ${format(new Date(s.data), 'HH:mm')}` },
            { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            { key: 'observacoes', label: 'Observações', render: (s) => <span className="text-neutral-500 line-clamp-1">{s.observacoes || '-'}</span> },
            { key: 'actions', label: '', className: 'w-20', render: (s) => (
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-neutral-100"><Edit2 size={14} className="text-neutral-500" /></button>
                <button onClick={() => { if (confirm('Excluir?')) deleteMut.mutate(s.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
              </div>
            )},
          ]}
        />
      </div>
      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Solicitação' : 'Nova Solicitação'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Obra *</label><select value={form.obraId} onChange={e => setForm({ ...form, obraId: e.target.value })} className="input" required><option value="">Selecionar...</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div>
          <div><label className="label">Engenheiro *</label><select value={form.engenheiroId} onChange={e => setForm({ ...form, engenheiroId: e.target.value })} className="input" required><option value="">Selecionar...</option>{engenheiros.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
          <div><label className="label">Serviço *</label><input type="text" value={form.servico} onChange={e => setForm({ ...form, servico: e.target.value })} className="input" placeholder="Ex: Levantamento planialtimétrico, Locação de obra..." required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Data *</label><input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="input" required /></div>
            <div><label className="label">Horário</label><input type="time" value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input"><option value="AGENDADO">Agendado</option><option value="CONCLUIDO">Concluído</option><option value="CANCELADO">Cancelado</option></select></div>
          <div><label className="label">Observações</label><textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="input" rows={3} /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
