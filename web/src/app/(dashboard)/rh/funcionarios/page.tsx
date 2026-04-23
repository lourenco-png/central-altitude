'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, ChevronRight, Shield, FileText, AlertTriangle, ExternalLink, Upload, Download, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { PdfUploadButton } from '@/components/ui/PdfUploadButton';
import { formatDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Funcionario, DocumentoFunc, Falta } from '@/types';

async function exportarHistoricoEPI(func: any, epis: any[]) {
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = () => resolve(); s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  const verde: [number,number,number] = [46, 125, 50];
  const verdeClaro: [number,number,number] = [200, 230, 201];
  const texto: [number,number,number] = [17, 24, 39];
  const sec: [number,number,number] = [107, 114, 128];
  const branco: [number,number,number] = [255, 255, 255];
  const fundo: [number,number,number] = [245, 245, 245];
  const borda: [number,number,number] = [229, 231, 235];

  const rect = (x: number, y: number, w: number, h: number, c: [number,number,number]) => { doc.setFillColor(...c); doc.rect(x, y, w, h, 'F'); };
  const text = (t: string, x: number, y: number, size = 10, bold = false, c: [number,number,number] = texto, align: 'left'|'center'|'right' = 'left') => {
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...c); doc.text(String(t || ''), x, y, { align });
  };

  rect(0, 0, W, 20, verde);
  text('ALTITUDE TOPOGRAFIA E ENGENHARIA LTDA', W / 2, 8, 12, true, branco, 'center');
  text('FICHA DE ENTREGA DE EPIs', W / 2, 15, 9, false, verdeClaro, 'center');

  let y = 25;
  rect(M, y, W - M * 2, 8, verdeClaro);
  text('FUNCIONÁRIO', M + 3, y + 5.5, 9, true, [27, 94, 32] as [number,number,number]);
  y += 11;
  rect(M, y, W - M * 2, 22, fundo);
  doc.setDrawColor(...borda); doc.rect(M, y, W - M * 2, 22, 'D');
  text('Nome:', M + 3, y + 6, 8, true, sec);  text(func.nome, M + 22, y + 6, 9);
  text('Cargo:', M + 3, y + 13, 8, true, sec); text(func.cargo, M + 22, y + 13, 9);
  text('Admissão:', M + 3, y + 20, 8, true, sec); text(func.admissao ? new Date(func.admissao).toLocaleDateString('pt-BR') : '—', M + 26, y + 20, 9);
  y += 26;

  rect(M, y, W - M * 2, 8, verde);
  text('HISTÓRICO DE EPIs', M + 3, y + 5.5, 9, true, branco);
  y += 11;

  rect(M, y, W - M * 2, 7, verdeClaro);
  text('Descrição', M + 3, y + 5, 8, true, [27, 94, 32] as [number,number,number]);
  text('CA', M + 90, y + 5, 8, true, [27, 94, 32] as [number,number,number]);
  text('Entrega', M + 120, y + 5, 8, true, [27, 94, 32] as [number,number,number]);
  text('Validade', M + 152, y + 5, 8, true, [27, 94, 32] as [number,number,number]);
  y += 9;

  epis.forEach((e: any, i: number) => {
    if (i % 2 === 1) rect(M, y - 1, W - M * 2, 8, fundo);
    text(e.descricao, M + 3, y + 4, 8, false, texto);
    text(e.ca || '—', M + 90, y + 4, 8, false, texto);
    text(e.dataEntrega ? new Date(e.dataEntrega).toLocaleDateString('pt-BR') : '—', M + 120, y + 4, 8, false, texto);
    text(e.validade ? new Date(e.validade).toLocaleDateString('pt-BR') : '—', M + 152, y + 4, 8, false, texto);
    y += 8;
  });

  y += 12;
  doc.setDrawColor(...borda); doc.line(M, y, M + 75, y);
  text('Assinatura do Funcionário', M + 37, y + 5, 8, false, sec, 'center');
  doc.line(W - M - 75, y, W - M, y);
  text('Responsável / Data', W - M - 37, y + 5, 8, false, sec, 'center');

  doc.setDrawColor(...verdeClaro); doc.line(M, 284, W - M, 284);
  text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · Central Altitude`, W / 2, 289, 7, false, sec, 'center');

  doc.save(`EPI_${func.nome.replace(/\s+/g, '_')}.pdf`);
}

function docUrl(arquivo?: string | null) {
  if (!arquivo) return '';
  if (arquivo.startsWith('http')) return arquivo;
  return `${process.env.NEXT_PUBLIC_API_URL || 'https://central-altitude.onrender.com'}${arquivo}`;
}

function isExpiringSoon(v?: string | null) {
  if (!v) return false;
  const diff = new Date(v).getTime() - Date.now();
  return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
}
function isExpired(v?: string | null) {
  return !!v && new Date(v).getTime() < Date.now();
}

const TIPO_FALTA_LABEL: Record<string, string> = {
  FALTA: 'Falta',
  ATRASO: 'Atraso',
  SAIDA_ANTECIPADA: 'Saída Antecipada',
};

const emptyDoc = { nome: '', emissao: '', validade: '', arquivo: '' };
const emptyFalta = { data: '', tipo: 'FALTA', justificada: false, motivo: '', observacao: '' };

export default function FuncionariosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Funcionario | null>(null);
  const [selected, setSelected] = useState<Funcionario | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'docs' | 'epis' | 'faltas'>('docs');
  const [form, setForm] = useState({ nome: '', cpf: '', cargo: '', setor: '', telefone: '', email: '', admissao: '', status: 'ATIVO' });
  const [docForm, setDocForm] = useState(emptyDoc);
  const [savingDoc, setSavingDoc] = useState(false);
  const [faltaForm, setFaltaForm] = useState<any>(emptyFalta);
  const [editingFalta, setEditingFalta] = useState<Falta | null>(null);
  const [showFaltaModal, setShowFaltaModal] = useState(false);

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
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao criar funcionário'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => api.patch(`/rh/funcionarios/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funcionarios'] }); toast.success('Atualizado!'); closeModal(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao atualizar funcionário'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rh/funcionarios/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funcionarios'] }); toast.success('Removido'); setSelected(null); },
  });

  const addDocMut = useMutation({
    mutationFn: (d: any) => api.post(`/rh/funcionarios/${selected!.id}/documentos`, d),
    onSuccess: () => {
      refetchSelected();
      qc.invalidateQueries({ queryKey: ['funcionarios'] });
      toast.success('Documento adicionado!');
      setDocForm(emptyDoc);
      setSavingDoc(false);
    },
    onError: () => { toast.error('Erro ao salvar documento'); setSavingDoc(false); },
  });

  const removeDocMut = useMutation({
    mutationFn: (docId: string) => api.delete(`/rh/funcionarios/documentos/${docId}`),
    onSuccess: () => { refetchSelected(); toast.success('Removido'); },
  });

  const addFaltaMut = useMutation({
    mutationFn: (d: any) => editingFalta
      ? api.patch(`/rh/faltas/${editingFalta.id}`, d)
      : api.post('/rh/faltas', { ...d, funcionarioId: selected!.id }),
    onSuccess: () => {
      refetchSelected();
      qc.invalidateQueries({ queryKey: ['faltas'] });
      toast.success(editingFalta ? 'Falta atualizada!' : 'Falta registrada!');
      setShowFaltaModal(false);
      setEditingFalta(null);
      setFaltaForm(emptyFalta);
    },
    onError: () => toast.error('Erro ao salvar falta'),
  });

  const removeFaltaMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rh/faltas/${id}`),
    onSuccess: () => { refetchSelected(); toast.success('Removido'); },
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

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.nome.trim()) { toast.error('Informe o nome do documento'); return; }
    setSavingDoc(true);
    addDocMut.mutate({
      nome: docForm.nome,
      emissao: docForm.emissao || null,
      validade: docForm.validade || null,
      arquivo: docForm.arquivo || null,
    });
  };

  const handleSaveFalta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faltaForm.data) { toast.error('Informe a data'); return; }
    addFaltaMut.mutate({
      data: faltaForm.data,
      tipo: faltaForm.tipo,
      justificada: faltaForm.justificada,
      motivo: faltaForm.motivo || null,
      observacao: faltaForm.observacao || null,
    });
  };

  const openEditFalta = (f: Falta) => {
    setEditingFalta(f);
    setFaltaForm({
      data: f.data.split('T')[0],
      tipo: f.tipo,
      justificada: f.justificada,
      motivo: f.motivo || '',
      observacao: f.observacao || '',
    });
    setShowFaltaModal(true);
  };

  const docs: DocumentoFunc[] = selectedFull?.documentos ?? selected?.documentos ?? [];
  const epis = selectedFull?.epis ?? selected?.epis ?? [];
  const faltas: Falta[] = selectedFull?.faltas ?? selected?.faltas ?? [];
  const docsAlert = docs.filter(d => isExpiringSoon(d.validade) || isExpired(d.validade)).length;
  const faltasNaoJust = faltas.filter(f => !f.justificada).length;

  const openDrawer = (f: Funcionario) => {
    setSelected(f);
    setActiveTab('docs');
    setDocForm(emptyDoc);
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

      {!selected && (
        <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-xl text-sm text-primary-700 flex items-center gap-2">
          <Upload size={15} />
          Clique em um funcionário para <strong className="ml-1">upload de documentos</strong>, gerenciar EPIs e registrar faltas.
        </div>
      )}

      <div className={selected ? 'card mr-[480px]' : 'card'}>
        <Table<Funcionario>
          loading={isLoading} data={funcionarios}
          onRowClick={openDrawer}
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
              key: 'documentos', label: 'Docs', className: 'w-20 text-center',
              render: (f) => {
                const count = (f as any)._count?.documentos ?? 0;
                return (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${count > 0 ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-400'}`}>
                    <FileText size={11} />{count}
                  </span>
                );
              }
            },
            {
              key: 'actions', label: '', className: 'w-24',
              render: (f) => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(f); }} className="p-1.5 rounded hover:bg-neutral-100"><Edit2 size={14} className="text-neutral-500" /></button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir funcionário?')) deleteMut.mutate(f.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
                  <ChevronRight size={16} className="text-neutral-300 self-center" />
                </div>
              )
            },
          ]}
        />
      </div>

      {/* ── Drawer ─────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-[460px] h-full shadow-2xl flex flex-col">

            {/* Header */}
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

            {/* Tabs */}
            <div className="flex border-b overflow-x-auto">
              {(['docs', 'dados', 'epis', 'faltas'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium relative transition-colors whitespace-nowrap px-2 ${activeTab === tab ? 'border-b-2 border-primary-700 text-primary-700' : 'text-neutral-500 hover:text-neutral-700'}`}>
                  {tab === 'dados' ? 'Dados' : tab === 'docs' ? 'Documentos' : tab === 'epis' ? 'EPIs' : 'Faltas'}
                  {tab === 'docs' && docsAlert > 0 && (
                    <span className="absolute top-1.5 right-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">{docsAlert}</span>
                  )}
                  {tab === 'faltas' && faltasNaoJust > 0 && (
                    <span className="absolute top-1.5 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{faltasNaoJust}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Documentos ── */}
              {activeTab === 'docs' && (
                <div className="p-4 space-y-4">
                  <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-primary-800 mb-3 flex items-center gap-1.5">
                      <Upload size={14} /> Adicionar Documento
                    </p>
                    <form onSubmit={handleSaveDoc} className="space-y-3">
                      <div>
                        <label className="label text-xs">Nome do documento *</label>
                        <input
                          value={docForm.nome}
                          onChange={e => setDocForm({ ...docForm, nome: e.target.value })}
                          className="input text-sm"
                          placeholder="Ex: ASO, CNH, Certidão Negativa..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-xs">Emissão</label>
                          <input type="date" value={docForm.emissao} onChange={e => setDocForm({ ...docForm, emissao: e.target.value })} className="input text-sm" />
                        </div>
                        <div>
                          <label className="label text-xs">Validade</label>
                          <input type="date" value={docForm.validade} onChange={e => setDocForm({ ...docForm, validade: e.target.value })} className="input text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="label text-xs">Arquivo (PDF, Word, Excel, Imagem)</label>
                        <PdfUploadButton
                          currentUrl={docForm.arquivo}
                          onUploaded={(url: string) => setDocForm(prev => ({ ...prev, arquivo: url }))}
                          onClear={() => setDocForm(prev => ({ ...prev, arquivo: '' }))}
                          label="Selecionar arquivo"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={savingDoc || addDocMut.isPending}
                        className="btn-primary w-full justify-center text-sm"
                      >
                        {savingDoc || addDocMut.isPending ? 'Salvando...' : 'Salvar Documento'}
                      </button>
                    </form>
                  </div>

                  {docs.length === 0 ? (
                    <div className="text-center py-4">
                      <FileText size={28} className="text-neutral-300 mx-auto mb-2" />
                      <p className="text-sm text-neutral-400">Nenhum documento cadastrado ainda.</p>
                      <p className="text-xs text-neutral-300 mt-1">Use o formulário acima para adicionar.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Documentos cadastrados ({docs.length})</p>
                      {docs.map((d) => {
                        const expired = isExpired(d.validade);
                        const expiring = isExpiringSoon(d.validade);
                        return (
                          <div key={d.id} className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${expired ? 'bg-red-50 border-red-200' : expiring ? 'bg-orange-50 border-orange-200' : 'bg-neutral-50 border-neutral-200'}`}>
                            <FileText size={15} className={`flex-shrink-0 mt-0.5 ${expired ? 'text-red-400' : expiring ? 'text-orange-400' : 'text-neutral-400'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(expired || expiring) && <AlertTriangle size={12} className={expired ? 'text-red-500' : 'text-orange-500'} />}
                                <p className="font-medium">{d.nome}</p>
                                {d.arquivo && (
                                  <a href={docUrl(d.arquivo)} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-[11px] text-primary-600 hover:underline font-medium">
                                    <ExternalLink size={11} /> Ver arquivo
                                  </a>
                                )}
                              </div>
                              {d.emissao && <p className="text-xs text-neutral-400 mt-0.5">Emissão: {formatDate(d.emissao)}</p>}
                              {d.validade && (
                                <p className={`text-xs mt-0.5 ${expired ? 'text-red-600 font-medium' : expiring ? 'text-orange-600 font-medium' : 'text-neutral-400'}`}>
                                  Validade: {formatDate(d.validade)}{expired ? ' — VENCIDO' : expiring ? ' — vence em breve' : ''}
                                </p>
                              )}
                            </div>
                            <button onClick={() => { if (confirm('Remover documento?')) removeDocMut.mutate(d.id); }}
                              className="p-1 rounded hover:bg-red-100 flex-shrink-0">
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Dados ── */}
              {activeTab === 'dados' && (
                <div className="p-6 space-y-3 text-sm">
                  <div><p className="text-neutral-400 text-xs">CPF</p><p>{selected.cpf}</p></div>
                  <div><p className="text-neutral-400 text-xs">Cargo</p><p>{selected.cargo}</p></div>
                  <div><p className="text-neutral-400 text-xs">Setor</p><p>{selected.setor || '-'}</p></div>
                  <div><p className="text-neutral-400 text-xs">Admissão</p><p>{formatDate(selected.admissao)}</p></div>
                  <div><p className="text-neutral-400 text-xs">Telefone</p><p>{selected.telefone || '-'}</p></div>
                  <div><p className="text-neutral-400 text-xs">E-mail</p><p>{selected.email || '-'}</p></div>
                  <div><p className="text-neutral-400 text-xs">Status</p><div className="mt-1"><StatusBadge status={selected.status} /></div></div>
                  <div className="pt-2">
                    <button onClick={() => openEdit(selected)} className="btn-secondary text-xs w-full justify-center">
                      <Edit2 size={13} /> Editar dados
                    </button>
                  </div>
                </div>
              )}

              {/* ── EPIs ── */}
              {activeTab === 'epis' && (
                <div className="p-6">
                  {epis.length > 0 && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => exportarHistoricoEPI(selected, epis)}
                        className="btn-secondary text-xs"
                      >
                        <Download size={13} /> Exportar Histórico PDF
                      </button>
                    </div>
                  )}
                  {epis.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield size={32} className="text-neutral-300 mx-auto mb-2" />
                      <p className="text-sm text-neutral-400">Nenhum EPI cadastrado</p>
                      <p className="text-xs text-neutral-300 mt-1">Cadastre EPIs na página de EPIs do menu RH.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {epis.map((e) => (
                        <div key={e.id} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-sm">
                          <p className="font-medium">{e.descricao}</p>
                          {e.ca && <p className="text-xs text-neutral-400">CA: {e.ca}</p>}
                          {(e as any).dataEntrega && <p className="text-xs text-neutral-400">Entrega: {formatDate((e as any).dataEntrega)}</p>}
                          {e.validade && <p className="text-xs text-neutral-400">Validade: {formatDate(e.validade)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Faltas ── */}
              {activeTab === 'faltas' && (
                <div className="p-4 space-y-4">
                  {/* Resumo */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-neutral-800">{faltas.length}</p>
                      <p className="text-xs text-neutral-500">Total</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{faltasNaoJust}</p>
                      <p className="text-xs text-red-500">Não justif.</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{faltas.filter(f => f.justificada).length}</p>
                      <p className="text-xs text-green-500">Justif.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => { setEditingFalta(null); setFaltaForm(emptyFalta); setShowFaltaModal(true); }}
                    className="btn-primary w-full justify-center text-sm"
                  >
                    <Plus size={14} /> Registrar Falta/Atraso
                  </button>

                  {faltas.length === 0 ? (
                    <div className="text-center py-6">
                      <UserX size={28} className="text-neutral-300 mx-auto mb-2" />
                      <p className="text-sm text-neutral-400">Nenhuma ocorrência registrada.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {faltas.map((f) => (
                        <div key={f.id} className={`p-3 rounded-lg border text-sm ${!f.justificada ? 'bg-red-50 border-red-200' : 'bg-neutral-50 border-neutral-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${f.tipo === 'FALTA' ? 'bg-red-100 text-red-700' : f.tipo === 'ATRASO' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {TIPO_FALTA_LABEL[f.tipo]}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${f.justificada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {f.justificada ? 'Justificada' : 'Não justificada'}
                                </span>
                                <span className="text-xs text-neutral-500">{formatDate(f.data)}</span>
                              </div>
                              {f.motivo && <p className="text-xs text-neutral-600 mt-1">Motivo: {f.motivo}</p>}
                              {f.observacao && <p className="text-xs text-neutral-400 mt-0.5">{f.observacao}</p>}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => openEditFalta(f)} className="p-1 rounded hover:bg-neutral-200">
                                <Edit2 size={12} className="text-neutral-500" />
                              </button>
                              <button onClick={() => { if (confirm('Remover?')) removeFaltaMut.mutate(f.id); }} className="p-1 rounded hover:bg-red-100">
                                <Trash2 size={12} className="text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar funcionário */}
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
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                <option value="ATIVO">Ativo</option>
                <option value="AFASTADO">Afastado</option>
                <option value="DEMITIDO">Demitido</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>

      {/* Modal registrar/editar falta */}
      <Modal open={showFaltaModal} onClose={() => { setShowFaltaModal(false); setEditingFalta(null); setFaltaForm(emptyFalta); }} title={editingFalta ? 'Editar Ocorrência' : 'Registrar Falta/Atraso'} size="md">
        <form onSubmit={handleSaveFalta} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data *</label>
              <input type="date" value={faltaForm.data} onChange={e => setFaltaForm({ ...faltaForm, data: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select value={faltaForm.tipo} onChange={e => setFaltaForm({ ...faltaForm, tipo: e.target.value })} className="input">
                <option value="FALTA">Falta</option>
                <option value="ATRASO">Atraso</option>
                <option value="SAIDA_ANTECIPADA">Saída Antecipada</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Justificada?</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="justificada" checked={!faltaForm.justificada} onChange={() => setFaltaForm({ ...faltaForm, justificada: false })} />
                Não justificada
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="justificada" checked={faltaForm.justificada} onChange={() => setFaltaForm({ ...faltaForm, justificada: true })} />
                Justificada
              </label>
            </div>
          </div>
          <div>
            <label className="label">Motivo</label>
            <input value={faltaForm.motivo} onChange={e => setFaltaForm({ ...faltaForm, motivo: e.target.value })} className="input" placeholder="Ex: Atestado médico, emergência..." />
          </div>
          <div>
            <label className="label">Observação</label>
            <textarea value={faltaForm.observacao} onChange={e => setFaltaForm({ ...faltaForm, observacao: e.target.value })} className="input resize-none" rows={2} placeholder="Observações adicionais..." />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setShowFaltaModal(false); setEditingFalta(null); setFaltaForm(emptyFalta); }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={addFaltaMut.isPending} className="btn-primary">
              {addFaltaMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
