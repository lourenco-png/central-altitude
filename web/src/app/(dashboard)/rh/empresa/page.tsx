'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2, Building2, FileText, AlertTriangle, ExternalLink, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { PdfUploadButton } from '@/components/ui/PdfUploadButton';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Empresa } from '@/types';

function docUrl(arquivo?: string | null) {
  if (!arquivo) return '';
  if (arquivo.startsWith('http')) return arquivo;
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${arquivo}`;
}

function isExpired(v?: string | null) { return !!v && new Date(v).getTime() < Date.now(); }
function isExpiringSoon(v?: string | null) {
  if (!v) return false;
  const diff = new Date(v).getTime() - Date.now();
  return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
}

const emptyDoc = { nome: '', validade: '', arquivo: '' };

export default function EmpresaPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' });
  const [showSocio, setShowSocio] = useState(false);
  const [socioForm, setSocioForm] = useState({ nome: '', cpf: '', cargo: '' });
  const [docForm, setDocForm] = useState(emptyDoc);

  const { data: empresa } = useQuery<Empresa | null>({
    queryKey: ['empresa'],
    queryFn: () => api.get('/rh/empresa').then(r => r.data),
  });

  useEffect(() => {
    if (empresa) setForm({ nome: empresa.nome, cnpj: empresa.cnpj, endereco: empresa.endereco || '', telefone: empresa.telefone || '', email: empresa.email || '' });
  }, [empresa]);

  const saveMut = useMutation({
    mutationFn: (d: any) => api.put('/rh/empresa', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresa'] }); toast.success('Dados salvos!'); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao salvar dados da empresa'),
  });

  const addSocioMut = useMutation({
    mutationFn: (d: any) => api.post('/rh/empresa/socios', { ...d, empresaId: empresa?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresa'] }); toast.success('Sócio adicionado!'); setShowSocio(false); setSocioForm({ nome: '', cpf: '', cargo: '' }); },
  });

  const removeSocioMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rh/empresa/socios/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresa'] }); toast.success('Sócio removido'); },
  });

  const addDocMut = useMutation({
    mutationFn: (d: any) => api.post('/rh/empresa/documentos', { ...d, empresaId: empresa?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresa'] }); toast.success('Documento adicionado!'); setDocForm(emptyDoc); },
    onError: () => toast.error('Erro ao salvar documento'),
  });

  const removeDocMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rh/empresa/documentos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresa'] }); toast.success('Removido'); },
  });

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.nome.trim()) { toast.error('Informe o nome do documento'); return; }
    addDocMut.mutate({ nome: docForm.nome, validade: docForm.validade || null, arquivo: docForm.arquivo || null });
  };

  const docsAlert = (empresa?.documentos ?? []).filter(d => isExpired(d.validade) || isExpiringSoon(d.validade)).length;

  return (
    <div>
      <PageHeader title="Empresa" />

      {docsAlert > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={20} className="text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800 font-medium">{docsAlert} documento(s) com validade vencida ou próxima.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Dados gerais */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 size={18} className="text-primary-700" /> Dados Gerais</h3>
          <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-4">
            <div><label className="label">Razão Social *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input" required /></div>
            <div><label className="label">CNPJ *</label><input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="input" required /></div>
            <div><label className="label">Endereço</label><input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Telefone</label><input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="input" /></div>
              <div><label className="label">E-mail</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" /></div>
            </div>
            <button type="submit" disabled={saveMut.isPending} className="btn-primary"><Save size={15} /> Salvar</button>
          </form>
        </div>

        {/* Sócios */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Sócios / Diretoria</h3>
            <button onClick={() => setShowSocio(true)} className="btn-secondary text-xs"><Plus size={13} /> Adicionar</button>
          </div>
          {!empresa?.socios || empresa.socios.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">Nenhum sócio cadastrado</p>
          ) : (
            <div className="space-y-2">
              {empresa.socios.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                  <div>
                    <p className="text-sm font-medium">{s.nome}</p>
                    <p className="text-xs text-neutral-400">{s.cargo || '-'}{s.cpf ? ` · CPF: ${s.cpf}` : ''}</p>
                  </div>
                  <button onClick={() => removeSocioMut.mutate(s.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-500" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Documentos da Empresa ── */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary-700" /> Documentos da Empresa
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Formulário de upload — SEMPRE VISÍVEL */}
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-primary-800 mb-3 flex items-center gap-1.5">
                <Upload size={14} /> Adicionar Documento
              </p>
              <form onSubmit={handleSaveDoc} className="space-y-3">
                <div>
                  <label className="label text-sm">Nome do Documento *</label>
                  <input
                    value={docForm.nome}
                    onChange={e => setDocForm({ ...docForm, nome: e.target.value })}
                    className="input"
                    placeholder="Ex: Alvará, Licença, Certidão..."
                  />
                </div>
                <div>
                  <label className="label text-sm">Validade</label>
                  <input type="date" value={docForm.validade} onChange={e => setDocForm({ ...docForm, validade: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label text-sm">Arquivo PDF</label>
                  <PdfUploadButton
                    currentUrl={docForm.arquivo}
                    onUploaded={(url) => setDocForm({ ...docForm, arquivo: url })}
                    onClear={() => setDocForm({ ...docForm, arquivo: '' })}
                  />
                </div>
                <button type="submit" disabled={addDocMut.isPending} className="btn-primary w-full justify-center">
                  {addDocMut.isPending ? 'Salvando...' : 'Salvar Documento'}
                </button>
              </form>
            </div>

            {/* Lista de documentos */}
            <div>
              {!empresa?.documentos || empresa.documentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-neutral-400">
                  <FileText size={36} className="mb-2 text-neutral-300" />
                  <p className="text-sm">Nenhum documento cadastrado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {empresa.documentos.map((d) => {
                    const expired = isExpired(d.validade);
                    const expiring = isExpiringSoon(d.validade);
                    return (
                      <div key={d.id} className={`p-3 rounded-lg border flex items-start gap-2 ${expired ? 'bg-red-50 border-red-200' : expiring ? 'bg-orange-50 border-orange-200' : 'bg-neutral-50 border-neutral-200'}`}>
                        <FileText size={15} className={`flex-shrink-0 mt-0.5 ${expired ? 'text-red-400' : expiring ? 'text-orange-400' : 'text-neutral-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(expired || expiring) && <AlertTriangle size={12} className={expired ? 'text-red-500' : 'text-orange-500'} />}
                            <p className="text-sm font-medium">{d.nome}</p>
                            {d.arquivo && (
                              <a href={docUrl(d.arquivo)} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[11px] text-primary-600 hover:underline font-medium">
                                <ExternalLink size={11} /> Ver PDF
                              </a>
                            )}
                          </div>
                          {d.validade && (
                            <p className={`text-xs mt-0.5 ${expired ? 'text-red-600 font-medium' : expiring ? 'text-orange-600 font-medium' : 'text-neutral-400'}`}>
                              Validade: {formatDate(d.validade)}{expired ? ' — VENCIDO' : expiring ? ' — vence em breve' : ''}
                            </p>
                          )}
                        </div>
                        <button onClick={() => { if (confirm('Remover?')) removeDocMut.mutate(d.id); }}
                          className="p-1 rounded hover:bg-red-100 flex-shrink-0">
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Modal sócio */}
      <Modal open={showSocio} onClose={() => setShowSocio(false)} title="Adicionar Sócio" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); addSocioMut.mutate(socioForm); }} className="space-y-4">
          <div><label className="label">Nome *</label><input value={socioForm.nome} onChange={e => setSocioForm({ ...socioForm, nome: e.target.value })} className="input" required /></div>
          <div><label className="label">CPF</label><input value={socioForm.cpf} onChange={e => setSocioForm({ ...socioForm, cpf: e.target.value })} className="input" /></div>
          <div><label className="label">Cargo</label><input value={socioForm.cargo} onChange={e => setSocioForm({ ...socioForm, cargo: e.target.value })} className="input" /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowSocio(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={addSocioMut.isPending} className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
