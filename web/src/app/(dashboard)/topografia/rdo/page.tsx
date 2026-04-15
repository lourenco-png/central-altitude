'use client';
import { useState, useCallback, useRef } from 'react';
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

async function exportarPDF(rdo: any, obraNome: string) {
  // Carregar jsPDF se necessário
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = () => resolve(); s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Carregar logo como base64
  let logoDataUrl = '';
  try {
    const res = await fetch('/logo.png');
    const blob = await res.blob();
    logoDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { /* sem logo */ }

  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 14;
  let y = 0;

  const fmtD = (d: string) => d ? d.split('-').reverse().join('/') : '—';

  // Paleta do sistema
  const cor = {
    primario:      [46, 125, 50]   as [number,number,number], // primary-800 #2E7D32
    primarioClaro: [200, 230, 201] as [number,number,number], // primary-100 #C8E6C9
    primarioEscuro:[27, 94, 32]    as [number,number,number], // primary-900 #1B5E20
    texto:         [17, 24, 39]    as [number,number,number], // neutral-900
    textoSec:      [107, 114, 128] as [number,number,number], // neutral-500
    fundo:         [245, 245, 245] as [number,number,number], // bg #F5F5F5
    fundoCard:     [255, 255, 255] as [number,number,number], // white
    borda:         [229, 231, 235] as [number,number,number], // neutral-200
    branco:        [255, 255, 255] as [number,number,number],
    verde:         [46, 125, 50]   as [number,number,number],
  };

  const rect = (x: number, ry: number, w: number, h: number, rgb: [number,number,number], stroke = false) => {
    doc.setFillColor(...rgb);
    if (stroke) { doc.setDrawColor(...cor.borda); doc.rect(x, ry, w, h, 'FD'); }
    else doc.rect(x, ry, w, h, 'F');
  };
  const text = (t: string, x: number, ty: number, size = 10, bold = false, color: [number,number,number] = cor.texto, align: 'left'|'center'|'right' = 'left') => {
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color); doc.text(String(t || ''), x, ty, { align });
  };
  const secHeader = (label: string) => {
    rect(margin, y, W - margin * 2, 8, cor.primario);
    text(label, margin + 4, y + 5.5, 9, true, cor.branco);
    y += 11;
  };

  // ── CABEÇALHO ──────────────────────────────────────────────
  rect(0, 0, W, 32, cor.fundoCard);
  doc.setDrawColor(...cor.borda); doc.line(0, 32, W, 32);

  // Logo
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', margin, 4, 22, 22); } catch { /* skip */ }
  }

  // Nome e subtítulo
  text('ALTITUDE TOPOGRAFIA', margin + 26, 11, 14, true, cor.primarioEscuro);
  text('E ENGENHARIA LTDA', margin + 26, 17, 14, true, cor.primarioEscuro);
  text('lourenco@altitudetopo.com.br', margin + 26, 23, 8, false, cor.textoSec);

  // Badge RDO no canto direito
  const rdoBadgeX = W - margin - 42;
  rect(rdoBadgeX, 7, 42, 18, cor.primario);
  text('RELATÓRIO DIÁRIO', rdoBadgeX + 21, 14, 8, true, cor.branco, 'center');
  text('DE OBRA — RDO', rdoBadgeX + 21, 20, 8, true, cor.branco, 'center');

  y = 37;

  // ── DADOS GERAIS ───────────────────────────────────────────
  secHeader('DADOS GERAIS');

  rect(margin, y, W - margin * 2, 26, cor.fundo, true);
  const turnos = [rdo.turnoManha && 'Manhã', rdo.turnoTarde && 'Tarde', rdo.turnoNoite && 'Noite'].filter(Boolean).join(' / ');
  const col2X = W / 2 + 3;
  const labelW = 26;
  [
    ['Nº RDO',     rdo.numero || '—',                              'Obra',        obraNome],
    ['Data',       fmtD(rdo.data?.slice?.(0,10) ?? rdo.data),      'Responsável', rdo.responsavel || '—'],
    ['Endereço',   rdo.endereco || '—',                            'Turno',       turnos || '—'],
  ].forEach(([l1, v1, l2, v2], i) => {
    const ly = y + 5 + i * 8;
    text(l1 + ':', margin + 3, ly, 8, true, cor.textoSec);
    text(v1, margin + 3 + labelW, ly, 9, false, cor.texto);
    text(l2 + ':', col2X, ly, 8, true, cor.textoSec);
    text(v2, col2X + labelW, ly, 9, false, cor.texto);
  });
  y += 30;

  // ── MÃO DE OBRA E EQUIPAMENTOS ─────────────────────────────
  const moi = parse(rdo.moi, []);
  const mod = parse(rdo.mod, []);
  const eq  = parse(rdo.equipamentos, []);
  const colW = (W - margin * 2 - 4) / 3;
  const maxRows = Math.max(
    (moi as any[]).filter((i: any) => i.funcao).length,
    (mod as any[]).filter((i: any) => i.funcao).length,
    (eq  as any[]).filter((i: any) => i.descricao).length,
  );

  secHeader('MÃO DE OBRA E EQUIPAMENTOS');

  [
    { titulo: 'MÃO DE OBRA INDIRETA', items: moi, k1: 'funcao',    k2: 'qtde' },
    { titulo: 'MÃO DE OBRA DIRETA',   items: mod, k1: 'funcao',    k2: 'qtde' },
    { titulo: 'EQUIPAMENTOS',          items: eq,  k1: 'descricao', k2: 'qtde' },
  ].forEach((col, ci) => {
    const cx = margin + ci * (colW + 2);
    const cardH = 8 + maxRows * 7 + 4;
    rect(cx, y, colW, cardH, cor.fundoCard, true);
    rect(cx, y, colW, 7, cor.primarioClaro);
    text(col.titulo, cx + colW / 2, y + 5, 7, true, cor.primarioEscuro, 'center');
    let cy = y + 11;
    (col.items || []).filter((i: any) => i[col.k1]).forEach((item: any) => {
      text(item[col.k1], cx + 3, cy, 8, false, cor.texto);
      text(String(item[col.k2] ?? ''), cx + colW - 3, cy, 8, true, cor.primario, 'right');
      cy += 7;
    });
  });
  y += 8 + maxRows * 7 + 8;

  // ── TAREFAS ────────────────────────────────────────────────
  const tarefas = (parse(rdo.tarefas, []) as string[]).filter((t: string) => t?.trim());
  if (tarefas.length > 0) {
    secHeader('TAREFAS REALIZADAS');
    rect(margin, y, W - margin * 2, tarefas.length * 7 + 4, cor.fundoCard, true);
    tarefas.forEach((t, i) => {
      const lines = doc.splitTextToSize(`${i + 1}.  ${t}`, W - margin * 2 - 8);
      lines.forEach((line: string) => {
        text(line, margin + 4, y + 5, 9, false, cor.texto); y += 6;
      });
      y += 1;
    });
    y += 8;
  }

  // ── OCORRÊNCIAS ────────────────────────────────────────────
  const ocorrencias = (parse(rdo.ocorrencias, []) as string[]).filter((o: string) => o?.trim());
  if (ocorrencias.length > 0) {
    secHeader('OCORRÊNCIAS');
    rect(margin, y, W - margin * 2, ocorrencias.length * 7 + 4, cor.fundoCard, true);
    ocorrencias.forEach((o, i) => {
      const lines = doc.splitTextToSize(`${i + 1}.  ${o}`, W - margin * 2 - 8);
      lines.forEach((line: string) => {
        text(line, margin + 4, y + 5, 9, false, cor.texto); y += 6;
      });
      y += 1;
    });
    y += 8;
  }

  // ── OBSERVAÇÕES ────────────────────────────────────────────
  if (rdo.obs?.trim()) {
    secHeader('OBSERVAÇÕES');
    const lines = doc.splitTextToSize(rdo.obs, W - margin * 2 - 8);
    rect(margin, y, W - margin * 2, lines.length * 6 + 6, cor.fundoCard, true);
    lines.forEach((line: string) => { text(line, margin + 4, y + 5, 9, false, cor.texto); y += 6; });
    y += 10;
  }

  // ── ASSINATURAS ────────────────────────────────────────────
  if (y > 225) { doc.addPage(); y = 20; }
  secHeader('ASSINATURAS');

  const assCols = [
    { titulo: 'RESPONSÁVEL', nome: rdo.responsavel || '—', assinado: rdo.rdoStatus === 'assinado', data: rdo.assinaturaEngData },
    { titulo: 'CONTRATADA',  nome: 'Altitude Topografia',   assinado: rdo.rdoStatus === 'assinado', data: null },
    { titulo: 'CONTRATANTE', nome: obraNome,                 assinado: false, data: null },
  ];
  assCols.forEach((col, ci) => {
    const cx = margin + ci * (colW + 2);
    rect(cx, y, colW, 30, cor.fundoCard, true);
    rect(cx, y, colW, 7, col.assinado ? cor.primarioClaro : cor.fundo);
    text(col.titulo, cx + colW / 2, y + 5, 7, true, cor.primarioEscuro, 'center');
    if (col.assinado) {
      text('ASSINADO', cx + colW / 2, y + 15, 8, true, cor.primario, 'center');
      text(col.nome, cx + colW / 2, y + 21, 8, false, cor.texto, 'center');
      if (col.data) text(fmtD(col.data), cx + colW / 2, y + 27, 7, false, cor.textoSec, 'center');
    } else {
      doc.setDrawColor(...cor.borda); doc.line(cx + 5, y + 24, cx + colW - 5, y + 24);
      text(col.nome, cx + colW / 2, y + 29, 7, false, cor.textoSec, 'center');
    }
  });
  y += 36;

  // ── RODAPÉ ─────────────────────────────────────────────────
  const footerY = 284;
  doc.setDrawColor(...cor.primarioClaro); doc.line(margin, footerY, W - margin, footerY);
  text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}  ·  Central Altitude — Sistema de Gestão`,
    W / 2, footerY + 5, 7, false, cor.textoSec, 'center',
  );

  doc.save(`RDO_${rdo.numero || rdo.id}_${obraNome.replace(/\s+/g, '_')}.pdf`);
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

  const pendingExportRef = useRef(false);
  const saveMut = useMutation({
    mutationFn: (payload: any) =>
      editingId
        ? api.patch(`/topografia/rdo/${editingId}`, payload)
        : api.post('/topografia/rdo', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['rdos'] });
      if (pendingExportRef.current) {
        pendingExportRef.current = false;
        const saved = res.data;
        toast.success(editingId ? 'RDO atualizado!' : 'RDO criado!');
        setView('list');
        exportarPDF(saved, obras.find(o => o.id === saved.obraId)?.nome || '—');
      } else {
        toast.success(editingId ? 'RDO atualizado!' : 'RDO criado!');
        setView('list');
      }
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
          <button type="button" onClick={() => { pendingExportRef.current = true; handleSave('rascunho'); }} disabled={saveMut.isPending} className="btn-primary">
            <Download size={14} /> {saveMut.isPending ? 'Salvando…' : 'Exportar PDF'}
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
            <button onClick={() => exportarPDF(viewRdo, obra?.nome || '—')} className="btn-primary text-sm">
              <Download size={14} /> Exportar PDF
            </button>
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
                  <button onClick={() => exportarPDF(rdo, rdo.obra?.nome || obraNome(rdo.obraId))} className="text-xs py-1.5 px-3 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200">
                    <Download size={13} />
                  </button>
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
