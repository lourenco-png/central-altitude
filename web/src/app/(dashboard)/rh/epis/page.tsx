'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { formatDate, getEpiStatus } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { EPI, Funcionario } from '@/types';

export default function EpisPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ funcionarioId: '', descricao: '', ca: '', validade: '' });
  const [filter, setFilter] = useState('');

  const { data: epis = [], isLoading } = useQuery<EPI[]>({
    queryKey: ['epis'],
    queryFn: () => api.get('/rh/epis').then(r => r.data),
  });

  const { data: funcionarios = [] } = useQuery<Funcionario[]>({
    queryKey: ['funcionarios'],
    queryFn: () => api.get('/rh/funcionarios').then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/rh/epis', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epis'] }); toast.success('EPI criado!'); setShowModal(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rh/epis/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epis'] }); toast.success('Removido'); },
  });

  const filtered = epis.filter((e) =>
    !filter ||
    e.descricao.toLowerCase().includes(filter.toLowerCase()) ||
    e.funcionario?.nome.toLowerCase().includes(filter.toLowerCase())
  );

  const episCriticos = epis.filter((e) => e.validade && getEpiStatus(e.validade).color === 'red').length;

  return (
    <div>
      <PageHeader
        title="EPIs"
        subtitle={episCriticos > 0 ? `${episCriticos} EPI(s) com vencimento crítico` : undefined}
        actions={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Novo EPI</button>}
      />

      {episCriticos > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={20} className="text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800 font-medium">{episCriticos} EPI(s) vencendo em até 7 dias. Verifique e renove.</p>
        </div>
      )}

      <div className="card">
        <div className="px-4 py-3 border-b border-neutral-100">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Buscar por EPI ou funcionário..."
            className="input max-w-sm"
          />
        </div>
        <Table<EPI>
          loading={isLoading} data={filtered}
          columns={[
            { key: 'funcionario', label: 'Funcionário', render: (e) => e.funcionario?.nome || '-' },
            { key: 'descricao', label: 'EPI' },
            { key: 'ca', label: 'CA Nº', render: (e) => e.ca || '-' },
            {
              key: 'validade', label: 'Validade',
              render: (e) => {
                if (!e.validade) return <span className="text-neutral-400">-</span>;
                const st = getEpiStatus(e.validade);
                const colorMap: Record<string, string> = { green: 'badge-green', orange: 'badge-orange', red: 'badge-red', gray: 'badge-gray' };
                return (
                  <div>
                    <p className="text-sm">{formatDate(e.validade)}</p>
                    <span className={colorMap[st.color]}>{st.label}</span>
                  </div>
                );
              }
            },
            {
              key: 'actions', label: '', className: 'w-16',
              render: (e) => (
                <button onClick={() => { if (confirm('Excluir EPI?')) deleteMut.mutate(e.id); }} className="p-1.5 rounded hover:bg-red-50">
                  <Trash2 size={14} className="text-red-500" />
                </button>
              )
            },
          ]}
        />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo EPI">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate({ ...form, validade: form.validade ? new Date(form.validade) : null }); }} className="space-y-4">
          <div>
            <label className="label">Funcionário *</label>
            <select value={form.funcionarioId} onChange={e => setForm({ ...form, funcionarioId: e.target.value })} className="input" required>
              <option value="">Selecionar...</option>
              {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div><label className="label">Descrição *</label><input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="input" required placeholder="Ex: Capacete de Segurança" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">CA Nº</label><input value={form.ca} onChange={e => setForm({ ...form, ca: e.target.value })} className="input" /></div>
            <div><label className="label">Validade</label><input type="date" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} className="input" /></div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
