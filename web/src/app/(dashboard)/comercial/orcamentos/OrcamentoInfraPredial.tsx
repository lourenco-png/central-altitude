'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
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

interface Disciplina {
  id: string;
  nome: string;
  dh: number;   // dias-homem
  vdi: number;  // valor/dia
}

interface Terceirizado {
  id: string;
  descricao: string;
  valor: number;
}

interface FormState {
  clienteId: string;
  empreendimento: string;
  local: string;
  tipologia: string;
  unidadeCaracteristica: string;
  disciplinas: Disciplina[];
  terceirizados: Terceirizado[];
  pctProspeccao: number;
  pctOrganizacao: number;
  despesasEscritorio: number;
  art: number;
  plotagem: number;
  gasolina: number;
  hospedagem: number;
  alimentacao: number;
  iss: number;
  margemMin: number;
  margemMax: number;
  // Régua de valores
  complexidade: 'BAIXA' | 'NORMAL' | 'ALTA';
  prazo: 'FOLGADO' | 'NORMAL' | 'APERTADO';
  conhecimento: 'RUIM' | 'NORMAL' | 'BOA';
  visibilidade: 'RUIM' | 'NORMAL' | 'BOA';
  valorAdotado: number;
  parcelamento: string;
  condicoes: string;
  status: string;
}

const DISCIPLINAS_DEFAULT: Disciplina[] = [
  { id: 'agua',          nome: 'Água',          dh: 0, vdi: 4500 },
  { id: 'esgoto',        nome: 'Esgoto',        dh: 0, vdi: 4500 },
  { id: 'drenagem',      nome: 'Drenagem',      dh: 0, vdi: 4500 },
  { id: 'terraplanagem', nome: 'Terraplanagem', dh: 0, vdi: 4500 },
  { id: 'macrodrenagem', nome: 'Macrodrenagem', dh: 0, vdi: 3000 },
];

const ADJ: Record<string, number> = { BAIXA: -0.10, NORMAL: 0, ALTA: 0.10, FOLGADO: -0.10, APERTADO: 0.10, BOA: -0.10, RUIM: 0.10 };

const DEFAULT: FormState = {
  clienteId: '',
  empreendimento: '',
  local: '',
  tipologia: '',
  unidadeCaracteristica: '',
  disciplinas: DISCIPLINAS_DEFAULT,
  terceirizados: [],
  pctProspeccao: 20,
  pctOrganizacao: 15,
  despesasEscritorio: 4872,
  art: 0,
  plotagem: 0,
  gasolina: 0,
  hospedagem: 0,
  alimentacao: 0,
  iss: 11,
  margemMin: 10,
  margemMax: 30,
  complexidade: 'NORMAL',
  prazo: 'NORMAL',
  conhecimento: 'NORMAL',
  visibilidade: 'NORMAL',
  valorAdotado: 0,
  parcelamento: '',
  condicoes: '',
  status: 'RASCUNHO',
};

let _uid = 1;
const uid = () => `custom-${_uid++}`;

function calcular(f: FormState) {
  const moDireta     = f.disciplinas.reduce((s, d) => s + d.dh * d.vdi, 0);
  const totalTerceir = f.terceirizados.reduce((s, t) => s + t.valor, 0);
  const moIndireta   = moDireta * ((f.pctProspeccao + f.pctOrganizacao) / 100);
  const custosDir    = f.art + f.plotagem + f.gasolina + f.hospedagem + f.alimentacao;
  const subtotal     = moDireta + totalTerceir + moIndireta + f.despesasEscritorio + custosDir;
  const issTax       = f.iss / 100;
  const ajuste       = (ADJ[f.complexidade] ?? 0) + (ADJ[f.prazo] ?? 0) + (ADJ[f.conhecimento] ?? 0) + (ADJ[f.visibilidade] ?? 0);

  const preco = (margem_pct: number) => {
    const m = Math.min(0.95, margem_pct / 100);
    if (1 - m - issTax <= 0) return 0;
    return (subtotal / (1 - m - issTax)) * (1 + ajuste);
  };

  const margemIdeal = (f.margemMin + f.margemMax) / 2;

  return {
    moDireta, totalTerceir, moIndireta, custosDir, subtotal, ajuste,
    precoMin:   preco(f.margemMin),
    precoIdeal: preco(margemIdeal),
    precoMax:   preco(f.margemMax),
  };
}

// ── Number input ─────────────────────────────────────────────
function NumInput({ label, value, onChange, prefix = 'R$', step = 0.01, min = 0, small = false }: {
  label?: string; value: number; onChange: (v: number) => void; prefix?: string; step?: number; min?: number; small?: boolean;
}) {
  const cls = `flex items-center border border-neutral-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-400 ${small ? 'text-xs' : ''}`;
  return (
    <div>
      {label && <label className="block text-xs font-medium text-neutral-600 mb-1">{label}</label>}
      <div className={cls}>
        {prefix && <span className={`px-2 text-xs text-neutral-400 bg-neutral-50 border-r border-neutral-300 ${small ? 'py-1' : ''}`}>{prefix}</span>}
        <input
          type="number"
          min={min}
          step={step}
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`flex-1 px-2 outline-none ${small ? 'py-1' : 'py-1.5 text-sm'}`}
        />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export function OrcamentoInfraPredial({ orcamento, onSaved, onCancel }: Props) {
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

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: () => api.get('/comercial/clientes').then(r => r.data),
  });

  // ── Disciplinas helpers ──────────────────────────────────
  const updateDisciplina = (id: string, field: 'dh' | 'vdi', val: number) => {
    setF(prev => ({
      ...prev,
      disciplinas: prev.disciplinas.map(d => d.id === id ? { ...d, [field]: val } : d),
    }));
  };

  const addDisciplina = () => {
    setF(prev => ({
      ...prev,
      disciplinas: [...prev.disciplinas, { id: uid(), nome: '', dh: 0, vdi: 0 }],
    }));
  };

  const removeDisciplina = (id: string) => {
    setF(prev => ({ ...prev, disciplinas: prev.disciplinas.filter(d => d.id !== id) }));
  };

  const renameDisciplina = (id: string, nome: string) => {
    setF(prev => ({
      ...prev,
      disciplinas: prev.disciplinas.map(d => d.id === id ? { ...d, nome } : d),
    }));
  };

  // ── Terceirizados helpers ────────────────────────────────
  const addTerceirizado = () => {
    setF(prev => ({
      ...prev,
      terceirizados: [...prev.terceirizados, { id: uid(), descricao: '', valor: 0 }],
    }));
  };

  const removeTerceirizado = (id: string) => {
    setF(prev => ({ ...prev, terceirizados: prev.terceirizados.filter(t => t.id !== id) }));
  };

  const updateTerceirizado = (id: string, field: 'descricao' | 'valor', val: any) => {
    setF(prev => ({
      ...prev,
      terceirizados: prev.terceirizados.map(t => t.id === id ? { ...t, [field]: val } : t),
    }));
  };

  // ── Save ────────────────────────────────────────────────
  const buildPayload = (status: string) => {
    const total = f.valorAdotado || calc.precoIdeal;
    const itens = f.disciplinas
      .filter(d => d.dh > 0 && d.nome)
      .map(d => ({ descricao: d.nome, quantidade: d.dh, unitario: d.vdi }));

    if (itens.length === 0) {
      itens.push({ descricao: 'Serviços de Infra/Predial', quantidade: 1, unitario: total });
    }

    return {
      clienteId: f.clienteId,
      tipo: 'INFRA_PREDIAL',
      status,
      condicoes: f.condicoes || undefined,
      total,
      desconto: 0,
      dadosEspecificos: { ...f },
      itens,
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

  const handleSave = (status: string) => {
    if (!f.clienteId) { toast.error('Selecione um cliente'); return; }
    saveMut.mutate(buildPayload(status));
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      <h2 className="text-xl font-bold text-neutral-900">
        {orcamento ? `Editar Orçamento #${orcamento.numero}` : 'Novo Orçamento — Infra & Predial'}
      </h2>

      {/* Identificação */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Identificação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <input value={f.empreendimento} onChange={e => set('empreendimento', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              placeholder="Nome" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Local</label>
            <input value={f.local} onChange={e => set('local', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              placeholder="Cidade / Endereço" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Tipologia</label>
            <input value={f.tipologia} onChange={e => set('tipologia', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              placeholder="Ex: Residencial" />
          </div>
        </div>
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-neutral-600 mb-1">Unidade Característica</label>
          <input value={f.unidadeCaracteristica} onChange={e => set('unidadeCaracteristica', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
            placeholder="Ex: m², lotes, unidades" />
        </div>
      </section>

      {/* Tabela de Disciplinas */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">MO Direta — Disciplinas</h3>
          <button type="button" onClick={addDisciplina}
            className="flex items-center gap-1 text-xs text-primary-700 hover:text-primary-900 font-medium">
            <Plus size={14} /> Adicionar disciplina
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-neutral-500 w-48">Disciplina</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-neutral-500 w-32">DH (dias-homem)</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-neutral-500 w-36">VDI (R$/dia)</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-neutral-500 w-32">VP (R$)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {f.disciplinas.map((d) => {
                const vp = d.dh * d.vdi;
                return (
                  <tr key={d.id} className="border-b border-neutral-100">
                    <td className="py-1.5 px-3">
                      <input
                        value={d.nome}
                        onChange={e => renameDisciplina(d.id, e.target.value)}
                        className="w-full border border-neutral-200 rounded px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-primary-400 outline-none"
                        placeholder="Nome da disciplina"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number" min={0} step={0.5}
                        value={d.dh || ''}
                        onChange={e => updateDisciplina(d.id, 'dh', parseFloat(e.target.value) || 0)}
                        className="w-full text-center border border-neutral-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-400 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number" min={0} step={50}
                        value={d.vdi || ''}
                        onChange={e => updateDisciplina(d.id, 'vdi', parseFloat(e.target.value) || 0)}
                        className="w-full text-center border border-neutral-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-400 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-3 text-right font-semibold text-neutral-700">
                      {vp > 0 ? formatCurrency(vp) : '—'}
                    </td>
                    <td className="py-1.5 px-1">
                      <button type="button" onClick={() => removeDisciplina(d.id)}
                        className="p-1 rounded hover:bg-red-50">
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-50 font-semibold">
                <td colSpan={3} className="py-2 px-3 text-xs text-neutral-500">Total MO Direta</td>
                <td className="py-2 px-3 text-right text-neutral-900">{formatCurrency(calc.moDireta)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Terceirizados */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Mapeamento de Terceirizados</h3>
          <button type="button" onClick={addTerceirizado}
            className="flex items-center gap-1 text-xs text-primary-700 hover:text-primary-900 font-medium">
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {f.terceirizados.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">Nenhum terceirizado adicionado</p>
        ) : (
          <div className="space-y-2">
            {f.terceirizados.map(t => (
              <div key={t.id} className="flex gap-2 items-center">
                <input
                  value={t.descricao}
                  onChange={e => updateTerceirizado(t.id, 'descricao', e.target.value)}
                  placeholder="Descrição do serviço"
                  className="flex-1 border border-neutral-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
                />
                <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden w-36">
                  <span className="px-2 text-xs text-neutral-400 bg-neutral-50 border-r border-neutral-200">R$</span>
                  <input
                    type="number" min={0} step={100}
                    value={t.valor || ''}
                    onChange={e => updateTerceirizado(t.id, 'valor', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1.5 text-sm outline-none"
                  />
                </div>
                <button type="button" onClick={() => removeTerceirizado(t.id)}
                  className="p-1.5 rounded hover:bg-red-50">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
            <div className="flex justify-end text-sm font-semibold text-neutral-700 border-t pt-2">
              Total terceirizados: {formatCurrency(calc.totalTerceir)}
            </div>
          </div>
        )}
      </section>

      {/* MO Indireta + Despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">MO Indireta</h3>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="Prospecção (%)" value={f.pctProspeccao} onChange={v => set('pctProspeccao', v)} prefix="%" step={1} />
            <NumInput label="Organização (%)" value={f.pctOrganizacao} onChange={v => set('pctOrganizacao', v)} prefix="%" step={1} />
          </div>
          <div className="flex justify-between text-sm bg-purple-50 rounded-lg px-3 py-2">
            <span className="text-purple-700 font-medium">MO Indireta calculada</span>
            <span className="font-bold text-purple-900">{formatCurrency(calc.moIndireta)}</span>
          </div>
          <NumInput label="Despesas de Escritório" value={f.despesasEscritorio} onChange={v => set('despesasEscritorio', v)} />
        </section>

        <section className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Custos Diretos</h3>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="ART" value={f.art} onChange={v => set('art', v)} />
            <NumInput label="Plotagem" value={f.plotagem} onChange={v => set('plotagem', v)} />
            <NumInput label="Gasolina" value={f.gasolina} onChange={v => set('gasolina', v)} />
            <NumInput label="Hospedagem" value={f.hospedagem} onChange={v => set('hospedagem', v)} />
            <NumInput label="Alimentação" value={f.alimentacao} onChange={v => set('alimentacao', v)} />
          </div>
          <div className="flex justify-between text-sm bg-orange-50 rounded-lg px-3 py-2">
            <span className="text-orange-700 font-medium">Total Custos Diretos</span>
            <span className="font-bold text-orange-900">{formatCurrency(calc.custosDir)}</span>
          </div>
        </section>
      </div>

      {/* Régua de Valores */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Régua de Valores</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Complexidade</label>
            <select value={f.complexidade} onChange={e => set('complexidade', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none">
              <option value="BAIXA">Baixa (−10%)</option>
              <option value="NORMAL">Normal (0%)</option>
              <option value="ALTA">Alta (+10%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Prazo</label>
            <select value={f.prazo} onChange={e => set('prazo', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none">
              <option value="FOLGADO">Folgado (−10%)</option>
              <option value="NORMAL">Normal (0%)</option>
              <option value="APERTADO">Apertado (+10%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Conhecimento</label>
            <select value={f.conhecimento} onChange={e => set('conhecimento', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none">
              <option value="BOA">Bom (−10%)</option>
              <option value="NORMAL">Normal (0%)</option>
              <option value="RUIM">Ruim (+10%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Visibilidade</label>
            <select value={f.visibilidade} onChange={e => set('visibilidade', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none">
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

      {/* Precificação */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Parâmetros de Precificação</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <NumInput label="ISS (%)" value={f.iss} onChange={v => set('iss', v)} prefix="%" step={0.5} />
          <NumInput label="Margem Mín (%)" value={f.margemMin} onChange={v => set('margemMin', Math.min(f.margemMax, v))} prefix="%" step={1} />
          <NumInput label="Margem Máx (%)" value={f.margemMax} onChange={v => set('margemMax', Math.max(f.margemMin, v))} prefix="%" step={1} />
          <div>
            <div className="text-xs text-neutral-500">Subtotal s/ margem</div>
            <div className="font-bold text-neutral-800 text-base">{formatCurrency(calc.subtotal)}</div>
          </div>
        </div>
      </section>

      {/* Régua de Preços */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Régua de Preços</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-neutral-200 p-4 text-center">
            <div className="text-xs font-semibold text-neutral-500 uppercase mb-2">Mínimo</div>
            <div className="text-2xl font-bold text-neutral-800">{formatCurrency(calc.precoMin)}</div>
            <div className="text-xs text-neutral-400 mt-1">margem {f.margemMin}%</div>
          </div>
          <div className="rounded-xl border-2 border-primary-400 bg-primary-50 p-4 text-center relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">Ideal</div>
            <div className="text-xs font-semibold text-primary-600 uppercase mb-2">Recomendado</div>
            <div className="text-2xl font-bold text-primary-700">{formatCurrency(calc.precoIdeal)}</div>
            <div className="text-xs text-neutral-400 mt-1">margem {((f.margemMin + f.margemMax) / 2).toFixed(0)}%</div>
          </div>
          <div className="rounded-xl border border-neutral-200 p-4 text-center">
            <div className="text-xs font-semibold text-neutral-500 uppercase mb-2">Máximo</div>
            <div className="text-2xl font-bold text-neutral-800">{formatCurrency(calc.precoMax)}</div>
            <div className="text-xs text-neutral-400 mt-1">margem {f.margemMax}%</div>
          </div>
        </div>
      </section>

      {/* Valor Adotado */}
      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Valor Adotado</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumInput label="Valor final da proposta" value={f.valorAdotado} onChange={v => set('valorAdotado', v)} />
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Parcelamento</label>
            <input value={f.parcelamento} onChange={e => set('parcelamento', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              placeholder="Ex: 3x sem juros" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Condições de Pagamento</label>
            <input value={f.condicoes} onChange={e => set('condicoes', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
              placeholder="Ex: 50% entrada + 50% entrega" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-neutral-500">Usar:</span>
          {[
            { label: `Mínimo ${formatCurrency(calc.precoMin)}`, val: calc.precoMin },
            { label: `Ideal ${formatCurrency(calc.precoIdeal)}`, val: calc.precoIdeal },
            { label: `Máximo ${formatCurrency(calc.precoMax)}`, val: calc.precoMax },
          ].map(opt => (
            <button key={opt.label} type="button"
              onClick={() => set('valorAdotado', Math.round(opt.val * 100) / 100)}
              className="text-xs px-2 py-0.5 rounded-full border border-primary-300 text-primary-700 hover:bg-primary-50">
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Ações */}
      <div className="flex gap-3 justify-end pb-8">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="button" onClick={() => handleSave('RASCUNHO')} disabled={saveMut.isPending} className="btn-secondary">
          Salvar Rascunho
        </button>
        <button type="button" onClick={() => handleSave('ENVIADO')} disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? 'Salvando…' : 'Salvar e Enviar'}
        </button>
      </div>
    </div>
  );
}
