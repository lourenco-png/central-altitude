'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ShieldAlert, Ban, UserX, CheckCircle2, Clock,
  Plus, FileText, ChevronRight, Eye, Pencil, Trash2, Download,
  TriangleAlert, Flame, ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { AcaoDisciplinar, FuncionarioDisciplinar, NivelRisco, Falta } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  ADVERTENCIA_VERBAL: 'Advertência Verbal',
  ADVERTENCIA_ESCRITA: 'Advertência Escrita',
  SUSPENSAO: 'Suspensão',
  JUSTA_CAUSA: 'Justa Causa',
  CARTA_ABANDONO: 'Carta de Abandono',
};

const TIPO_COR: Record<string, string> = {
  ADVERTENCIA_VERBAL: 'bg-yellow-100 text-yellow-800',
  ADVERTENCIA_ESCRITA: 'bg-yellow-200 text-yellow-900',
  SUSPENSAO: 'bg-orange-100 text-orange-800',
  JUSTA_CAUSA: 'bg-red-100 text-red-800',
  CARTA_ABANDONO: 'bg-purple-100 text-purple-800',
};

const NIVEL_CONFIG: Record<NivelRisco, { label: string; cor: string; icon: React.ReactNode }> = {
  OK: { label: 'Regular', cor: 'bg-green-100 text-green-800', icon: <CheckCircle2 size={14} /> },
  ADVERTENCIA: { label: 'Advertência', cor: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle size={14} /> },
  SUSPENSAO: { label: 'Suspensão', cor: 'bg-orange-100 text-orange-800', icon: <ShieldAlert size={14} /> },
  RISCO_JUSTA_CAUSA: { label: 'Risco Justa Causa', cor: 'bg-red-100 text-red-700', icon: <Flame size={14} /> },
  JUSTA_CAUSA: { label: 'Justa Causa', cor: 'bg-red-200 text-red-900', icon: <Ban size={14} /> },
  ABANDONO_POSSIVEL: { label: 'Poss. Abandono', cor: 'bg-purple-100 text-purple-800', icon: <UserX size={14} /> },
};

const ASSN_CONFIG: Record<string, { label: string; cor: string }> = {
  PENDENTE: { label: 'Pendente', cor: 'bg-orange-100 text-orange-700' },
  ASSINADO: { label: 'Assinado', cor: 'bg-green-100 text-green-700' },
  RECUSADO: { label: 'Recusado', cor: 'bg-red-100 text-red-700' },
};

function NivelBadge({ nivel }: { nivel: NivelRisco }) {
  const c = NIVEL_CONFIG[nivel] || NIVEL_CONFIG.OK;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.cor}`}>
      {c.icon}{c.label}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COR[tipo] || 'bg-gray-100 text-gray-700'}`}>
      {TIPO_LABEL[tipo] || tipo}
    </span>
  );
}

// ── Formulário vazio ──────────────────────────────────────────────────────────

const emptyForm = {
  funcionarioId: '',
  tipo: 'ADVERTENCIA_VERBAL',
  data: new Date().toISOString().slice(0, 10),
  motivo: '',
  diasSuspensao: '',
  faltasVinculadas: [] as string[],
  observacao: '',
  overrideJustificativa: '',
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function DisciplinarPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'dashboard' | 'acoes'>('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AcaoDisciplinar | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [viewFunc, setViewFunc] = useState<FuncionarioDisciplinar | null>(null);
  const [showAssinarModal, setShowAssinarModal] = useState<AcaoDisciplinar | null>(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [faltasFuncId, setFaltasFuncId] = useState<string>('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: dashboard, isLoading: loadingDash } = useQuery<{
    totais: { advertencias: number; suspensoes: number; riscoJustaCausa: number; abandonoPossivel: number };
    funcionariosEmAlerta: FuncionarioDisciplinar[];
    todos: FuncionarioDisciplinar[];
  }>({
    queryKey: ['disciplinar-dashboard'],
    queryFn: () => api.get('/rh/disciplinar/dashboard').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: acoes = [], isLoading: loadingAcoes } = useQuery<AcaoDisciplinar[]>({
    queryKey: ['disciplinar-acoes', filtroTipo, filtroStatus],
    queryFn: () => api.get('/rh/disciplinar', { params: { tipo: filtroTipo || undefined, status: filtroStatus || undefined } }).then(r => r.data),
  });

  const { data: faltasFunc = [] } = useQuery<Falta[]>({
    queryKey: ['faltas-func', faltasFuncId],
    queryFn: () => faltasFuncId ? api.get('/rh/faltas', { params: { funcionarioId: faltasFuncId } }).then(r => r.data) : Promise.resolve([]),
    enabled: !!faltasFuncId,
  });

  const { data: sugestao } = useQuery<{ tipo: string; diasSuspensao?: number; mensagem: string } | null>({
    queryKey: ['disciplinar-sugestao', form.funcionarioId],
    queryFn: () => form.funcionarioId ? api.get(`/rh/disciplinar/sugestao/${form.funcionarioId}`).then(r => r.data) : Promise.resolve(null),
    enabled: !!form.funcionarioId && showModal,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (d: any) => editing
      ? api.patch(`/rh/disciplinar/${editing.id}`, d)
      : api.post('/rh/disciplinar', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinar-dashboard'] });
      qc.invalidateQueries({ queryKey: ['disciplinar-acoes'] });
      toast.success(editing ? 'Ação atualizada!' : 'Ação disciplinar registrada!');
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao salvar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rh/disciplinar/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinar-dashboard'] });
      qc.invalidateQueries({ queryKey: ['disciplinar-acoes'] });
      toast.success('Ação removida!');
    },
  });

  const assinarMut = useMutation({
    mutationFn: ({ id, doc }: { id: string; doc?: string }) =>
      api.patch(`/rh/disciplinar/${id}/assinar`, { documentoAssinado: doc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinar-dashboard'] });
      qc.invalidateQueries({ queryKey: ['disciplinar-acoes'] });
      toast.success('Marcado como assinado!');
      setShowAssinarModal(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: AcaoDisciplinar) => {
    setEditing(a);
    setForm({
      funcionarioId: a.funcionarioId,
      tipo: a.tipo,
      data: a.data.split('T')[0],
      motivo: a.motivo,
      diasSuspensao: a.diasSuspensao ? String(a.diasSuspensao) : '',
      faltasVinculadas: a.faltasVinculadas || [],
      observacao: a.observacao || '',
      overrideJustificativa: a.overrideJustificativa || '',
    });
    setFaltasFuncId(a.funcionarioId);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    setFaltasFuncId('');
  };

  const handleFuncChange = (id: string) => {
    setForm(f => ({ ...f, funcionarioId: id, faltasVinculadas: [] }));
    setFaltasFuncId(id);
  };

  const handleTipoChange = (tipo: string) => {
    setForm(f => ({ ...f, tipo, diasSuspensao: tipo === 'SUSPENSAO' ? '3' : '' }));
  };

  const toggleFalta = (id: string) => {
    setForm(f => ({
      ...f,
      faltasVinculadas: f.faltasVinculadas.includes(id)
        ? f.faltasVinculadas.filter(x => x !== id)
        : [...f.faltasVinculadas, id],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.funcionarioId) { toast.error('Selecione o funcionário'); return; }
    if (!form.motivo.trim()) { toast.error('Informe o motivo'); return; }
    createMut.mutate({
      ...form,
      diasSuspensao: form.diasSuspensao ? Number(form.diasSuspensao) : undefined,
    });
  };

  const gerarPdf = (id: string) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/rh/disciplinar/${id}/pdf`, '_blank');
  };

  // ── Dados agrupados ────────────────────────────────────────────────────────

  const todosFunc = dashboard?.todos || [];
  const emAlerta = dashboard?.funcionariosEmAlerta || [];
  const totais = dashboard?.totais || { advertencias: 0, suspensoes: 0, riscoJustaCausa: 0, abandonoPossivel: 0 };

  const faltasNaoPunidasFunc = useMemo(
    () => faltasFunc.filter(f => !f.justificada && !f.punida),
    [faltasFunc]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Gestão Disciplinar"
        subtitle="Controle e histórico disciplinar de funcionários"
        actions={
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} /> Nova Ação Disciplinar
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Advertências Ativas"
          value={totais.advertencias}
          icon={<AlertTriangle size={20} className="text-yellow-600" />}
          cor="bg-yellow-50"
          onClick={() => setTab('dashboard')}
        />
        <KpiCard
          label="Suspensos"
          value={totais.suspensoes}
          icon={<ShieldAlert size={20} className="text-orange-600" />}
          cor="bg-orange-50"
          onClick={() => setTab('dashboard')}
        />
        <KpiCard
          label="Risco Justa Causa"
          value={totais.riscoJustaCausa}
          icon={<Flame size={20} className="text-red-600" />}
          cor="bg-red-50"
          onClick={() => setTab('dashboard')}
        />
        <KpiCard
          label="Poss. Abandono"
          value={totais.abandonoPossivel}
          icon={<UserX size={20} className="text-purple-600" />}
          cor="bg-purple-50"
          onClick={() => setTab('dashboard')}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-neutral-200">
        {([['dashboard', 'Painel de Alertas'], ['acoes', 'Histórico de Ações']] as [string, string][]).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === v
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── Tab: Dashboard ── */}
      {tab === 'dashboard' && (
        <div className="card">
          {loadingDash ? (
            <p className="text-center py-10 text-neutral-400">Carregando...</p>
          ) : emAlerta.length === 0 ? (
            <div className="py-14 text-center text-neutral-400">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
              <p className="font-medium">Nenhum funcionário em alerta</p>
              <p className="text-sm mt-1">Todos os registros estão regulares.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {emAlerta.map((item) => (
                <FuncAlertaRow
                  key={item.funcionario.id}
                  item={item}
                  onVerDetalhes={() => setViewFunc(item)}
                  onNovaAcao={() => {
                    setEditing(null);
                    setForm({ ...emptyForm, funcionarioId: item.funcionario.id, tipo: item.sugestao?.tipo || 'ADVERTENCIA_VERBAL' });
                    setFaltasFuncId(item.funcionario.id);
                    setShowModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Histórico ── */}
      {tab === 'acoes' && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input w-48">
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="input w-44">
              <option value="">Todos os status</option>
              <option value="PENDENTE">Pendente assinatura</option>
              <option value="ASSINADO">Assinado</option>
              <option value="RECUSADO">Recusado</option>
            </select>
          </div>
          <div className="card">
            <Table<AcaoDisciplinar>
              loading={loadingAcoes}
              data={acoes}
              columns={[
                { key: 'funcionario', label: 'Funcionário', render: (a) => (
                  <div>
                    <p className="font-medium text-neutral-900">{a.funcionario?.nome || '—'}</p>
                    <p className="text-xs text-neutral-400">{a.funcionario?.cargo}</p>
                  </div>
                )},
                { key: 'tipo', label: 'Tipo', render: (a) => <TipoBadge tipo={a.tipo} /> },
                { key: 'data', label: 'Data', render: (a) => formatDate(a.data) },
                { key: 'diasSuspensao', label: 'Dias', render: (a) => a.diasSuspensao ? `${a.diasSuspensao}d` : '—' },
                { key: 'statusAssinatura', label: 'Assinatura', render: (a) => {
                  const c = ASSN_CONFIG[a.statusAssinatura] || ASSN_CONFIG.PENDENTE;
                  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.cor}`}>{c.label}</span>;
                }},
                { key: 'motivo', label: 'Motivo', render: (a) => (
                  <p className="text-xs text-neutral-500 max-w-xs truncate" title={a.motivo}>{a.motivo}</p>
                )},
                { key: 'actions', label: '', className: 'w-32', render: (a) => (
                  <div className="flex items-center gap-1">
                    <button onClick={() => gerarPdf(a.id)} className="p-1.5 rounded hover:bg-blue-50" title="Gerar PDF">
                      <Download size={14} className="text-blue-500" />
                    </button>
                    {a.statusAssinatura === 'PENDENTE' && (
                      <button onClick={() => setShowAssinarModal(a)} className="p-1.5 rounded hover:bg-green-50" title="Marcar como assinado">
                        <CheckCircle2 size={14} className="text-green-600" />
                      </button>
                    )}
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-neutral-100" title="Editar">
                      <Pencil size={14} className="text-neutral-500" />
                    </button>
                    <button onClick={() => { if (confirm('Remover esta ação disciplinar?')) deleteMut.mutate(a.id); }}
                      className="p-1.5 rounded hover:bg-red-50" title="Remover">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                )},
              ]}
            />
          </div>
        </div>
      )}

      {/* ── Modal: Nova / Editar Ação ── */}
      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Ação Disciplinar' : 'Nova Ação Disciplinar'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Sugestão automática */}
          {sugestao && !editing && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <TriangleAlert size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Sugestão automática</p>
                <p className="text-xs text-amber-700 mt-0.5">{sugestao.mensagem}</p>
                <button type="button" onClick={() => handleTipoChange(sugestao.tipo)}
                  className="mt-1 text-xs underline text-amber-800 font-medium">
                  Aplicar sugestão →
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Funcionário *</label>
              <select value={form.funcionarioId} onChange={e => handleFuncChange(e.target.value)} className="input" required disabled={!!editing}>
                <option value="">Selecionar...</option>
                {todosFunc.map(f => (
                  <option key={f.funcionario.id} value={f.funcionario.id}>{f.funcionario.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tipo de Ação *</label>
              <select value={form.tipo} onChange={e => handleTipoChange(e.target.value)} className="input" required>
                {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data *</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="input" required />
            </div>
            {form.tipo === 'SUSPENSAO' && (
              <div>
                <label className="label">Dias de Suspensão</label>
                <input type="number" min={1} max={30} value={form.diasSuspensao}
                  onChange={e => setForm(f => ({ ...f, diasSuspensao: e.target.value }))} className="input" placeholder="Ex: 3" />
              </div>
            )}
          </div>

          <div>
            <label className="label">Motivo *</label>
            <textarea value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              className="input min-h-[72px] resize-none" required placeholder="Descreva o motivo da ação disciplinar..." />
          </div>

          {/* Faltas vinculadas */}
          {faltasFunc.length > 0 && (
            <div>
              <label className="label">Faltas Vinculadas</label>
              <p className="text-xs text-neutral-400 mb-2">Selecione as faltas injustificadas que motivam esta ação.</p>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-neutral-200 rounded-lg p-2">
                {faltasFunc.filter(f => f.tipo === 'FALTA' || !f.justificada).map(f => (
                  <label key={f.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs ${
                    f.punida && !form.faltasVinculadas.includes(f.id) ? 'opacity-40' : 'hover:bg-neutral-50'
                  }`}>
                    <input type="checkbox" checked={form.faltasVinculadas.includes(f.id)}
                      onChange={() => toggleFalta(f.id)} className="rounded" />
                    <span className={f.punida ? 'line-through text-neutral-400' : ''}>
                      {formatDate(f.data)} — {f.tipo.replace('_', ' ')} {f.justificada ? '(just.)' : '(inj.)'}
                      {f.punida ? ' ⚠ já punida' : ''}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Observação</label>
            <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              className="input" placeholder="Observações adicionais (opcional)" />
          </div>

          {form.faltasVinculadas.some(id => faltasFunc.find(f => f.id === id)?.punida) && (
            <div>
              <label className="label text-orange-700">Justificativa de Override *</label>
              <p className="text-xs text-orange-600 mb-1">Uma ou mais faltas já foram utilizadas em ação anterior. Justifique o override.</p>
              <input value={form.overrideJustificativa}
                onChange={e => setForm(f => ({ ...f, overrideJustificativa: e.target.value }))}
                className="input border-orange-300" placeholder="Justificativa para reutilização de falta já punida" required />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-neutral-100">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createMut.isPending} className="btn-primary">
              {createMut.isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Registrar Ação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Detalhes do Funcionário ── */}
      {viewFunc && (
        <Modal open={!!viewFunc} onClose={() => setViewFunc(null)} title={`Histórico — ${viewFunc.funcionario.nome}`} size="xl">
          <div className="space-y-4">
            {/* Perfil + nível */}
            <div className="flex items-center justify-between bg-neutral-50 rounded-lg p-4">
              <div>
                <p className="font-semibold text-neutral-900">{viewFunc.funcionario.nome}</p>
                <p className="text-sm text-neutral-500">{viewFunc.funcionario.cargo} · {viewFunc.funcionario.setor || 'Sem setor'}</p>
              </div>
              <div className="text-right space-y-1">
                <NivelBadge nivel={viewFunc.nivel} />
                <p className="text-xs text-neutral-400">
                  {viewFunc.faltasInjustificadasNaoPunidas} falta(s) inj. não punida(s) · {viewFunc.totalFaltas} total
                </p>
              </div>
            </div>

            {/* Sugestão */}
            {viewFunc.sugestao && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <TriangleAlert size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Próxima ação recomendada: {TIPO_LABEL[viewFunc.sugestao.tipo]}</p>
                  <p className="text-xs text-amber-700">{viewFunc.sugestao.mensagem}</p>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Linha do Tempo Disciplinar</p>
              {viewFunc.acoes.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-4">Nenhuma ação disciplinar registrada.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {viewFunc.acoes.map((a, i) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${TIPO_COR[a.tipo]}`}>
                          {i === 0 ? <Clock size={14} /> : <ArrowRight size={14} />}
                        </div>
                        {i < viewFunc.acoes.length - 1 && <div className="w-px flex-1 bg-neutral-200 mt-1" />}
                      </div>
                      <div className="pb-3 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <TipoBadge tipo={a.tipo} />
                          <span className="text-xs text-neutral-400">{formatDate(a.data)}</span>
                        </div>
                        <p className="text-xs text-neutral-600 mt-1">{a.motivo}</p>
                        {a.diasSuspensao && <p className="text-xs text-neutral-400">Duração: {a.diasSuspensao} dia(s)</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          {(() => { const c = ASSN_CONFIG[a.statusAssinatura] || ASSN_CONFIG.PENDENTE; return (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${c.cor}`}>{c.label}</span>
                          ); })()}
                          <button onClick={() => gerarPdf(a.id)} className="text-xs text-blue-600 underline flex items-center gap-0.5">
                            <Download size={11} /> PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-100">
              <button
                onClick={() => {
                  setViewFunc(null);
                  setEditing(null);
                  setForm({ ...emptyForm, funcionarioId: viewFunc.funcionario.id, tipo: viewFunc.sugestao?.tipo || 'ADVERTENCIA_VERBAL' });
                  setFaltasFuncId(viewFunc.funcionario.id);
                  setShowModal(true);
                }}
                className="btn-primary"
              >
                <Plus size={15} /> Registrar Ação
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Confirmar Assinatura ── */}
      {showAssinarModal && (
        <Modal open={!!showAssinarModal} onClose={() => setShowAssinarModal(null)} title="Confirmar Assinatura" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Confirmar que o documento de <strong>{TIPO_LABEL[showAssinarModal.tipo]}</strong> foi assinado pelo funcionário?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowAssinarModal(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => assinarMut.mutate({ id: showAssinarModal.id })}
                disabled={assinarMut.isPending}
                className="btn-primary"
              >
                <CheckCircle2 size={15} /> Confirmar Assinatura
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, cor, onClick }: {
  label: string; value: number; icon: React.ReactNode; cor: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={`card p-4 text-left w-full ${onClick ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${cor} rounded-lg flex items-center justify-center`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </div>
    </button>
  );
}

function FuncAlertaRow({ item, onVerDetalhes, onNovaAcao }: {
  item: FuncionarioDisciplinar;
  onVerDetalhes: () => void;
  onNovaAcao: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-2 hover:bg-neutral-50 rounded-lg transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600 shrink-0">
          {item.funcionario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-neutral-900 text-sm truncate">{item.funcionario.nome}</p>
          <p className="text-xs text-neutral-400">{item.funcionario.cargo} · {item.funcionario.setor || 'Sem setor'}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right hidden md:block">
          <p className="text-xs text-neutral-500">{item.faltasInjustificadasNaoPunidas} falta(s) inj.</p>
          <p className="text-xs text-neutral-400">{item.acoes.length} ação(ões)</p>
        </div>

        <NivelBadge nivel={item.nivel} />

        {item.sugestao && (
          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded hidden lg:block max-w-[200px] truncate" title={item.sugestao.mensagem}>
            → {TIPO_LABEL[item.sugestao.tipo]}
          </span>
        )}

        <div className="flex items-center gap-1">
          <button onClick={onVerDetalhes} className="p-1.5 rounded hover:bg-neutral-100" title="Ver detalhes">
            <Eye size={14} className="text-neutral-500" />
          </button>
          <button onClick={onNovaAcao} className="p-1.5 rounded hover:bg-primary-50" title="Registrar ação">
            <Plus size={14} className="text-primary-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
