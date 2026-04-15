'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Trash2, Edit2, Eye, CheckCircle, Clock, PenTool, Download, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Obra } from '@/types';

// ── Types ────────────────────────────────────────────────────

interface MaoDeObra { funcao: string; qtde: string | number }
interface Equipamento { descricao: string; qtde: string | number }

interface RdoForm {
  obraId: string;
  numero: string;
  data: string;
  endereco: string;
  responsavel: string;
  turnoManha: boolean;
  turnoTarde: boolean;
  turnoNoite: boolean;
  moi: MaoDeObra[];
  mod: MaoDeObra[];
  equipamentos: Equipamento[];
  tarefas: string[];
  ocorrencias: string[];
  obs: string;
}

function emptyForm(): RdoForm {
  return {
    obraId: '',
    numero: '',
    data: new Date().toISOString().slice(0, 10),
    endereco: '',
    responsavel: '',
    turnoManha: true,
    turnoTarde: true,
    turnoNoite: false,
    moi: [{ funcao: 'ENGENHEIRO', qtde: 1 }, { funcao: '', qtde: '' }],
    mod: [{ funcao: 'TOPÓGRAFO', qtde: 1 }, { funcao: 'AUXILIAR DE TOPOGRAFIA', qtde: 1 }],
    equipamentos: [{ descricao: 'KIT GNSS/RTK', qtde: 1 }, { descricao: 'KIT ESTAÇÃO TOTAL', qtde: 1 }],
    tarefas: ['', '', '', '', '', '', '', '', ''],
    ocorrencias: ['', '', '', '', ''],
    obs: '',
  };
}

const parse = (v: any, fallback: any) => {
  if (!v) return fallback;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fallback; } }
  return v;
};

const STATUS: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  rascunho:              { bg: 'bg-neutral-100', text: 'text-neutral-600',   label: 'Rascunho',              icon: '📝' },
  aguardando_assinatura: { bg: 'bg-yellow-100',  text: 'text-yellow-800',    label: 'Aguardando Assinatura', icon: '⏳' },
  assinado:              { bg: 'bg-green-100',   text: 'text-green-800',     label: 'Assinado',              icon: '✅' },
};

// ── PDF export (client-side jsPDF) ───────────────────────────

function exportarPDF(rdo: any, obraNome: string) {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  script.onload = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, margin = 14;
    let y = 0;

    const fmtD = (d: string) => d ? d.split('-').reverse().join('/') : '—';
    const cor = {
      verde: [29, 184, 100] as [number,number,number],
      preto: [10, 10, 10] as [number,number,number],
      cinza: [100, 116, 139] as [number,number,number],
      cinzaClaro: [241, 245, 249] as [number,number,number],
      branco: [255, 255, 255] as [number,number,number],
    };

    const rect = (x: number, ry: number, w: number, h: number, rgb: [number,number,number]) => {
      doc.setFillColor(...rgb); doc.rect(x, ry, w, h, 'F');
    };
    const text = (t: string, x: number, ty: number, size = 10, bold = false, color: [number,number,number] = cor.preto, align: 'left'|'center'|'right' = 'left') => {
      doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(...color); doc.text(String(t || ''), x, ty, { align });
    };

    // Header
    rect(0, 0, W, 28, cor.preto);
    text('ALTITUDE TOPOGRAFIA E ENGENHARIA LTDA', W / 2, 10, 13, true, cor.branco, 'center');
    text('RUA JACUTINGA, 240 — TORRE 1 APTO 106  |  lourenco@altitudetopo.com.br', W / 2, 17, 8, false, [148, 163, 184], 'center');
    rect(0, 28, W, 12, cor.verde);
    text('RELATÓRIO DIÁRIO DE OBRA (RDO)', W / 2, 36, 12, true, cor.branco, 'center');
    y = 46;

    // Dados gerais
    rect(margin, y, W - margin * 2, 7, cor.cinzaClaro);
    text('DADOS GERAIS', margin + 3, y + 5, 9, true, cor.cinza);
    y += 10;

    const turnos = [rdo.turnoManha && 'Manhã', rdo.turnoTarde && 'Tarde', rdo.turnoNoite && 'Noite'].filter(Boolean).join(' / ');
    [
      ['Nº RDO', rdo.numero || '—', 'Obra', obraNome],
      ['Data', fmtD(rdo.data?.slice?.(0,10) ?? rdo.data), 'Responsável', rdo.responsavel || '—'],
      ['Endereço', rdo.endereco || '—', 'Turno', turnos || '—'],
    ].forEach(([l1, v1, l2, v2]) => {
      text(l1 + ':', margin, y + 4, 8, true, cor.cinza);
      text(v1, margin + 22, y + 4, 9);
      text(l2 + ':', W / 2, y + 4, 8, true, cor.cinza);
      text(v2, W / 2 + 26, y + 4, 9);
      y += 7;
    });
    y += 3;

    // MO e Equipamentos
    const moi = parse(rdo.moi, []);
    const mod = parse(rdo.mod, []);
    const eq  = parse(rdo.equipamentos, []);
    const colW = (W - margin * 2) / 3;

    rect(margin, y, W - margin * 2, 7, cor.cinzaClaro);
    text('MÃO DE OBRA E EQUIPAMENTOS', margin + 3, y + 5, 9, true, cor.cinza);
    y += 10;

    [
      { titulo: 'MÃO DE OBRA INDIRETA', items: moi,  k1: 'funcao',   k2: 'qtde' },
      { titulo: 'MÃO DE OBRA DIRETA',   items: mod,  k1: 'funcao',   k2: 'qtde' },
      { titulo: 'EQUIPAMENTOS',          items: eq,   k1: 'descricao', k2: 'qtde' },
    ].forEach((col, ci) => {
      const cx = margin + ci * colW;
      rect(cx, y, colW - 2, 6, cor.verde);
      text(col.titulo, cx + 2, y + 4, 7, true, cor.branco);
      let cy = y + 8;
      (col.items || []).filter((i: any) => i[col.k1]).forEach((item: any) => {
        text(item[col.k1], cx + 2, cy + 3, 8);
        text(String(item[col.k2] || ''), cx + colW - 10, cy + 3, 8, true, cor.preto, 'right');
        cy += 6;
      });
    });
    y += 8 + Math.max(moi.length, mod.length, eq.length) * 6 + 6;

    // Tarefas
    const tarefas = (parse(rdo.tarefas, []) as string[]).filter((t: string) => t?.trim());
    if (tarefas.length > 0) {
      rect(margin, y, W - margin * 2, 7, cor.cinzaClaro);
      text('TAREFAS REALIZADAS', margin + 3, y + 5, 9, true, cor.cinza);
      y += 10;
      tarefas.forEach((t, i) => {
        const lines = doc.splitTextToSize(`${i + 1}) ${t}`, W - margin * 2 - 4);
        lines.forEach((line: string) => { text(line, margin + 3, y + 4, 9); y += 5; });
        y += 1;
      });
      y += 4;
    }

    // Ocorrências
    const ocorrencias = (parse(rdo.ocorrencias, []) as string[]).filter((o: string) => o?.trim());
    if (ocorrencias.length > 0) {
      rect(margin, y, W - margin * 2, 7, cor.cinzaClaro);
      text('OCORRÊNCIAS', margin + 3, y + 5, 9, true, cor.cinza);
      y += 10;
      ocorrencias.forEach((o, i) => {
        const lines = doc.splitTextToSize(`${i + 1}) ${o}`, W - margin * 2 - 4);
        lines.forEach((line: string) => { text(line, margin + 3, y + 4, 9); y += 5; });
        y += 1;
      });
      y += 4;
    }

    // Observações
    if (rdo.obs) {
      rect(margin, y, W - margin * 2, 7, cor.cinzaClaro);
      text('OBSERVAÇÕES', margin + 3, y + 5, 9, true, cor.cinza);
      y += 10;
      doc.splitTextToSize(rdo.obs, W - margin * 2 - 4).forEach((line: string) => { text(line, margin + 3, y + 4, 9); y += 5; });
      y += 4;
    }

    // Assinaturas
    if (y > 230) { doc.addPage(); y = 20; }
    const assSt = rdo.rdoStatus === 'assinado' ? cor.verde : cor.cinzaClaro;
    rect(margin, y, W - margin * 2, 7, assSt);
    text('ASSINATURAS', margin + 3, y + 5, 9, true, rdo.rdoStatus === 'assinado' ? cor.branco : cor.cinza);
    y += 12;

    [
      { titulo: 'RESPONSÁVEL',  nome: rdo.responsavel || '—', assinado: rdo.rdoStatus === 'assinado', data: rdo.assinaturaEngData },
      { titulo: 'CONTRATADA',   nome: 'Altitude Topografia e Engenharia Ltda', assinado: rdo.rdoStatus === 'assinado', data: null },
      { titulo: 'CONTRATANTE',  nome: obraNome, assinado: false, data: null },
    ].forEach((col, ci) => {
      const cx = margin + ci * colW;
      rect(cx, y, colW - 2, 28, cor.cinzaClaro);
      text(col.titulo, cx + (colW - 2) / 2, y + 5, 7, true, cor.cinza, 'center');
      if (col.assinado) {
        text('✓ ASSINADO ELETRONICAMENTE', cx + (colW - 2) / 2, y + 14, 7, true, cor.verde, 'center');
        text(col.nome, cx + (colW - 2) / 2, y + 20, 8, false, cor.preto, 'center');
        if (col.data) text(col.data.split('-').reverse().join('/'), cx + (colW - 2) / 2, y + 25, 7, false, cor.cinza, 'center');
      } else {
        doc.setDrawColor(...cor.cinza); doc.line(cx + 4, y + 22, cx + colW - 6, y + 22);
        text(col.nome, cx + (colW - 2) / 2, y + 27, 7, false, cor.cinza, 'center');
      }
    });
    y += 34;

    // Rodapé
    rect(0, 285, W, 12, cor.preto);
    text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}  |  Central Altitude — Topografia`, W / 2, 292, 7, false, [148, 163, 184] as any, 'center');
    if (rdo.rdoStatus === 'assinado') {
      text('Assinatura eletrônica com validade jurídica — MP 2.200-2/2001', W / 2, 297, 6, false, cor.verde, 'center');
    }

    doc.save(`RDO_${rdo.numero || rdo.id}_${obraNome.replace(/\s+/g, '_')}.pdf`);
  };
  document.head.appendChild(script);
}

// ── Subcomponents ────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-neutral-800">{value || '—'}</p>
    </div>
  );
}

function TabelaMO({ titulo, items, keyA, keyB, col1, col2 }: any) {
  const rows = (items || []).filter((i: any) => i[keyA]);
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-bold text-neutral-500 bg-neutral-100 rounded px-2 py-1 mb-2">{titulo}</div>
      <table className="w-full text-xs">
        <thead><tr><th className="text-left pb-1 text-neutral-400">{col1}</th><th className="text-right pb-1 text-neutral-400">{col2}</th></tr></thead>
        <tbody>
          {rows.map((item: any, i: number) => (
            <tr key={i} className="border-t border-neutral-100">
              <td className="py-1">{item[keyA]}</td>
              <td className="py-1 text-right font-semibold">{item[keyB]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function RdoPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewRdo, setViewRdo] = useState<any>(null);
  const [form, setForm] = useState<RdoForm>(emptyForm());
  const [filter, setFilter] = useState('');
  const [showAssinar, setShowAssinar] = useState(false);
  const [nomeAssinar, setNomeAssinar] = useState('');

  const { data: rdos = [], isLoading } = useQuery<any[]>({
    queryKey: ['rdos'],
    queryFn: () => api.get('/topografia/rdo').then(r => r.data),
  });

  const { data: obras = [] } = useQuery<Obra[]>({
    queryKey: ['obras'],
    queryFn: () => api.get('/topografia/obras').then(r => r.data),
  });

  const setF = useCallback((key: keyof RdoForm, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const saveMut = useMutation({
    mutationFn: (payload: any) =>
      editingId
        ? api.patch(`/topografia/rdo/${editingId}`, payload)
        : api.post('/topografia/rdo', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['rdos'] });
      toast.success(editingId ? 'RDO atualizado!' : 'RDO criado!');
      setView('list');
    },
    onError: () => toast.error('Erro ao salvar RDO'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/topografia/rdo/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rdos'] }); toast.success('RDO excluído'); },
  });

  const assinarMut = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) =>
      api.post(`/topografia/rdo/${id}/assinar-eng`, { nome }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['rdos'] });
      setViewRdo(res.data);
      setShowAssinar(false);
      toast.success('RDO assinado com sucesso!');
    },
    onError: () => toast.error('Erro ao assinar'),
  });

  const enviarMut = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/topografia/rdo/${id}`, { rdoStatus: 'aguardando_assinatura' }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['rdos'] });
      setViewRdo(res.data);
      toast.success('RDO enviado para assinatura!');
    },
  });

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setView('form');
  }

  function openEdit(rdo: any) {
    setEditingId(rdo.id);
    setForm({
      obraId: rdo.obraId || '',
      numero: rdo.numero || '',
      data: rdo.data?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      endereco: rdo.endereco || '',
      responsavel: rdo.responsavel || '',
      turnoManha: rdo.turnoManha ?? true,
      turnoTarde: rdo.turnoTarde ?? true,
      turnoNoite: rdo.turnoNoite ?? false,
      moi: parse(rdo.moi, emptyForm().moi),
      mod: parse(rdo.mod, emptyForm().mod),
      equipamentos: parse(rdo.equipamentos, emptyForm().equipamentos),
      tarefas: parse(rdo.tarefas, emptyForm().tarefas),
      ocorrencias: parse(rdo.ocorrencias, emptyForm().ocorrencias),
      obs: rdo.obs || '',
    });
    setView('form');
  }

  function openView(rdo: any) {
    setViewRdo(rdo);
    setView('detail');
  }

  function handleSave(rdoStatus: string) {
    if (!form.obraId) { toast.error('Selecione a obra'); return; }
    saveMut.mutate({
      obraId: form.obraId,
      numero: form.numero || null,
      data: new Date(form.data + 'T12:00:00'),
      endereco: form.endereco || null,
      responsavel: form.responsavel || null,
      turnoManha: form.turnoManha,
      turnoTarde: form.turnoTarde,
      turnoNoite: form.turnoNoite,
      moi: form.moi,
      mod: form.mod,
      equipamentos: form.equipamentos,
      tarefas: form.tarefas,
      ocorrencias: form.ocorrencias,
      obs: form.obs || null,
      rdoStatus,
    });
  }

  const obraNome = (id: string) => obras.find(o => o.id === id)?.nome || '—';
  const rdosFiltrados = filter
    ? rdos.filter(r => r.obra?.nome?.toLowerCase().includes(filter.toLowerCase()) || r.responsavel?.toLowerCase().includes(filter.toLowerCase()))
    : rdos;

  // ── FORM ──────────────────────────────────────────────────
  if (view === 'form') return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('list')} className="btn-secondary"><ChevronLeft size={15} /> Voltar</button>
        <h2 className="text-xl font-bold">{editingId ? 'Editar RDO' : 'Novo RDO'}</h2>
      </div>

      <div className="space-y-6 max-w-4xl">

        {/* Dados Gerais */}
        <section className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide border-b pb-2">Dados Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Obra *</label>
              <select value={form.obraId} onChange={e => setF('obraId', e.target.value)} className="input">
                <option value="">Selecione a obra…</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nº do RDO</label>
              <input value={form.numero} onChange={e => setF('numero', e.target.value)} className="input" placeholder="Ex: 001" />
            </div>
            <div>
              <label className="label">Data *</label>
              <input type="date" value={form.data} onChange={e => setF('data', e.target.value)} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Endereço da Obra</label>
              <input value={form.endereco} onChange={e => setF('endereco', e.target.value)} className="input" placeholder="Endereço completo" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Responsável *</label>
              <input value={form.responsavel} onChange={e => setF('responsavel', e.target.value)} className="input" placeholder="Nome do engenheiro responsável" />
            </div>
          </div>
          <div>
            <label className="label">Turno</label>
            <div className="flex gap-3">
              {([['turnoManha', '🌅 Manhã'], ['turnoTarde', '🌇 Tarde'], ['turnoNoite', '🌙 Noite']] as const).map(([key, label]) => (
                <label key={key} className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border font-semibold text-sm transition-colors ${form[key] ? 'bg-green-50 border-green-400 text-green-800' : 'bg-neutral-50 border-neutral-200 text-neutral-500'}`}>
                  <input type="checkbox" checked={form[key]} onChange={e => setF(key, e.target.checked)} className="hidden" />
                  {form[key] ? '✅' : '⬜'} {label}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Mão de Obra e Equipamentos */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide border-b pb-2 mb-4">Mão de Obra e Equipamentos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MO Indireta */}
            <div>
              <div className="text-xs font-bold text-neutral-500 bg-neutral-100 rounded px-2 py-1.5 mb-3">Mão de Obra Indireta</div>
              {form.moi.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={item.funcao} onChange={e => { const moi = [...form.moi]; moi[i] = { ...moi[i], funcao: e.target.value }; setF('moi', moi); }} className="input flex-1 text-xs py-1.5" placeholder="Função/Cargo" />
                  <input type="number" value={item.qtde} onChange={e => { const moi = [...form.moi]; moi[i] = { ...moi[i], qtde: e.target.value }; setF('moi', moi); }} className="input w-16 text-xs py-1.5 text-center" placeholder="Qtde" />
                </div>
              ))}
              <button type="button" onClick={() => setF('moi', [...form.moi, { funcao: '', qtde: '' }])} className="text-xs text-primary-700 font-semibold hover:underline">+ Adicionar</button>
            </div>
            {/* MO Direta */}
            <div>
              <div className="text-xs font-bold text-neutral-500 bg-neutral-100 rounded px-2 py-1.5 mb-3">Mão de Obra Direta</div>
              {form.mod.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={item.funcao} onChange={e => { const mod = [...form.mod]; mod[i] = { ...mod[i], funcao: e.target.value }; setF('mod', mod); }} className="input flex-1 text-xs py-1.5" placeholder="Função/Cargo" />
                  <input type="number" value={item.qtde} onChange={e => { const mod = [...form.mod]; mod[i] = { ...mod[i], qtde: e.target.value }; setF('mod', mod); }} className="input w-16 text-xs py-1.5 text-center" placeholder="Qtde" />
                </div>
              ))}
              <button type="button" onClick={() => setF('mod', [...form.mod, { funcao: '', qtde: '' }])} className="text-xs text-primary-700 font-semibold hover:underline">+ Adicionar</button>
            </div>
            {/* Equipamentos */}
            <div>
              <div className="text-xs font-bold text-neutral-500 bg-neutral-100 rounded px-2 py-1.5 mb-3">Equipamentos</div>
              {form.equipamentos.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={item.descricao} onChange={e => { const eq = [...form.equipamentos]; eq[i] = { ...eq[i], descricao: e.target.value }; setF('equipamentos', eq); }} className="input flex-1 text-xs py-1.5" placeholder="Descrição" />
                  <input type="number" value={item.qtde} onChange={e => { const eq = [...form.equipamentos]; eq[i] = { ...eq[i], qtde: e.target.value }; setF('equipamentos', eq); }} className="input w-16 text-xs py-1.5 text-center" placeholder="Qtde" />
                </div>
              ))}
              <button type="button" onClick={() => setF('equipamentos', [...form.equipamentos, { descricao: '', qtde: '' }])} className="text-xs text-primary-700 font-semibold hover:underline">+ Adicionar</button>
            </div>
          </div>
        </section>

        {/* Tarefas */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide border-b pb-2 mb-4">Tarefas Realizadas</h3>
          <div className="space-y-2">
            {form.tarefas.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-neutral-400 w-6 text-right">{i + 1})</span>
                <input value={t} onChange={e => { const tarefas = [...form.tarefas]; tarefas[i] = e.target.value; setF('tarefas', tarefas); }} className="input flex-1" placeholder={`Tarefa ${i + 1}`} />
              </div>
            ))}
            <button type="button" onClick={() => setF('tarefas', [...form.tarefas, ''])} className="text-xs text-primary-700 font-semibold hover:underline ml-9">+ Adicionar linha</button>
          </div>
        </section>

        {/* Ocorrências */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide border-b pb-2 mb-4">Ocorrências</h3>
          <div className="space-y-2">
            {form.ocorrencias.map((o, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-neutral-400 w-6 text-right">{i + 1})</span>
                <input value={o} onChange={e => { const oc = [...form.ocorrencias]; oc[i] = e.target.value; setF('ocorrencias', oc); }} className="input flex-1" placeholder={`Ocorrência ${i + 1}`} />
              </div>
            ))}
            <button type="button" onClick={() => setF('ocorrencias', [...form.ocorrencias, ''])} className="text-xs text-primary-700 font-semibold hover:underline ml-9">+ Adicionar linha</button>
          </div>
        </section>

        {/* Observações */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide border-b pb-2 mb-4">Observações Gerais</h3>
          <textarea value={form.obs} onChange={e => setF('obs', e.target.value)} className="input min-h-[80px]" placeholder="Observações adicionais..." />
        </section>

        {/* Ações */}
        <div className="flex gap-3 justify-end pb-8">
          <button type="button" onClick={() => setView('list')} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={() => handleSave('rascunho')} disabled={saveMut.isPending} className="btn-secondary">
            💾 Salvar Rascunho
          </button>
          <button type="button" onClick={() => handleSave('aguardando_assinatura')} disabled={saveMut.isPending} className="btn-primary">
            {saveMut.isPending ? 'Salvando…' : '✅ Enviar para Assinatura'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── DETAIL ────────────────────────────────────────────────
  if (view === 'detail' && viewRdo) {
    const moi = parse(viewRdo.moi, []);
    const mod = parse(viewRdo.mod, []);
    const eq  = parse(viewRdo.equipamentos, []);
    const tarefas  = (parse(viewRdo.tarefas, []) as string[]).filter((t: string) => t?.trim());
    const ocorrencias = (parse(viewRdo.ocorrencias, []) as string[]).filter((o: string) => o?.trim());
    const st = STATUS[viewRdo.rdoStatus] || STATUS.rascunho;
    const turnos = [viewRdo.turnoManha && 'Manhã', viewRdo.turnoTarde && 'Tarde', viewRdo.turnoNoite && 'Noite'].filter(Boolean);
    const obra = obras.find(o => o.id === viewRdo.obraId);

    return (
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="btn-secondary"><ChevronLeft size={15} /> Voltar</button>
            <div>
              <h2 className="text-xl font-bold">RDO {viewRdo.numero ? `Nº ${viewRdo.numero}` : ''}</h2>
              <p className="text-sm text-neutral-500">Altitude Topografia e Engenharia Ltda</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${st.bg} ${st.text}`}>{st.icon} {st.label}</span>
            {viewRdo.rdoStatus === 'aguardando_assinatura' && (
              <button onClick={() => { setNomeAssinar(viewRdo.responsavel || ''); setShowAssinar(true); }} className="btn-primary text-sm">
                <PenTool size={14} /> Assinar RDO
              </button>
            )}
            {viewRdo.rdoStatus === 'assinado' && (
              <button onClick={() => exportarPDF(viewRdo, obra?.nome || '—')} className="btn-primary text-sm">
                <Download size={14} /> Exportar PDF
              </button>
            )}
            {viewRdo.rdoStatus === 'rascunho' && (
              <button onClick={() => enviarMut.mutate(viewRdo.id)} disabled={enviarMut.isPending} className="btn-secondary text-sm">
                ✅ Enviar para Assinatura
              </button>
            )}
            <button onClick={() => openEdit(viewRdo)} className="btn-secondary text-sm"><Edit2 size={14} /> Editar</button>
          </div>
        </div>

        <div className="space-y-5 max-w-4xl">
          {/* Dados */}
          <div className="card p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoRow label="Obra" value={obra?.nome || '—'} />
            <InfoRow label="Data" value={formatDate(viewRdo.data)} />
            <InfoRow label="Responsável" value={viewRdo.responsavel || '—'} />
            <InfoRow label="Endereço" value={viewRdo.endereco || '—'} />
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Turno</p>
              <div className="flex gap-1.5 flex-wrap">
                {turnos.length > 0 ? turnos.map(t => (
                  <span key={t as string} className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-semibold">{t as string}</span>
                )) : <span className="text-sm text-neutral-400">—</span>}
              </div>
            </div>
          </div>

          {/* MO e Equipamentos */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">Mão de Obra e Equipamentos</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TabelaMO titulo="Mão de Obra Indireta" items={moi} col1="Função/Cargo" col2="Qtde" keyA="funcao" keyB="qtde" />
              <TabelaMO titulo="Mão de Obra Direta"   items={mod} col1="Função/Cargo" col2="Qtde" keyA="funcao" keyB="qtde" />
              <TabelaMO titulo="Equipamentos"          items={eq}  col1="Descrição"   col2="Qtde" keyA="descricao" keyB="qtde" />
            </div>
          </div>

          {/* Tarefas */}
          {tarefas.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Tarefas Realizadas</h3>
              <ol className="space-y-1.5 list-decimal list-inside">
                {tarefas.map((t, i) => <li key={i} className="text-sm text-neutral-700">{t}</li>)}
              </ol>
            </div>
          )}

          {/* Ocorrências */}
          {ocorrencias.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Ocorrências</h3>
              <ol className="space-y-1.5 list-decimal list-inside">
                {ocorrencias.map((o, i) => <li key={i} className="text-sm text-neutral-700">{o}</li>)}
              </ol>
            </div>
          )}

          {/* Observações */}
          {viewRdo.obs && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Observações</h3>
              <p className="text-sm text-neutral-700 whitespace-pre-line">{viewRdo.obs}</p>
            </div>
          )}

          {/* Assinaturas */}
          <div className={`card p-5 ${viewRdo.rdoStatus === 'assinado' ? 'border-green-300 bg-green-50' : ''}`}>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">Assinaturas</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { titulo: 'Responsável',  nome: viewRdo.responsavel || '—', assinado: viewRdo.rdoStatus === 'assinado', data: viewRdo.assinaturaEngData },
                { titulo: 'Contratada',   nome: 'Altitude Topografia', assinado: viewRdo.rdoStatus === 'assinado', data: null },
                { titulo: 'Contratante',  nome: obra?.nome || '—', assinado: false, data: null },
              ].map(col => (
                <div key={col.titulo} className="bg-white rounded-xl border border-neutral-200 p-4 text-center">
                  <p className="text-xs font-bold text-neutral-400 uppercase mb-3">{col.titulo}</p>
                  {col.assinado ? (
                    <>
                      <p className="text-xs font-bold text-green-600 mb-1">✓ ASSINADO ELETRONICAMENTE</p>
                      <p className="text-sm font-medium text-neutral-800">{col.nome}</p>
                      {col.data && <p className="text-xs text-neutral-400 mt-1">{col.data.split('-').reverse().join('/')}</p>}
                    </>
                  ) : (
                    <>
                      <div className="border-b border-neutral-300 mt-8 mb-2" />
                      <p className="text-xs text-neutral-400">{col.nome}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal assinatura */}
        {showAssinar && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-bold mb-1">✍️ Assinar RDO</h3>
              <p className="text-sm text-neutral-500 mb-5">Confirme o nome para assinar eletronicamente</p>
              <label className="label">Nome do Responsável</label>
              <input value={nomeAssinar} onChange={e => setNomeAssinar(e.target.value)} className="input mb-5" placeholder="Nome completo..." />
              <div className="flex gap-3">
                <button onClick={() => setShowAssinar(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={() => assinarMut.mutate({ id: viewRdo.id, nome: nomeAssinar })} disabled={assinarMut.isPending || !nomeAssinar.trim()} className="btn-primary flex-1">
                  {assinarMut.isPending ? 'Assinando…' : '✅ Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST ──────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Relatório Diário de Obra (RDO)"
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Novo RDO</button>}
      />

      {/* Filtro + contadores */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="🔍 Buscar por obra ou responsável..."
          className="input w-72"
        />
        <div className="flex gap-2 ml-auto flex-wrap">
          {Object.entries(STATUS).map(([k, v]) => (
            <span key={k} className={`text-xs px-3 py-1 rounded-full font-bold ${v.bg} ${v.text}`}>
              {v.icon} {rdos.filter(r => r.rdoStatus === k).length} {v.label}
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-400 text-center py-12">Carregando...</p>
      ) : rdosFiltrados.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="font-semibold text-neutral-600">Nenhum RDO encontrado</p>
          <p className="text-sm text-neutral-400 mt-1">Crie o primeiro RDO clicando em &quot;+ Novo RDO&quot;</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rdosFiltrados.map(rdo => {
            const st = STATUS[rdo.rdoStatus] || STATUS.rascunho;
            const borderColor = rdo.rdoStatus === 'assinado' ? 'border-l-green-500' : rdo.rdoStatus === 'aguardando_assinatura' ? 'border-l-yellow-400' : 'border-l-neutral-300';
            return (
              <div key={rdo.id} className={`card p-4 flex items-center gap-4 cursor-pointer hover:border-primary-300 border-l-4 ${borderColor}`} onClick={() => openView(rdo)}>
                {/* Date badge */}
                <div className="min-w-[52px] text-center bg-primary-50 rounded-xl py-2 px-1">
                  <div className="text-xs font-bold text-neutral-400">{rdo.data?.slice(5,7)}/{rdo.data?.slice(0,4)}</div>
                  <div className="text-2xl font-black text-neutral-800 leading-none">{rdo.data?.slice(8,10)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-neutral-900">
                      {rdo.numero ? `RDO Nº${rdo.numero} · ` : ''}{rdo.obra?.nome || obraNome(rdo.obraId)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${st.bg} ${st.text}`}>{st.icon} {st.label}</span>
                  </div>
                  {rdo.responsavel && <p className="text-sm text-neutral-500">👷 {rdo.responsavel}</p>}
                </div>
                <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openView(rdo)} className="btn-secondary text-xs py-1.5 px-3"><Eye size={13} /> Ver</button>
                  <button onClick={() => openEdit(rdo)} className="btn-secondary text-xs py-1.5 px-3"><Edit2 size={13} /></button>
                  {rdo.rdoStatus === 'assinado' && (
                    <button onClick={() => exportarPDF(rdo, rdo.obra?.nome || obraNome(rdo.obraId))} className="text-xs py-1.5 px-3 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200">
                      <Download size={13} />
                    </button>
                  )}
                  <button onClick={() => { if (confirm('Excluir RDO?')) deleteMut.mutate(rdo.id); }} className="text-xs py-1.5 px-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
