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

interface FormState {
  // Cabeçalho
  clienteId: string;
  empreendimento: string;
  local: string;
  // MO Campo
  qtdDiarias: number;
  valorDiaria: number;
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
  risco: 'BAIXO' | 'NORMAL' | 'ALTO';
  // Precificação
  margem: number;       // %
  iss: number;          // %
  simples: number;      // %
  // Valor adotado
  valorAdotado: number;
  condicoes: string;
  status: string;
}

const DEFAULT: FormState = {
  clienteId: '',
  empreendimento: '',
  local: '',
  qtdDiarias: 0,
  valorDiaria: 0,
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
  risco: 'NORMAL',
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
const ADJ_RISCO: Record<string, number>        = { BAIXO: 0, NORMAL: 0.02, ALTO: 0.30 };

// ── Helpers ──────────────────────────────────────────────────
function calcular(f: FormState) {
  const moCampo      = f.qtdDiarias * f.valorDiaria;
  const moEscritorio = f.hh * f.valorHH;
  const moDireta     = moCampo + moEscritorio;
  const moIndireta   = moDireta * ((f.pctProspeccao + f.pctOrganizacao) / 100);
  const custosDir    = f.art + f.aluguelEquip + f.gasolina + f.hospedagem + f.estacas + f.alimentacao;
  const custoTotal   = moDireta + moIndireta + custosDir;

  const ajuste = ADJ_COMPLEXIDADE[f.complexidade] + ADJ_PRAZO[f.prazo] + ADJ_RISCO[f.risco];
  const issTax = f.iss / 100;
  const margem = f.margem / 100;

  const preco = (margem_val: number): { semImposto: number; comImposto: number } => {
    if (margem_val >= 1) return { semImposto: 0, comImposto: 0 };
    const semImposto = (custoTotal / (1 - margem_val)) * (1 + ajuste);
    const comImposto = semImposto / (1 - issTax);
    return { semImposto, comImposto };
  };

  const margemMin  = Math.max(0, margem - 0.10);
  const margemMax  = Math.min(0.95, margem + 0.10);

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
      return { ...DEFAULT, ...orcamento.dadosEspecificos, status: orcamento.status };
    }
    return { ...DEFAULT, clienteId: orcamento?.clienteId || '' };
  });

  const set = useCallback((key: keyof FormState, val: any) => {
    setF(prev => ({ ...prev, [key]: val }));
  }, []);

  const calc = calcular(f);

  // auto-set valorAdotado to ideal when not editing
  useEffect(() => {
    if (!orcamento && calc.ideal && f.valorAdotado === 0) {
      setF(prev => ({ ...prev, valorAdotado: Math.round((calc.ideal?.comImposto || 0) * 100) / 100 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.ideal?.comImposto]);

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: () => api.get('/comercial/clientes').then(r => r.data),
  });

  const buildPayload = () => {
    const total = f.valorAdotado || calc.ideal?.comImposto || 0;
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

      {/* Custos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MO Campo */}
        <section className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">MO Campo</h3>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="Qtd. Diárias" value={f.qtdDiarias} onChange={v => set('qtdDiarias', v)} prefix="dias" step={1} />
            <NumInput label="Valor Diária" value={f.valorDiaria} onChange={v => set('valorDiaria', v)} />
          </div>
          <div className="flex justify-between text-sm bg-blue-50 rounded-lg px-3 py-2">
            <span className="text-blue-700 font-medium">Subtotal MO Campo</span>
            <span className="font-bold text-blue-900">{formatCurrency(calc.moCampo)}</span>
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
      </div>

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
            <label className="block text-xs font-medium text-neutral-600 mb-1">Risco</label>
            <select
              value={f.risco}
              onChange={e => set('risco', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
            >
              <option value="BAIXO">Baixo (0%)</option>
              <option value="NORMAL">Normal (+2%)</option>
              <option value="ALTO">Alto (+30%)</option>
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
          <NumInput label="ISS (%)" value={f.iss} onChange={v => set('iss', v)} prefix="%" step={0.5} />
          <NumInput label="Simples Nacional (%)" value={f.simples} onChange={v => set('simples', v)} prefix="%" step={0.5} />
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
            <div className="text-xs font-semibold text-neutral-500 uppercase mb-2">Mínimo</div>
            <div className="text-xs text-neutral-400 mb-1">Sem imposto</div>
            <div className="text-sm font-medium text-neutral-700">{formatCurrency(calc.min?.semImposto || 0)}</div>
            <div className="text-xs text-neutral-400 mt-2 mb-1">Com ISS</div>
            <div className="text-lg font-bold text-neutral-800">{formatCurrency(calc.min?.comImposto || 0)}</div>
            <div className="text-xs text-neutral-400 mt-1">margem {Math.max(0, f.margem - 10).toFixed(0)}%</div>
          </div>
          {/* IDEAL */}
          <div className="rounded-xl border-2 border-primary-400 bg-primary-50 p-4 text-center relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">Ideal</div>
            <div className="text-xs font-semibold text-primary-600 uppercase mb-2">Recomendado</div>
            <div className="text-xs text-neutral-400 mb-1">Sem imposto</div>
            <div className="text-sm font-medium text-neutral-700">{formatCurrency(calc.ideal?.semImposto || 0)}</div>
            <div className="text-xs text-neutral-400 mt-2 mb-1">Com ISS</div>
            <div className="text-2xl font-bold text-primary-700">{formatCurrency(calc.ideal?.comImposto || 0)}</div>
            <div className="text-xs text-neutral-400 mt-1">margem {f.margem.toFixed(0)}%</div>
          </div>
          {/* MÁX */}
          <div className="rounded-xl border border-neutral-200 p-4 text-center">
            <div className="text-xs font-semibold text-neutral-500 uppercase mb-2">Máximo</div>
            <div className="text-xs text-neutral-400 mb-1">Sem imposto</div>
            <div className="text-sm font-medium text-neutral-700">{formatCurrency(calc.max?.semImposto || 0)}</div>
            <div className="text-xs text-neutral-400 mt-2 mb-1">Com ISS</div>
            <div className="text-lg font-bold text-neutral-800">{formatCurrency(calc.max?.comImposto || 0)}</div>
            <div className="text-xs text-neutral-400 mt-1">margem {Math.min(95, f.margem + 10).toFixed(0)}%</div>
          </div>
        </div>
      </section>

      {/* Valor Adotado */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Valor Adotado</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumInput label="Valor final da proposta (com impostos)" value={f.valorAdotado} onChange={v => set('valorAdotado', v)} />
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
        {/* Shortcuts */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-neutral-500">Usar:</span>
          {[
            { label: `Mínimo ${formatCurrency(calc.min?.comImposto || 0)}`, val: calc.min?.comImposto || 0 },
            { label: `Ideal ${formatCurrency(calc.ideal?.comImposto || 0)}`, val: calc.ideal?.comImposto || 0 },
            { label: `Máximo ${formatCurrency(calc.max?.comImposto || 0)}`, val: calc.max?.comImposto || 0 },
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
