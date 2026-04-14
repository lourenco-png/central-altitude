'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import type { Ferias, Funcionario } from '@/types';

export default function FeriasPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ funcionarioId: '', inicio: '', fim: '', dias: 30, status: 'PENDENTE' });

  const { data: ferias = [], isLoading } = useQuery<Ferias[]>({
    queryKey: ['ferias'],
    queryFn: () => api.get('/rh/ferias').then(r => r.data),
  });

  const { data: funcionarios = [] } = useQuery<Funcionario[]>({
    queryKey: ['funcionarios'],
    queryFn: () => api.get('/rh/funcionarios').then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/rh/ferias', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ferias'] }); toast.success('Férias agendadas!'); setShowModal(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/rh/ferias/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ferias'] }); toast.success('Status atualizado!'); },
  });

  const calcDias = (inicio: string, fim: string) => {
    if (!inicio || !fim) return 0;
    return differenceInDays(new Date(fim), new Date(inicio)) + 1;
  };

  return (
    <div>
      <PageHeader
        title="Férias"
        actions={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Agendar Férias</button>}
      />

      <div className="card">
        <Table<Ferias>
          loading={isLoading} data={ferias}
          columns={[
            { key: 'funcionario', label: 'Funcionário', render: (f) => f.funcionario?.nome || '-' },
            { key: 'inicio', label: 'Início', render: (f) => formatDate(f.inicio) },
            { key: 'fim', label: 'Fim', render: (f) => formatDate(f.fim) },
            { key: 'dias', label: 'Dias' },
            { key: 'status', label: 'Status', render: (f) => <StatusBadge status={f.status} /> },
            {
              key: 'actions', label: 'Ações', className: 'w-32',
              render: (f) => f.status === 'PENDENTE' ? (
                <div className="flex gap-1">
                  <button onClick={() => updateMut.mutate({ id: f.id, status: 'APROVADO' })} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Aprovar"><Check size={14} /></button>
                  <button onClick={() => updateMut.mutate({ id: f.id, status: 'REJEITADO' })} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Rejeitar"><X size={14} /></button>
                </div>
              ) : null
            },
          ]}
        />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Agendar Férias">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Funcionário *</label>
            <select value={form.funcionarioId} onChange={e => setForm({ ...form, funcionarioId: e.target.value })} className="input" required>
              <option value="">Selecionar...</option>
              {funcionarios.filter(f => f.status === 'ATIVO').map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Início *</label>
              <input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value, dias: calcDias(e.target.value, form.fim) })} className="input" required />
            </div>
            <div>
              <label className="label">Fim *</label>
              <input type="date" value={form.fim} onChange={e => setForm({ ...form, fim: e.target.value, dias: calcDias(form.inicio, e.target.value) })} className="input" required />
            </div>
          </div>
          {form.dias > 0 && <p className="text-sm text-neutral-500">Total: <strong>{form.dias} dias</strong></p>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Agendar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
