'use client';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Cliente, Orcamento } from '@/types';

// ── Types ────────────────────────────────────────────────────
interface Props {
  orcamento: Orcamento | null;
  onSaved: () => void;
  onCancel: () => void;
}

interface TeamMember {
  id: string;
  nome: string;
  vdi: number;   // fixed rate R$/dia
  dias: number;  // editable
}

interface FormState {
  clienteId: string;
  empreendimento: string;
  local: string;
  // Equipe de Campo
  equipe: TeamMember[];
  // MO Escritório
  hh: number;
  valorHH: number;
  // MO Indireta
  pctProspeccao: number;
  pctOrganizacao: number;
  // Custos Diretos
  art: number;
  aluguelEquip: number;
  gasolina: number;
  hospedagem: number;
  estacas: number;
  alimentacao: number;
  // Régua de Valores
  complexidade: 'BAIXA' | 'NORMAL' | 'ALTA';
  prazo: 'FOLGADO' | 'NORMAL' | 'APERTADO';
  visibilidade: 'RUIM' | 'NORMAL' | 'BOA';
  // Precificação
  margem: number;   // %
  iss: number;      // %
  simples: number;  // %
  // Valor adotado
  valorAdotado: number;
  condicoes: string;
  status: string;
}

const EQUIPE_DEFAULT: TeamMember[] = [
  { id: 'lourenco', nome: 'LOURENÇO', vdi: 350, dias: 0 },
  { id: 'diego',    nome: 'DIEGO',    vdi: 350, dias: 0 },
  { id: 'marcelo',  nome: 'MARCELO',  vdi: 250, dias: 0 },
  { id: 'ajudante', nome: 'AJUDANTE', vdi: 100, dias: 0 },
];

const DEFAULT: FormState = {
  clienteId: '',
  empreendimento: '',
  local: '',
  equipe: EQUIPE_DEFAULT,
  hh: 0,
  valorHH: 262.5,
  pctProspeccao: 50,
  pctOrganizacao: 50,
  art: 0,
  aluguelEquip: 0,
  gasolina: 0,
  hospedagem: 0,
  estacas: 0,
  alimentacao: 0,
  complexidade: 'NORMAL',
  prazo: 'NORMAL',
  visibilidade: 'NORMAL',
  margem: 30,
  iss: 10,
  simples: 37,
  valorAdotado: 0,
  condicoes: '',
  status: 'RASCUNHO',
};

// ── Adjustment maps ──────────────────────────────────────────
const ADJ_COMPLEXIDADE: Record<string, number> = { BAIXA: -0.10, NORMAL: 0, ALTA: 0.10 };
const ADJ_PRAZO: Record<string, number>        = { FOLGADO: -0.10, NORMAL: 0, APERTADO: 0.10 };
const ADJ_VISIBILIDADE: Record<string, number> = { BOA: -0.10, NORMAL: 0, RUIM: 0.10 };

// ── Helpers ──────────────────────────────────────────────────
function calcular(f: FormState) {
  const moCampo      = f.equipe.reduce((s, m) => s + m.dias * m.vdi, 0);
  const moEscritorio = f.hh * f.valorHH;
  const moDireta     = moCampo + moEscritorio;
  const moIndireta   = moDireta * ((f.pctProspeccao + f.pctOrganizacao) / 100);
  const custosDir    = f.art + f.aluguelEquip + f.gasolina + f.hospedagem + f.estacas + f.alimentacao;
  const custoTotal   = moDireta + moIndireta + custosDir;

  const ajuste  = ADJ_COMPLEXIDADE[f.complexidade] + ADJ_PRAZO[f.prazo] + ADJ_VISIBILIDADE[f.visibilidade];
  const margem  = f.margem / 100;
  const iss     = f.iss / 100;
  const simples = f.simples / 100;

  const preco = (margem_val: number): { semNF: number; comNF: number } => {
    // Sem NF: custo coberto pela margem + ISS (ISS incide sobre serviços mesmo sem NF)
    const denSemNF = 1 - margem_val - iss;
    const semNF = denSemNF > 0 ? (custoTotal / denSemNF) * (1 + ajuste) : 0;
    // Com NF (Simples Nacional): ISS já incluso na alíquota do Simples
    const denComNF = 1 - margem_val - simples;
    const comNF = denComNF > 0 ? (custoTotal / denComNF) * (1 + ajuste) : 0;
    return { semNF, comNF };
  };

  const margemMin = Math.max(0, margem - 0.10);
  const margemMax = Math.min(0.95, margem + 0.10);

  return {
    moCampo, moEscritorio, moDireta, moIndireta, custosDir, custoTotal, ajuste,
    min:   preco(margemMin),
    ideal: preco(margem),
    max:   preco(margemMax),
  };
}

// ── Number input ─────────────────────────────────────────────
function NumInput({ label, value, onChange, prefix = 'R$', step = 0.01, min = 0 }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; step?: number; min?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-600 mb-1">{label}</label>
      <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-400">
        {prefix && <span className="px-2 text-xs text-neutral-400 bg-neutral-50 border-r border-neutral-300">{prefix}</span>}
        <input
          type="number"
          min={min}
          step={step}
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 px-2 py-1.5 text-sm outline-none"
        />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export function OrcamentoTopografia({ orcamento, onSaved, onCancel }: Props) {
  const [f, setF] = useState<FormState>(() => {
    if (orcamento?.dadosEspecificos) {
      const d = orcamento.dadosEspecificos as any;
      // Migrate legacy risco → visibilidade
      if (d.risco && !d.visibilidade) {
        const map: Record<string, string> = { BAIXO: 'BOA', NORMAL: 'NORMAL', ALTO: 'RUIM' };
        d.visibilidade = map[d.risco] ?? 'NORMAL';
      }
      // Migrate legacy qtdDiarias/valorDiaria → equipe
      if (!d.equipe) {
        d.equipe = EQUIPE_DEFAULT.map(m => ({ ...m, dias: 0 }));
      }
      return { ...DEFAULT, ...d, status: orcamento.status };
    }
    return { ...DEFAULT, clienteId: orcamento?.clienteId || '' };
  });

  const set = useCallback((key: keyof FormState, val: any) => {
    setF(prev => ({ ...prev, [key]: val }));
  }, []);

  const updateMembro = (id: string, field: 'dias' | 'vdi' | 'nome', val: number | string) => {
    setF(prev => ({
      ...prev,
      equipe: prev.equipe.map(m => m.id === id ? { ...m, [field]: val } : m),
    }));
  };

  const calc = calcular(f);

  useEffect(() => {
    if (!orcamento && f.valorAdotado === 0 && (calc.ideal?.comNF ?? 0) > 0) {
      setF(prev => ({ ...prev, valorAdotado: Math.round((calc.ideal?.comNF || 0) * 100) / 100 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.ideal?.comNF]);

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: () => api.get('/comercial/clientes').then(r => r.data),
  });

  const buildPayload = () => {
    const total = f.valorAdotado || calc.ideal?.comNF || 0;
    return {
      clienteId: f.clienteId,
      tipo: 'TOPOGRAFIA',
      status: f.status,
      condicoes: f.condicoes || undefined,
      total,
      desconto: 0,
      dadosEspecificos: { ...f },
      itens: [
        { descricao: 'Serviços de Topografia', quantidade: 1, unitario: total },
      ],
    };
  };

  const saveMut = useMutation({
    mutationFn: (payload: any) =>
      orcamento
        ? api.patch(`/comercial/orcamentos/${orcamento.id}`, payload)
        : api.post('/comercial/orcamentos', payload),
    onSuccess: () => { toast.success(orcamento ? 'Atualizado!' : 'Orçamento criado!'); onSaved(); },
    onError: () => toast.error('Erro ao salvar'),
  });

  const handleSave = (newStatus: string) => {
    if (!f.clienteId) { toast.error('Selecione um cliente'); return; }
    saveMut.mutate({ ...buildPayload(), status: newStatus });
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-xl font-bold text-neutral-900">
        {orcamento ? `Editar Orçamento #${orcamento.numero}` : 'Novo Orçamento — Topografia'}
      </h2>

      {/* Cabeçalho */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Identificação</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Cliente *</label>
            <select
              value={f.clienteId}
              onChange={e => set('clienteId', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
            >
              <option value="">Selecione…</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Empreendimento</label>
            <input
              value={f.empreendimento}
              onChange={e => set('empreendimento', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              placeholder="Nome do empreendimento"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Local</label>
            <input
              value={f.local}
              onChange={e => set('local', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              placeholder="Cidade / Endereço"
            />
          </div>
        </div>
      </section>

      {/* Equipe de Campo */}
      <section className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Equipe de Campo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-neutral-500">Profissional</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-neutral-500 w-36">VDI (R$/dia)</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-neutral-500 w-32">Diárias</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-neutral-500">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {f.equipe.map(m => {
                const sub = m.dias * m.vdi;
                return (
                  <tr key={m.id} className="border-b border-neutral-100">
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={m.nome}
                        onChange={e => updateMembro(m.id, 'nome', e.target.value)}
                        className="w-full border border-neutral-200 rounded px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-primary-400 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number" min={0} step={50}
                        value={m.vdi || ''}
                        onChange={e => updateMembro(m.id, 'vdi', parseFloat(e.target.value) || 0)}
                        className="w-full text-center border border-neutral-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-400 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number" min={0} step={0.5}
                        value={m.dias || ''}
                        onChange={e => updateMembro(m.id, 'dias', parseFloat(e.target.value) || 0)}
                        className="w-full text-center border border-neutral-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-400 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-1.5 px-3 text-right font-semibold text-neutral-700">
                      {sub > 0 ? formatCurrency(sub) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50">
                <td colSpan={3} className="py-2 px-3 text-xs font-semibold text-blue-700">Total MO Campo</td>
                <td className="py-2 px-3 text-right font-bold text-blue-900">{formatCurrency(calc.moCampo)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* MO Escritório */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">MO Escritório</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="Horas Técnicas (HH)" value={f.hh} onChange={v => set('hh', v)} prefix="h" step={0.5} />
          <NumInput label="Valor HH" value={f.valorHH} onChange={v => set('valorHH', v)} />
        </div>
        <div className="flex justify-between text-sm bg-blue-50 rounded-lg px-3 py-2">
          <span className="text-blue-700 font-medium">Subtotal MO Escritório</span>
          <span className="font-bold text-blue-900">{formatCurrency(calc.moEscritorio)}</span>
        </div>
      </section>

      {/* MO Indireta */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">MO Indireta (% sobre MO Direta)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <NumInput label="Prospecção (%)" value={f.pctProspeccao} onChange={v => set('pctProspeccao', v)} prefix="%" step={1} />
          <NumInput label="Organização (%)" value={f.pctOrganizacao} onChange={v => set('pctOrganizacao', v)} prefix="%" step={1} />
          <div className="md:col-span-2 flex justify-between text-sm bg-blue-50 rounded-lg px-3 py-2">
            <span className="text-blue-700 font-medium">MO Indireta calculada</span>
            <span className="font-bold text-blue-900">{formatCurrency(calc.moIndireta)}</span>
          </div>
        </div>
      </section>

      {/* Custos Diretos */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Custos Diretos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumInput label="ART" value={f.art} onChange={v => set('art', v)} />
          <NumInput label="Aluguel de Equipamento" value={f.aluguelEquip} onChange={v => set('aluguelEquip', v)} />
          <NumInput label="Gasolina" value={f.gasolina} onChange={v => set('gasolina', v)} />
          <NumInput label="Hospedagem" value={f.hospedagem} onChange={v => set('hospedagem', v)} />
          <NumInput label="Estacas" value={f.estacas} onChange={v => set('estacas', v)} />
          <NumInput label="Alimentação" value={f.alimentacao} onChange={v => set('alimentacao', v)} />
        </div>
        <div className="flex justify-between text-sm bg-orange-50 rounded-lg px-3 py-2">
          <span className="text-orange-700 font-medium">Total Custos Diretos</span>
          <span className="font-bold text-orange-900">{formatCurrency(calc.custosDir)}</span>
        </div>
      </section>

      {/* Régua de Valores */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Régua de Valores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Complexidade</label>
            <select
              value={f.complexidade}
              onChange={e => set('complexidade', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
            >
              <option value="BAIXA">Baixa (−10%)</option>
              <option value="NORMAL">Normal (0%)</option>
              <option value="ALTA">Alta (+10%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Prazo</label>
            <select
              value={f.prazo}
              onChange={e => set('prazo', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
            >
              <option value="FOLGADO">Folgado (−10%)</option>
              <option value="NORMAL">Normal (0%)</option>
              <option value="APERTADO">Apertado (+10%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Visibilidade</label>
            <select
              value={f.visibilidade}
              onChange={e => set('visibilidade', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
            >
              <option value="BOA">Boa (−10%)</option>
              <option value="NORMAL">Normal (0%)</option>
              <option value="RUIM">Ruim (+10%)</option>
            </select>
          </div>
        </div>
        {calc.ajuste !== 0 && (
          <p className="text-xs text-neutral-500">
            Ajuste total: <strong>{calc.ajuste > 0 ? '+' : ''}{(calc.ajuste * 100).toFixed(0)}%</strong>
          </p>
        )}
      </section>

      {/* Parâmetros de Precificação */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Parâmetros de Precificação</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NumInput label="Margem (%)" value={f.margem} onChange={v => set('margem', Math.min(95, Math.max(0, v)))} prefix="%" step={1} />
          <NumInput label="ISS (% — sem NF)" value={f.iss} onChange={v => set('iss', v)} prefix="%" step={0.5} />
          <NumInput label="Simples Nacional (% — com NF)" value={f.simples} onChange={v => set('simples', v)} prefix="%" step={0.5} />
          <div className="flex flex-col justify-end">
            <div className="text-xs text-neutral-500">Custo Total Base</div>
            <div className="font-bold text-neutral-800 text-base">{formatCurrency(calc.custoTotal)}</div>
          </div>
        </div>
      </section>

      {/* Régua de Preços */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Régua de Preços</h3>
        <div className="grid grid-cols-3 gap-4">
          {/* MÍN */}
          <div className="rounded-xl border border-neutral-200 p-4 text-center">
            <div className="text-xs font-semibold text-neutral-500 uppercase mb-3">Mínimo</div>
            <div className="text-xs text-neutral-400 mb-0.5">Sem NF</div>
            <div className="text-sm font-medium text-neutral-700">{formatCurrency(calc.min?.semNF || 0)}</div>
            <div className="text-xs text-neutral-400 mt-2 mb-0.5">Com NF (Simples)</div>
            <div className="text-lg font-bold text-neutral-800">{formatCurrency(calc.min?.comNF || 0)}</div>
            <div className="text-xs text-neutral-400 mt-1">margem {Math.max(0, f.margem - 10).toFixed(0)}%</div>
          </div>
          {/* IDEAL */}
          <div className="rounded-xl border-2 border-primary-400 bg-primary-50 p-4 text-center relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">Ideal</div>
            <div className="text-xs font-semibold text-primary-600 uppercase mb-3">Recomendado</div>
            <div className="text-xs text-neutral-400 mb-0.5">Sem NF</div>
            <div className="text-sm font-medium text-neutral-700">{formatCurrency(calc.ideal?.semNF || 0)}</div>
            <div className="text-xs text-neutral-400 mt-2 mb-0.5">Com NF (Simples)</div>
            <div className="text-2xl font-bold text-primary-700">{formatCurrency(calc.ideal?.comNF || 0)}</div>
            <div className="text-xs text-neutral-400 mt-1">margem {f.margem.toFixed(0)}%</div>
          </div>
          {/* MÁX */}
          <div className="rounded-xl border border-neutral-200 p-4 text-center">
            <div className="text-xs font-semibold text-neutral-500 uppercase mb-3">Máximo</div>
            <div className="text-xs text-neutral-400 mb-0.5">Sem NF</div>
            <div className="text-sm font-medium text-neutral-700">{formatCurrency(calc.max?.semNF || 0)}</div>
            <div className="text-xs text-neutral-400 mt-2 mb-0.5">Com NF (Simples)</div>
            <div className="text-lg font-bold text-neutral-800">{formatCurrency(calc.max?.comNF || 0)}</div>
            <div className="text-xs text-neutral-400 mt-1">margem {Math.min(95, f.margem + 10).toFixed(0)}%</div>
          </div>
        </div>
      </section>

      {/* Valor Adotado */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Valor Adotado</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumInput label="Valor final da proposta" value={f.valorAdotado} onChange={v => set('valorAdotado', v)} />
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Condições de Pagamento</label>
            <input
              value={f.condicoes}
              onChange={e => set('condicoes', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              placeholder="Ex: 50% entrada + 50% entrega"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-neutral-500">Usar:</span>
          {[
            { label: `Sem NF Mín ${formatCurrency(calc.min?.semNF || 0)}`, val: calc.min?.semNF || 0 },
            { label: `Com NF Ideal ${formatCurrency(calc.ideal?.comNF || 0)}`, val: calc.ideal?.comNF || 0 },
            { label: `Com NF Máx ${formatCurrency(calc.max?.comNF || 0)}`, val: calc.max?.comNF || 0 },
          ].map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => set('valorAdotado', Math.round(opt.val * 100) / 100)}
              className="text-xs px-2 py-0.5 rounded-full border border-primary-300 text-primary-700 hover:bg-primary-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Ações */}
      <div className="flex gap-3 justify-end pb-8">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button
          type="button"
          onClick={() => handleSave('RASCUNHO')}
          disabled={saveMut.isPending}
          className="btn-secondary"
        >
          Salvar Rascunho
        </button>
        <button
          type="button"
          onClick={() => handleSave('ENVIADO')}
          disabled={saveMut.isPending}
          className="btn-primary"
        >
          {saveMut.isPending ? 'Salvando…' : 'Salvar e Enviar'}
        </button>
      </div>
    </div>
  );
}
