'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, Camera, DollarSign, Image, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Obra, Cliente } from '@/types';

// ── Image upload helper ───────────────────────────────────────
async function uploadImagem(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.url;
}

export default function ObrasPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Obra | null>(null);
  const [form, setForm] = useState({ nome: '', clienteId: '', endereco: '', status: 'ATIVA' });
  const [selected, setSelected] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'fotos' | 'medicoes'>('fotos');
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [medForm, setMedForm] = useState({ descricao: '', valor: '', data: '', status: 'pendente' });
  const [editingMed, setEditingMed] = useState<any | null>(null);

  const { data: obras = [], isLoading } = useQuery<Obra[]>({
    queryKey: ['obras'],
    queryFn: () => api.get('/topografia/obras').then(r => r.data),
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: () => api.get('/comercial/clientes').then(r => r.data),
  });

  const { data: obraDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['obra-detail', selected?.id],
    queryFn: () => api.get(`/topografia/obras/${selected!.id}`).then(r => r.data),
    enabled: !!selected,
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/topografia/obras', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['obras'] }); toast.success('Obra criada!'); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => api.patch(`/topografia/obras/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['obras'] }); toast.success('Obra atualizada!'); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/topografia/obras/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['obras'] }); setSelected(null); toast.success('Obra removida'); },
  });

  const removeFotoMut = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) => api.delete(`/topografia/obras/${id}/fotos`, { data: { url } }),
    onSuccess: () => refetchDetail(),
  });

  const createMedicaoMut = useMutation({
    mutationFn: (d: any) => editingMed
      ? api.patch(`/topografia/obras/medicoes/${editingMed.id}`, d)
      : api.post(`/topografia/obras/${selected!.id}/medicoes`, d),
    onSuccess: () => { refetchDetail(); setMedForm({ descricao: '', valor: '', data: '', status: 'pendente' }); setEditingMed(null); toast.success('Salvo!'); },
  });

  const deleteMedicaoMut = useMutation({
    mutationFn: (id: string) => api.delete(`/topografia/obras/medicoes/${id}`),
    onSuccess: () => { refetchDetail(); toast.success('Removido'); },
  });

  const openNew = () => { setEditing(null); setForm({ nome: '', clienteId: '', endereco: '', status: 'ATIVA' }); setShowModal(true); };
  const openEdit = (obra: Obra) => { setEditing(obra); setForm({ nome: obra.nome, clienteId: obra.clienteId, endereco: obra.endereco || '', status: obra.status }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };
  const openDetail = (obra: Obra) => { setSelected(obra); setActiveTab('fotos'); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateMut.mutate({ id: editing.id, d: form });
    else createMut.mutate(form);
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    setUploadingFoto(true);
    try {
      const url = await uploadImagem(file);
      await api.post(`/topografia/obras/${selected.id}/fotos`, { url });
      refetchDetail();
      toast.success('Foto adicionada!');
    } catch { toast.error('Erro ao enviar foto'); }
    finally { setUploadingFoto(false); e.target.value = ''; }
  };

  const handleMedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMedicaoMut.mutate({ ...medForm, valor: parseFloat(medForm.valor), data: new Date(medForm.data + 'T12:00:00') });
  };

  const medicoes: any[] = obraDetail?.medicoes || [];
  const totalMedido = medicoes.reduce((s: number, m: any) => s + m.valor, 0);
  const totalPago = medicoes.filter((m: any) => m.status === 'pago').reduce((s: number, m: any) => s + m.valor, 0);
  const saldo = totalMedido - totalPago;

  return (
    <div>
      <PageHeader title="Obras" actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nova Obra</button>} />

      <div className="card">
        <Table<Obra>
          loading={isLoading}
          data={obras}
          columns={[
            { key: 'nome', label: 'Nome da Obra', render: o => <button onClick={() => openDetail(o)} className="font-medium text-primary-800 hover:underline text-left">{o.nome}</button> },
            { key: 'cliente', label: 'Cliente', render: o => o.cliente?.nome || '-' },
            { key: 'endereco', label: 'Endereço', render: o => o.endereco || '-' },
            { key: 'status', label: 'Status', render: o => <StatusBadge status={o.status} /> },
            {
              key: 'actions', label: '', className: 'w-20',
              render: o => (
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); openEdit(o); }} className="p-1.5 rounded hover:bg-neutral-100"><Edit2 size={14} className="text-neutral-500" /></button>
                  <button onClick={e => { e.stopPropagation(); if (confirm('Excluir obra?')) deleteMut.mutate(o.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Modal criar/editar */}
      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Obra' : 'Nova Obra'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input" required /></div>
          <div><label className="label">Cliente *</label><select value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })} className="input" required><option value="">Selecionar...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div><label className="label">Endereço</label><input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} className="input" /></div>
          <div><label className="label">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input"><option value="ATIVA">Ativa</option><option value="PAUSADA">Pausada</option><option value="CONCLUIDA">Concluída</option></select></div>
          <div className="flex gap-3 justify-end pt-2"><button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
        </form>
      </Modal>

      {/* Drawer de detalhe */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-[520px] max-w-full h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header do drawer */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-neutral-900">{selected.nome}</h3>
                <p className="text-xs text-neutral-400">{selected.cliente?.nome}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-neutral-100"><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-100 flex-shrink-0">
              {[
                { key: 'fotos', label: 'Galeria de Fotos', icon: <Camera size={14} /> },
                { key: 'medicoes', label: 'Medições / Financeiro', icon: <DollarSign size={14} /> },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-primary-700 text-primary-800' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* ── FOTOS ─────────────────────────────────────── */}
              {activeTab === 'fotos' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-neutral-500">{obraDetail?.fotos?.length || 0} fotos</p>
                    <label className="btn-primary text-xs cursor-pointer">
                      {uploadingFoto ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Camera size={13} /> Adicionar Foto</>}
                      <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} disabled={uploadingFoto} />
                    </label>
                  </div>
                  {!obraDetail?.fotos?.length ? (
                    <div className="flex flex-col items-center justify-center py-16 text-neutral-300">
                      <Image size={48} className="mb-3" />
                      <p className="text-sm">Nenhuma foto ainda</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {obraDetail.fotos.map((url: string, i: number) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-neutral-100">
                          <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <button
                              onClick={() => { if (confirm('Remover foto?')) removeFotoMut.mutate({ id: selected.id, url }); }}
                              className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-1.5 rounded-lg transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── MEDIÇÕES ──────────────────────────────────── */}
              {activeTab === 'medicoes' && (
                <div>
                  {/* Resumo financeiro */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Total Medido', value: totalMedido, color: 'bg-blue-50 text-blue-800' },
                      { label: 'Total Pago', value: totalPago, color: 'bg-green-50 text-green-800' },
                      { label: 'A Receber', value: saldo, color: saldo > 0 ? 'bg-orange-50 text-orange-800' : 'bg-neutral-50 text-neutral-600' },
                    ].map(s => (
                      <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                        <p className="text-xs font-medium opacity-70">{s.label}</p>
                        <p className="text-sm font-bold mt-0.5">{formatCurrency(s.value)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Formulário nova medição */}
                  <form onSubmit={handleMedSubmit} className="card p-4 mb-4 space-y-3">
                    <p className="text-xs font-semibold text-neutral-500 uppercase">{editingMed ? 'Editar Medição' : 'Nova Medição'}</p>
                    <div><label className="label">Descrição *</label><input value={medForm.descricao} onChange={e => setMedForm({ ...medForm, descricao: e.target.value })} className="input" required placeholder="Ex: Medição parcial nº 1" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label">Valor (R$) *</label><input type="number" step="0.01" value={medForm.valor} onChange={e => setMedForm({ ...medForm, valor: e.target.value })} className="input" required /></div>
                      <div><label className="label">Data *</label><input type="date" value={medForm.data} onChange={e => setMedForm({ ...medForm, data: e.target.value })} className="input" required /></div>
                    </div>
                    <div><label className="label">Status</label>
                      <select value={medForm.status} onChange={e => setMedForm({ ...medForm, status: e.target.value })} className="input">
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      {editingMed && <button type="button" onClick={() => { setEditingMed(null); setMedForm({ descricao: '', valor: '', data: '', status: 'pendente' }); }} className="btn-secondary text-xs">Cancelar</button>}
                      <button type="submit" disabled={createMedicaoMut.isPending} className="btn-primary text-xs">{editingMed ? 'Atualizar' : 'Adicionar'}</button>
                    </div>
                  </form>

                  {/* Lista de medições */}
                  <div className="space-y-2">
                    {medicoes.length === 0 ? (
                      <p className="text-sm text-neutral-400 text-center py-6">Nenhuma medição registrada</p>
                    ) : medicoes.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50">
                        <div className={`p-1.5 rounded-lg ${m.status === 'pago' ? 'bg-green-100' : 'bg-orange-100'}`}>
                          {m.status === 'pago' ? <CheckCircle size={16} className="text-green-600" /> : <Clock size={16} className="text-orange-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{m.descricao}</p>
                          <p className="text-xs text-neutral-400">{formatDate(m.data)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-neutral-900">{formatCurrency(m.valor)}</p>
                          <span className={`text-xs font-medium ${m.status === 'pago' ? 'text-green-600' : 'text-orange-500'}`}>{m.status === 'pago' ? 'Pago' : 'Pendente'}</span>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => { setEditingMed(m); setMedForm({ descricao: m.descricao, valor: String(m.valor), data: m.data?.slice(0, 10) || '', status: m.status }); }} className="p-1 rounded hover:bg-neutral-100"><Edit2 size={13} className="text-neutral-400" /></button>
                          <button onClick={() => { if (confirm('Remover?')) deleteMedicaoMut.mutate(m.id); }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
