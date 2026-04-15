'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, ChevronRight, Shield, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { PdfUploadButton } from '@/components/ui/PdfUploadButton';
import { formatDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Funcionario, DocumentoFunc } from '@/types';

function docUrl(arquivo: string) {
  // Suporta URL absoluta (Cloudinary) ou relativa legada (/uploads/...)
  if (!arquivo) return '';
  if (arquivo.startsWith('http')) return arquivo;
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${arquivo}`;
}

function isExpiringSoon(validade?: string): boolean {
  if (!validade) return false;
  const diff = new Date(validade).getTime() - Date.now();
  return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
}

function isExpired(validade?: string): boolean {
  if (!validade) return false;
  return new Date(validade).getTime() < Date.now();
}

export default function FuncionariosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Funcionario | null>(null);
  const [selected, setSelected] = useState<Funcionario | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'docs' | 'epis'>('dados');
  const [form, setForm] = useState({ nome: '', cpf: '', cargo: '', setor: '', telefone: '', email: '', admissao: '', status: 'ATIVO' });
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ nome: '', emissao: '', validade: '', arquivo: '' });

  const { data: funcionarios = [], isLoading } = useQuery<Funcionario[]>({
    queryKey: ['funcionarios'],
    queryFn: () => api.get('/rh/funcionarios').then(r => r.data),
  });

  const { data: selectedFull, refetch: refetchSelected } = useQuery<Funcionario>({
    queryKey: ['funcionario', selected?.id],
    queryFn: () => api.get(`/rh/funcionarios/${selected!.id}`).then(r => r.data),
    enabled: !!selected,
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

  const addDocMut = useMutation({
    mutationFn: (d: any) => api.post(`/rh/funcionarios/${selected!.id}/documentos`, d),
    onSuccess: () => { refetchSelected(); toast.success('Documento adicionado!'); setShowDocForm(false); setDocForm({ nome: '', emissao: '', validade: '', arquivo: '' }); },
  });

  const removeDocMut = useMutation({
    mutationFn: (docId: string) => api.delete(`/rh/funcionarios/documentos/${docId}`),
    onSuccess: () => { refetchSelected(); toast.success('Documento removido'); },
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

  const docs: DocumentoFunc[] = selectedFull?.documentos ?? selected?.documentos ?? [];
  const epis = selectedFull?.epis ?? selected?.epis ?? [];

  const docsAlert = docs.filter(d => isExpiringSoon(d.validade) || isExpired(d.validade)).length;

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
          onRowClick={(f) => { setSelected(f); setActiveTab('dados'); }}
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
          <div className="relative bg-white w-[420px] h-full shadow-2xl flex flex-col">
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
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors relative ${activeTab === tab ? 'border-b-2 border-primary-700 text-primary-700' : 'text-neutral-500 hover:text-neutral-700'}`}>
                  {tab === 'dados' ? 'Dados' : tab === 'docs' ? 'Documentos' : 'EPIs'}
                  {tab === 'docs' && docsAlert > 0 && (
                    <span className="absolute top-1.5 right-3 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">{docsAlert}</span>
                  )}
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
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-neutral-700">Documentos</p>
                    <button onClick={() => setShowDocForm(v => !v)} className="btn-secondary text-xs py-1 px-2"><Plus size={12} /> Adicionar</button>
                  </div>

                  {showDocForm && (
                    <form onSubmit={(e) => { e.preventDefault(); addDocMut.mutate({ ...docForm, emissao: docForm.emissao || null, validade: docForm.validade || null, arquivo: docForm.arquivo || null }); }} className="bg-neutral-50 rounded-lg p-3 mb-3 space-y-2">
                      <div><label className="label text-xs">Nome do documento *</label><input value={docForm.nome} onChange={e => setDocForm({ ...docForm, nome: e.target.value })} className="input text-sm" required placeholder="Ex: ASO, CNH, Certidão..." /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="label text-xs">Emissão</label><input type="date" value={docForm.emissao} onChange={e => setDocForm({ ...docForm, emissao: e.target.value })} className="input text-sm" /></div>
                        <div><label className="label text-xs">Validade</label><input type="date" value={docForm.validade} onChange={e => setDocForm({ ...docForm, validade: e.target.value })} className="input text-sm" /></div>
                      </div>
                      <div>
                        <label className="label text-xs">Arquivo PDF</label>
                        <PdfUploadButton
                          currentUrl={docForm.arquivo}
                          onUploaded={(url) => setDocForm({ ...docForm, arquivo: url })}
                          onClear={() => setDocForm({ ...docForm, arquivo: '' })}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => { setShowDocForm(false); setDocForm({ nome: '', emissao: '', validade: '', arquivo: '' }); }} className="btn-secondary text-xs flex-1 justify-center">Cancelar</button>
                        <button type="submit" disabled={addDocMut.isPending} className="btn-primary text-xs flex-1 justify-center">Salvar</button>
                      </div>
                    </form>
                  )}

                  {docs.length === 0 ? (
                    <div className="text-center py-8"><FileText size={32} className="text-neutral-300 mx-auto mb-2" /><p className="text-sm text-neutral-400">Nenhum documento</p></div>
                  ) : (
                    <div className="space-y-2">
                      {docs.map((d) => {
                        const expired = isExpired(d.validade);
                        const expiring = isExpiringSoon(d.validade);
                        return (
                          <div key={d.id} className={`p-3 rounded-lg border text-sm flex items-start justify-between gap-2 ${expired ? 'bg-red-50 border-red-200' : expiring ? 'bg-orange-50 border-orange-200' : 'bg-neutral-50 border-neutral-200'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(expired || expiring) && <AlertTriangle size={12} className={expired ? 'text-red-500' : 'text-orange-500'} />}
                                <p className="font-medium truncate">{d.nome}</p>
                                {d.arquivo && (
                                  <a href={docUrl(d.arquivo!)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-primary-600 hover:underline">
                                    <ExternalLink size={11} /> Ver PDF
                                  </a>
                                )}
                              </div>
                              {d.emissao && <p className="text-xs text-neutral-400 mt-0.5">Emissão: {formatDate(d.emissao)}</p>}
                              {d.validade && (
                                <p className={`text-xs mt-0.5 ${expired ? 'text-red-600 font-medium' : expiring ? 'text-orange-600 font-medium' : 'text-neutral-400'}`}>
                                  Validade: {formatDate(d.validade)} {expired ? '(VENCIDO)' : expiring ? '(vence em breve)' : ''}
                                </p>
                              )}
                            </div>
                            <button onClick={() => { if (confirm('Remover documento?')) removeDocMut.mutate(d.id); }} className="p-1 rounded hover:bg-red-100 flex-shrink-0">
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'epis' && (
                <div>
                  {epis.length === 0 ? (
                    <div className="text-center py-8"><Shield size={32} className="text-neutral-300 mx-auto mb-2" /><p className="text-sm text-neutral-400">Nenhum EPI</p></div>
                  ) : (
                    epis.map((e) => (
                      <div key={e.id} className="p-3 rounded-lg bg-neutral-50 mb-2 text-sm">
                        <p className="font-medium">{e.descricao}</p>
                        {e.ca && <p className="text-xs text-neutral-400">CA: {e.ca}</p>}
                        {(e as any).dataEntrega && <p className="text-xs text-neutral-400">Entrega: {formatDate((e as any).dataEntrega)}</p>}
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
