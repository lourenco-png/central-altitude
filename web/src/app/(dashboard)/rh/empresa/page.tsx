'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import type { Empresa } from '@/types';

export default function EmpresaPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' });
  const [showSocio, setShowSocio] = useState(false);
  const [socioForm, setSocioForm] = useState({ nome: '', cpf: '', cargo: '' });

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
  });

  const addSocioMut = useMutation({
    mutationFn: (d: any) => api.post('/rh/empresa/socios', { ...d, empresaId: empresa?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresa'] }); toast.success('Sócio adicionado!'); setShowSocio(false); },
  });

  const removeSocioMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rh/empresa/socios/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresa'] }); toast.success('Sócio removido'); },
  });

  return (
    <div>
      <PageHeader title="Empresa" />

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
            <button type="submit" className="btn-primary"><Save size={15} /> Salvar</button>
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
                    <p className="text-xs text-neutral-400">{s.cargo || '-'} {s.cpf && `· CPF: ${s.cpf}`}</p>
                  </div>
                  <button onClick={() => removeSocioMut.mutate(s.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-500" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={showSocio} onClose={() => setShowSocio(false)} title="Adicionar Sócio" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); addSocioMut.mutate(socioForm); }} className="space-y-4">
          <div><label className="label">Nome *</label><input value={socioForm.nome} onChange={e => setSocioForm({ ...socioForm, nome: e.target.value })} className="input" required /></div>
          <div><label className="label">CPF</label><input value={socioForm.cpf} onChange={e => setSocioForm({ ...socioForm, cpf: e.target.value })} className="input" /></div>
          <div><label className="label">Cargo</label><input value={socioForm.cargo} onChange={e => setSocioForm({ ...socioForm, cargo: e.target.value })} className="input" /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowSocio(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
