'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, UserX, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Falta, Funcionario } from '@/types';

const TIPO_LABEL: Record<string, string> = {
  FALTA: 'Falta',
  ATRASO: 'Atraso',
  SAIDA_ANTECIPADA: 'Saída Antecipada',
};

const TIPO_COLOR: Record<string, string> = {
  FALTA: 'bg-red-100 text-red-700',
  ATRASO: 'bg-orange-100 text-orange-700',
  SAIDA_ANTECIPADA: 'bg-yellow-100 text-yellow-700',
};

const emptyForm = {
  funcionarioId: '',
  data: '',
  tipo: 'FALTA',
  justificada: false,
  motivo: '',
  observacao: '',
};

export default function FaltasPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Falta | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroJustificada, setFiltroJustificada] = useState('');

  const { data: faltas = [], isLoading } = useQuery<Falta[]>({
    queryKey: ['faltas', filtroFuncionario, filtroMes],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtroFuncionario) params.set('funcionarioId', filtroFuncionario);
      if (filtroMes) params.set('mes', filtroMes);
      return api.get(`/rh/faltas?${params}`).then(r => r.data);
    },
  });

  const { data: funcionarios = [] } = useQuery<Funcionario[]>({
    queryKey: ['funcionarios'],
    queryFn: () => api.get('/rh/funcionarios').then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => editing
      ? api.patch(`/rh/faltas/${editing.id}`, d)
      : api.post('/rh/faltas', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faltas'] });
      toast.success(editing ? 'Atualizado!' : 'Falta registrada!');
      closeModal();
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rh/faltas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faltas'] }); toast.success('Removido'); },
  });

  const openEdit = (f: Falta) => {
    setEditing(f);
    setForm({
      funcionarioId: f.funcionarioId,
      data: f.data.split('T')[0],
      tipo: f.tipo,
      justificada: f.justificada,
      motivo: f.motivo || '',
      observacao: f.observacao || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.funcionarioId) { toast.error('Selecione o funcionário'); return; }
    if (!form.data) { toast.error('Informe a data'); return; }
    createMut.mutate({
      funcionarioId: form.funcionarioId,
      data: form.data,
      tipo: form.tipo,
      justificada: form.justificada,
      motivo: form.motivo || null,
      observacao: form.observacao || null,
    });
  };

  // Filtros locais
  const faltasFiltradas = faltas.filter(f => {
    if (filtroTipo && f.tipo !== filtroTipo) return false;
    if (filtroJustificada === 'sim' && !f.justificada) return false;
    if (filtroJustificada === 'nao' && f.justificada) return false;
    return true;
  });

  // Stats
  const totalFaltas = faltasFiltradas.filter(f => f.tipo === 'FALTA').length;
  const totalAtrasos = faltasFiltradas.filter(f => f.tipo === 'ATRASO').length;
  const totalSaidas = faltasFiltradas.filter(f => f.tipo === 'SAIDA_ANTECIPADA').length;
  const totalNaoJust = faltasFiltradas.filter(f => !f.justificada).length;

  // Mes atual como padrão para filtro
  const mesAtual = new Date().toISOString().slice(0, 7);

  return (
    <div>
      <PageHeader
        title="Controle de Faltas"
        subtitle="Registro de faltas, atrasos e saídas antecipadas"
        actions={
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true); }} className="btn-primary">
            <Plus size={16} /> Registrar Ocorrência
          </button>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <UserX size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalFaltas}</p>
              <p className="text-xs text-neutral-500">Faltas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalAtrasos}</p>
              <p className="text-xs text-neutral-500">Atrasos</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={18} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalSaidas}</p>
              <p className="text-xs text-neutral-500">Saídas Antec.</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={18} className="text-neutral-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalNaoJust}</p>
              <p className="text-xs text-neutral-500">Não Justificadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label text-xs">Funcionário</label>
            <select value={filtroFuncionario} onChange={e => setFiltroFuncionario(e.target.value)} className="input text-sm">
              <option value="">Todos</option>
              {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Mês</label>
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="input text-sm" placeholder={mesAtual} />
          </div>
          <div>
            <label className="label text-xs">Tipo</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input text-sm">
              <option value="">Todos</option>
              <option value="FALTA">Falta</option>
              <option value="ATRASO">Atraso</option>
              <option value="SAIDA_ANTECIPADA">Saída Antecipada</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Justificada</label>
            <select value={filtroJustificada} onChange={e => setFiltroJustificada(e.target.value)} className="input text-sm">
              <option value="">Todas</option>
              <option value="sim">Justificada</option>
              <option value="nao">Não justificada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <p className="text-center py-10 text-neutral-400">Carregando...</p>
        ) : faltasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <UserX size={40} className="text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">Nenhuma ocorrência encontrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Funcionário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Motivo</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {faltasFiltradas.map((f) => (
                <tr key={f.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{f.funcionario?.nome || '—'}</p>
                      <p className="text-xs text-neutral-400">{f.funcionario?.cargo}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(f.data)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLOR[f.tipo]}`}>
                      {TIPO_LABEL[f.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {f.justificada ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <CheckCircle size={12} /> Justificada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle size={12} /> Não justificada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 max-w-[200px] truncate">{f.motivo || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(f)} className="p-1.5 rounded hover:bg-neutral-100">
                        <Edit2 size={14} className="text-neutral-500" />
                      </button>
                      <button onClick={() => { if (confirm('Excluir ocorrência?')) deleteMut.mutate(f.id); }} className="p-1.5 rounded hover:bg-red-50">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Ocorrência' : 'Registrar Falta/Atraso'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Funcionário *</label>
            <select
              value={form.funcionarioId}
              onChange={e => setForm({ ...form, funcionarioId: e.target.value })}
              className="input"
              required
              disabled={!!editing}
            >
              <option value="">Selecione...</option>
              {funcionarios
                .filter(f => f.status === 'ATIVO' || f.status === 'AFASTADO')
                .map(f => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)
              }
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data *</label>
              <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input">
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
                <input type="radio" name="justificada" checked={!form.justificada} onChange={() => setForm({ ...form, justificada: false })} />
                Não justificada
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="justificada" checked={form.justificada} onChange={() => setForm({ ...form, justificada: true })} />
                Justificada
              </label>
            </div>
          </div>
          <div>
            <label className="label">Motivo</label>
            <input
              value={form.motivo}
              onChange={e => setForm({ ...form, motivo: e.target.value })}
              className="input"
              placeholder="Ex: Atestado médico, emergência familiar..."
            />
          </div>
          <div>
            <label className="label">Observação</label>
            <textarea
              value={form.observacao}
              onChange={e => setForm({ ...form, observacao: e.target.value })}
              className="input resize-none"
              rows={2}
              placeholder="Observações adicionais..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createMut.isPending} className="btn-primary">
              {createMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
