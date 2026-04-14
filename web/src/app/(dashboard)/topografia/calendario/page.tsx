'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, isToday, getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Solicitacao, Obra, Engenheiro } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  AGENDADO: 'bg-blue-100 text-blue-800 border-blue-200',
  CONCLUIDO: 'bg-green-100 text-green-800 border-green-200',
  CANCELADO: 'bg-red-100 text-red-800 border-red-200',
};

export default function CalendarioPage() {
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSol, setSelectedSol] = useState<Solicitacao | null>(null);
  const [form, setForm] = useState({ obraId: '', engenheiroId: '', data: '', horario: '08:00', status: 'AGENDADO', observacoes: '' });

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });
  const firstDayOfWeek = getDay(start);

  const { data: solicitacoes = [] } = useQuery<Solicitacao[]>({
    queryKey: ['solicitacoes-calendario', format(currentDate, 'yyyy-MM')],
    queryFn: () => api.get(`/topografia/solicitacoes?from=${start.toISOString()}&to=${end.toISOString()}`).then(r => r.data),
  });

  const { data: obras = [] } = useQuery<Obra[]>({ queryKey: ['obras'], queryFn: () => api.get('/topografia/obras').then(r => r.data) });
  const { data: engenheiros = [] } = useQuery<Engenheiro[]>({ queryKey: ['engenheiros'], queryFn: () => api.get('/topografia/engenheiros').then(r => r.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/topografia/solicitacoes', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitacoes-calendario'] }); toast.success('Solicitação criada!'); setShowModal(false); },
    onError: () => toast.error('Erro ao criar solicitação'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/topografia/solicitacoes/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitacoes-calendario'] }); toast.success('Solicitação atualizada!'); setSelectedSol(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/topografia/solicitacoes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitacoes-calendario'] }); toast.success('Solicitação removida'); setSelectedSol(null); },
  });

  const openNew = (day: Date) => {
    setSelectedDay(day);
    setForm({ obraId: '', engenheiroId: '', data: format(day, 'yyyy-MM-dd'), horario: '08:00', status: 'AGENDADO', observacoes: '' });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new Date(`${form.data}T${form.horario}:00`);
    createMutation.mutate({ obraId: form.obraId, engenheiroId: form.engenheiroId, data, status: form.status, observacoes: form.observacoes });
  };

  const dayEvents = (day: Date) => solicitacoes.filter((s) => isSameDay(new Date(s.data), day));

  return (
    <div>
      <PageHeader
        title="Calendário de Topografia"
        actions={
          <button onClick={() => openNew(new Date())} className="btn-primary">
            <Plus size={16} /> Nova Solicitação
          </button>
        }
      />

      {/* Calendar header */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-xs px-3 py-1">
              <Calendar size={14} /> Hoje
            </button>
          </div>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 border-b border-neutral-100">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-neutral-400 py-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for first day offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-neutral-100 bg-neutral-50/50" />
          ))}

          {days.map((day) => {
            const events = dayEvents(day);
            const todayClass = isToday(day) ? 'bg-primary-50' : '';
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] border-b border-r border-neutral-100 p-1.5 cursor-pointer hover:bg-neutral-50 transition-colors ${todayClass}`}
                onClick={() => openNew(day)}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${isToday(day) ? 'bg-primary-800 text-white' : 'text-neutral-700'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedSol(ev); }}
                      className={`text-[11px] px-1.5 py-0.5 rounded border truncate cursor-pointer ${STATUS_COLORS[ev.status]}`}
                    >
                      {ev.obra?.nome}
                    </div>
                  ))}
                  {events.length > 3 && (
                    <div className="text-[10px] text-neutral-400 pl-1">+{events.length - 3} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-3 border-t border-neutral-100 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-200" /> Agendado</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200" /> Concluído</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200" /> Cancelado</span>
        </div>
      </div>

      {/* Nova Solicitação Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Solicitação" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Obra *</label>
            <select value={form.obraId} onChange={(e) => setForm({ ...form, obraId: e.target.value })} className="input" required>
              <option value="">Selecionar obra...</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Engenheiro *</label>
            <select value={form.engenheiroId} onChange={(e) => setForm({ ...form, engenheiroId: e.target.value })} className="input" required>
              <option value="">Selecionar engenheiro...</option>
              {engenheiros.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data *</label>
              <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Horário</label>
              <input type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <div className="flex gap-4 mt-1">
              {['AGENDADO', 'CONCLUIDO', 'CANCELADO'].map((s) => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="status" value={s} checked={form.status === s} onChange={() => setForm({ ...form, status: s })} />
                  <StatusBadge status={s} />
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="input" rows={3} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detalhes drawer */}
      {selectedSol && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedSol(null)} />
          <div className="relative bg-white w-96 h-full shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold">Detalhes da Solicitação</h3>
              <button onClick={() => setSelectedSol(null)} className="p-1 rounded-lg hover:bg-neutral-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-neutral-500">Obra</p>
                <p className="font-medium">{selectedSol.obra?.nome}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Engenheiro</p>
                <p className="font-medium">{selectedSol.engenheiro?.nome}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Data</p>
                <p className="font-medium">{formatDate(selectedSol.data)} às {format(new Date(selectedSol.data), 'HH:mm')}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <div className="mt-1"><StatusBadge status={selectedSol.status} /></div>
              </div>
              {selectedSol.observacoes && (
                <div>
                  <p className="text-xs text-neutral-500">Observações</p>
                  <p className="text-sm">{selectedSol.observacoes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => updateMutation.mutate({ id: selectedSol.id, data: { status: 'CONCLUIDO' } })}
                  className="btn-primary flex-1 justify-center"
                >
                  Marcar Concluído
                </button>
                <button
                  onClick={() => deleteMutation.mutate(selectedSol.id)}
                  className="btn-danger"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
