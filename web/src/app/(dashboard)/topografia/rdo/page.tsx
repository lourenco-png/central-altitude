'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Send, PenTool, CheckCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { RDO, Obra } from '@/types';

export default function RdoPage() {
  const qc = useQueryClient();
  const [selectedRdo, setSelectedRdo] = useState<RDO | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showAssinar, setShowAssinar] = useState(false);
  const [sigEmail, setSigEmail] = useState('');
  const [sigNome, setSigNome] = useState('');
  const [form, setForm] = useState({ obraId: '', data: '', clima: '', atividades: '', observacoes: '' });

  const { data: rdos = [], isLoading } = useQuery<RDO[]>({
    queryKey: ['rdos'],
    queryFn: () => api.get('/topografia/rdo').then(r => r.data),
  });

  const { data: obras = [] } = useQuery<Obra[]>({ queryKey: ['obras'], queryFn: () => api.get('/topografia/obras').then(r => r.data) });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/topografia/rdo', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rdos'] }); toast.success('RDO criado!'); setShowNew(false); },
  });

  const assinarMut = useMutation({
    mutationFn: (rdoId: string) => api.post(`/topografia/rdo/${rdoId}/assinar`, { token: 'auto' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rdos'] }); toast.success('Assinado com sucesso!'); },
  });

  const enviarMut = useMutation({
    mutationFn: ({ rdoId, dest }: any) => api.post(`/topografia/rdo/${rdoId}/enviar-assinatura`, { destinatarios: [{ nome: dest.nome, email: dest.email }] }),
    onSuccess: () => { toast.success('Enviado para assinatura!'); setShowAssinar(false); },
  });

  const pdfMut = useMutation({
    mutationFn: async (rdoId: string) => {
      const res = await api.get(`/topografia/rdo/${rdoId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `rdo-${rdoId}.pdf`; a.click();
    },
  });

  return (
    <div>
      <PageHeader
        title="Relatório Diário de Obra (RDO)"
        actions={<button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={16} /> Novo RDO</button>}
      />

      {isLoading ? (
        <p className="text-neutral-400 text-center py-12">Carregando...</p>
      ) : rdos.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-400">Nenhum RDO cadastrado</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rdos.map((rdo) => {
            const totalAssin = rdo.assinaturas.length;
            const assinadas = rdo.assinaturas.filter((a) => a.assinado).length;
            return (
              <div
                key={rdo.id}
                className="card p-5 cursor-pointer hover:border-primary-300 transition-colors"
                onClick={() => setSelectedRdo(rdo)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{rdo.obra?.nome}</h3>
                    <p className="text-sm text-neutral-500 mt-0.5">{formatDate(rdo.data)} {rdo.clima && `· ${rdo.clima}`}</p>
                    {rdo.atividades && <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{rdo.atividades}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-neutral-500">Assinaturas</p>
                    <p className="text-sm font-semibold text-neutral-800">{assinadas}/{totalAssin}</p>
                    {totalAssin > 0 && assinadas === totalAssin && (
                      <span className="badge-green mt-1"><CheckCircle size={10} /> Completo</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RDO Detail */}
      {selectedRdo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedRdo(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">RDO — {selectedRdo.obra?.nome}</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowAssinar(true)} className="btn-secondary text-xs"><Send size={13} /> Enviar para Assinatura</button>
                <button onClick={() => assinarMut.mutate(selectedRdo.id)} className="btn-primary text-xs"><PenTool size={13} /> Assinar</button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-neutral-400 text-xs">Data</p><p className="font-medium">{formatDate(selectedRdo.data)}</p></div>
                <div><p className="text-neutral-400 text-xs">Clima</p><p className="font-medium">{selectedRdo.clima || '-'}</p></div>
              </div>

              {selectedRdo.atividades && (
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase mb-1">Atividades Realizadas</p>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{selectedRdo.atividades}</p>
                </div>
              )}

              {selectedRdo.observacoes && (
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase mb-1">Observações</p>
                  <p className="text-sm text-neutral-700">{selectedRdo.observacoes}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">Status de Assinatura</p>
                <div className="space-y-2">
                  {selectedRdo.assinaturas.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 text-sm">
                      <div>
                        <p className="font-medium">{a.nome}</p>
                        <p className="text-xs text-neutral-400">{a.email}</p>
                      </div>
                      {a.assinado ? (
                        <div className="text-right">
                          <span className="badge-green"><CheckCircle size={10} /> Assinado</span>
                          {a.assinadoEm && <p className="text-xs text-neutral-400 mt-0.5">{formatDateTime(a.assinadoEm)}</p>}
                        </div>
                      ) : (
                        <span className="badge-orange"><Clock size={10} /> Aguardando</span>
                      )}
                    </div>
                  ))}
                  {selectedRdo.assinaturas.length === 0 && (
                    <p className="text-sm text-neutral-400">Nenhuma assinatura solicitada</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Novo RDO */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Novo RDO" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Obra *</label>
            <select value={form.obraId} onChange={e => setForm({ ...form, obraId: e.target.value })} className="input" required>
              <option value="">Selecionar...</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Data *</label><input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="input" required /></div>
            <div><label className="label">Clima</label><input value={form.clima} onChange={e => setForm({ ...form, clima: e.target.value })} className="input" placeholder="Ensolarado..." /></div>
          </div>
          <div><label className="label">Atividades Realizadas</label><textarea value={form.atividades} onChange={e => setForm({ ...form, atividades: e.target.value })} className="input" rows={4} /></div>
          <div><label className="label">Observações</label><textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="input" rows={3} /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Criar RDO</button>
          </div>
        </form>
      </Modal>

      {/* Enviar para assinatura */}
      <Modal open={showAssinar} onClose={() => setShowAssinar(false)} title="Enviar para Assinatura" size="sm">
        <div className="space-y-4">
          <div><label className="label">Nome do destinatário</label><input value={sigNome} onChange={e => setSigNome(e.target.value)} className="input" /></div>
          <div><label className="label">E-mail</label><input type="email" value={sigEmail} onChange={e => setSigEmail(e.target.value)} className="input" /></div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowAssinar(false)} className="btn-secondary">Cancelar</button>
            <button onClick={() => selectedRdo && enviarMut.mutate({ rdoId: selectedRdo.id, dest: { nome: sigNome, email: sigEmail } })} className="btn-primary">Enviar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
