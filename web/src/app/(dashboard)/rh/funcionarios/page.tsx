'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, ChevronRight, Shield, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { formatDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Funcionario } from '@/types';

export default function FuncionariosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Funcionario | null>(null);
  const [selected, setSelected] = useState<Funcionario | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'docs' | 'epis'>('dados');
  const [form, setForm] = useState({ nome: '', cpf: '', cargo: '', setor: '', telefone: '', email: '', admissao: '', status: 'ATIVO' });

  const { data: funcionarios = [], isLoading } = useQuery<Funcionario[]>({
    queryKey: ['funcionarios'],
    queryFn: () => api.get('/rh/funcionarios').then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/rh/funcionarios', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funcionarios'] }); toast.success('Funcionário criado!'); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => api.patch(`/rh/funcionarios/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funcionarios'] }); toast.success('Atualizado!'); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rh/funcionarios/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funcionarios'] }); toast.success('Removido'); },
  });

  const openEdit = (f: Funcionario) => {
    setEditing(f);
    setForm({ nome: f.nome, cpf: f.cpf, cargo: f.cargo, setor: f.setor || '', telefone: f.telefone || '', email: f.email || '', admissao: f.admissao.split('T')[0], status: f.status });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editing ? updateMut.mutate({ id: editing.id, d: form }) : createMut.mutate(form);
  };

  return (
    <div>
      <PageHeader
        title="Funcionários"
        actions={
          <button onClick={() => { setEditing(null); setForm({ nome: '', cpf: '', cargo: '', setor: '', telefone: '', email: '', admissao: '', status: 'ATIVO' }); setShowModal(true); }} className="btn-primary">
            <Plus size={16} /> Novo Funcionário
          </button>
        }
      />

      <div className="card">
        <Table<Funcionario>
          loading={isLoading} data={funcionarios}
          onRowClick={(f) => setSelected(f)}
          columns={[
            {
              key: 'nome', label: 'Nome',
              render: (f) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">{getInitials(f.nome)}</div>
                  <span className="font-medium">{f.nome}</span>
                </div>
              )
            },
            { key: 'cargo', label: 'Cargo' },
            { key: 'setor', label: 'Setor', render: (f) => f.setor || '-' },
            { key: 'admissao', label: 'Admissão', render: (f) => formatDate(f.admissao) },
            { key: 'status', label: 'Status', render: (f) => <StatusBadge status={f.status} /> },
            {
              key: 'actions', label: '', className: 'w-24',
              render: (f) => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(f); }} className="p-1.5 rounded hover:bg-neutral-100"><Edit2 size={14} className="text-neutral-500" /></button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir?')) deleteMut.mutate(f.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
                  <ChevronRight size={16} className="text-neutral-300 self-center" />
                </div>
              )
            },
          ]}
        />
      </div>

      {/* Drawer funcionário */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-96 h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700">{getInitials(selected.nome)}</div>
                <div>
                  <p className="font-semibold">{selected.nome}</p>
                  <p className="text-xs text-neutral-500">{selected.cargo}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-neutral-100"><X size={18} /></button>
            </div>
            <div className="flex border-b">
              {(['dados', 'docs', 'epis'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-primary-700 text-primary-700' : 'text-neutral-500 hover:text-neutral-700'}`}>
                  {tab === 'dados' ? 'Dados' : tab === 'docs' ? 'Documentos' : 'EPIs'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'dados' && (
                <div className="space-y-3 text-sm">
                  <div><p className="text-neutral-400 text-xs">CPF</p><p>{selected.cpf}</p></div>
                  <div><p className="text-neutral-400 text-xs">Cargo</p><p>{selected.cargo}</p></div>
                  <div><p className="text-neutral-400 text-xs">Setor</p><p>{selected.setor || '-'}</p></div>
                  <div><p className="text-neutral-400 text-xs">Admissão</p><p>{formatDate(selected.admissao)}</p></div>
                  <div><p className="text-neutral-400 text-xs">Telefone</p><p>{selected.telefone || '-'}</p></div>
                  <div><p className="text-neutral-400 text-xs">E-mail</p><p>{selected.email || '-'}</p></div>
                  <div><p className="text-neutral-400 text-xs">Status</p><div className="mt-1"><StatusBadge status={selected.status} /></div></div>
                </div>
              )}
              {activeTab === 'docs' && (
                <div>
                  {!selected.documentos || selected.documentos.length === 0 ? (
                    <div className="text-center py-8"><FileText size={32} className="text-neutral-300 mx-auto mb-2" /><p className="text-sm text-neutral-400">Nenhum documento</p></div>
                  ) : (
                    selected.documentos.map((d) => (
                      <div key={d.id} className="p-3 rounded-lg bg-neutral-50 mb-2 text-sm">
                        <p className="font-medium">{d.nome}</p>
                        {d.validade && <p className="text-xs text-neutral-400">Validade: {formatDate(d.validade)}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
              {activeTab === 'epis' && (
                <div>
                  {!selected.epis || selected.epis.length === 0 ? (
                    <div className="text-center py-8"><Shield size={32} className="text-neutral-300 mx-auto mb-2" /><p className="text-sm text-neutral-400">Nenhum EPI</p></div>
                  ) : (
                    selected.epis.map((e) => (
                      <div key={e.id} className="p-3 rounded-lg bg-neutral-50 mb-2 text-sm">
                        <p className="font-medium">{e.descricao}</p>
                        {e.ca && <p className="text-xs text-neutral-400">CA: {e.ca}</p>}
                        {e.validade && <p className="text-xs text-neutral-400">Validade: {formatDate(e.validade)}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Funcionário' : 'Novo Funcionário'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input" required /></div>
            <div><label className="label">CPF *</label><input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} className="input" required /></div>
            <div><label className="label">Cargo *</label><input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} className="input" required /></div>
            <div><label className="label">Setor</label><input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} className="input" /></div>
            <div><label className="label">Telefone</label><input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="input" /></div>
            <div><label className="label">E-mail</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" /></div>
            <div><label className="label">Admissão *</label><input type="date" value={form.admissao} onChange={e => setForm({ ...form, admissao: e.target.value })} className="input" required /></div>
            <div><label className="label">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input"><option value="ATIVO">Ativo</option><option value="AFASTADO">Afastado</option><option value="DEMITIDO">Demitido</option></select></div>
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
