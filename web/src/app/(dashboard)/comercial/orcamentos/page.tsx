'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FileText, ChevronLeft, Download, Link2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OrcamentoTopografia } from './OrcamentoTopografia';
import { OrcamentoInfraPredial } from './OrcamentoInfraPredial';
import toast from 'react-hot-toast';
import type { Orcamento } from '@/types';

type Tela = 'lista' | 'novo-tipo' | 'form-topo' | 'form-infra' | 'editar';

// ── PDF export ────────────────────────────────────────────────
async function exportarPDFOrcamento(orc: any) {
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = () => resolve(); s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  let logoDataUrl = '';
  try {
    const res = await fetch('/logo.png');
    const blob = await res.blob();
    logoDataUrl = await new Promise<string>(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(blob); });
  } catch { /* skip */ }

  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  let y = 0;
  const cor = {
    verde: [46, 125, 50] as [number,number,number],
    verdeEsc: [27, 94, 32] as [number,number,number],
    verdeClaro: [200, 230, 201] as [number,number,number],
    texto: [17, 24, 39] as [number,number,number],
    sec: [107, 114, 128] as [number,number,number],
    fundo: [245, 245, 245] as [number,number,number],
    borda: [229, 231, 235] as [number,number,number],
    branco: [255, 255, 255] as [number,number,number],
  };
  const rect = (x: number, ry: number, w: number, h: number, rgb: [number,number,number]) => { doc.setFillColor(...rgb); doc.rect(x, ry, w, h, 'F'); };
  const text = (t: string, x: number, ty: number, size = 10, bold = false, color: [number,number,number] = cor.texto, align: 'left'|'center'|'right' = 'left') => {
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...color); doc.text(String(t || ''), x, ty, { align });
  };

  // Header
  rect(0, 0, W, 32, cor.branco);
  doc.setDrawColor(...cor.borda); doc.line(0, 32, W, 32);
  if (logoDataUrl) { try { doc.addImage(logoDataUrl, 'PNG', M, 4, 22, 22); } catch {} }
  text('ALTITUDE TOPOGRAFIA', M + 26, 11, 14, true, cor.verdeEsc);
  text('E ENGENHARIA LTDA', M + 26, 17, 14, true, cor.verdeEsc);
  text('lourenco@altitudetopo.com.br', M + 26, 23, 8, false, cor.sec);
  const badgeX = W - M - 42;
  rect(badgeX, 7, 42, 18, cor.verde);
  text('PROPOSTA', badgeX + 21, 13, 9, true, cor.branco, 'center');
  text(`Nº ${orc.numero}`, badgeX + 21, 20, 9, true, cor.branco, 'center');
  y = 37;

  // Info cliente
  rect(M, y, W - M * 2, 8, cor.verde);
  text('DADOS DA PROPOSTA', M + 4, y + 5.5, 9, true, cor.branco);
  y += 11;
  rect(M, y, W - M * 2, 22, cor.fundo);
  doc.setDrawColor(...cor.borda); doc.rect(M, y, W - M * 2, 22, 'D');
  text('Cliente:', M + 3, y + 6, 8, true, cor.sec);
  text(orc.cliente?.nome || '—', M + 28, y + 6, 9, false, cor.texto);
  text('Emitido em:', M + 3, y + 13, 8, true, cor.sec);
  text(new Date(orc.createdAt).toLocaleDateString('pt-BR'), M + 28, y + 13, 9, false, cor.texto);
  text('Status:', M + 3, y + 20, 8, true, cor.sec);
  text(orc.status, M + 28, y + 20, 9, false, cor.texto);
  y += 26;

  // Itens
  rect(M, y, W - M * 2, 8, cor.verde);
  text('ITENS DO ORÇAMENTO', M + 4, y + 5.5, 9, true, cor.branco);
  y += 11;
  // Cabeçalho tabela
  rect(M, y, W - M * 2, 7, cor.verdeClaro);
  text('Descrição', M + 3, y + 5, 8, true, cor.verdeEsc);
  text('Qtd', W - M - 50, y + 5, 8, true, cor.verdeEsc, 'right');
  text('Unit.', W - M - 28, y + 5, 8, true, cor.verdeEsc, 'right');
  text('Total', W - M - 2, y + 5, 8, true, cor.verdeEsc, 'right');
  y += 9;
  (orc.itens || []).forEach((item: any, i: number) => {
    if (i % 2 === 1) rect(M, y - 1, W - M * 2, 8, cor.fundo);
    const lines = doc.splitTextToSize(item.descricao, W - M * 2 - 70);
    text(lines[0], M + 3, y + 4, 8, false, cor.texto);
    text(String(item.quantidade), W - M - 50, y + 4, 8, false, cor.texto, 'right');
    text(formatCurrencyStr(item.unitario), W - M - 28, y + 4, 8, false, cor.texto, 'right');
    text(formatCurrencyStr(item.total), W - M - 2, y + 4, 8, false, cor.texto, 'right');
    y += 8;
  });
  // Total
  y += 3;
  rect(W - M - 70, y, 70, 10, cor.verde);
  text('TOTAL', W - M - 38, y + 7, 9, true, cor.branco);
  text(formatCurrencyStr(orc.total), W - M - 2, y + 7, 10, true, cor.branco, 'right');
  y += 16;

  // Condições
  if (orc.condicoes) {
    rect(M, y, W - M * 2, 8, cor.verde);
    text('CONDIÇÕES', M + 4, y + 5.5, 9, true, cor.branco);
    y += 11;
    doc.setDrawColor(...cor.borda);
    const lines = doc.splitTextToSize(orc.condicoes, W - M * 2 - 6);
    rect(M, y, W - M * 2, lines.length * 6 + 6, cor.fundo);
    doc.rect(M, y, W - M * 2, lines.length * 6 + 6, 'D');
    lines.forEach((l: string) => { text(l, M + 4, y + 5, 9, false, cor.texto); y += 6; });
    y += 8;
  }

  // Rodapé
  doc.setDrawColor(...cor.verdeClaro); doc.line(M, 284, W - M, 284);
  text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · Central Altitude — Sistema de Gestão`, W / 2, 289, 7, false, cor.sec, 'center');

  doc.save(`Orcamento_${orc.numero}_${(orc.cliente?.nome || 'cliente').replace(/\s+/g, '_')}.pdf`);
}

function formatCurrencyStr(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

// ─────────────────────────────────────────────────────────────

export default function OrcamentosPage() {
  const qc = useQueryClient();
  const [tela, setTela] = useState<Tela>('lista');
  const [editando, setEditando] = useState<Orcamento | null>(null);

  const { data: orcamentos = [], isLoading } = useQuery<Orcamento[]>({
    queryKey: ['orcamentos'],
    queryFn: () => api.get('/comercial/orcamentos').then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/comercial/orcamentos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); toast.success('Removido'); },
  });

  const createPropostaMut = useMutation({
    mutationFn: (orcamentoId: string) => api.post('/comercial/propostas', { orcamentoId }),
    onSuccess: () => toast.success('Proposta gerada!'),
  });

  const gerarLinkMut = useMutation({
    mutationFn: (id: string) => api.post(`/comercial/orcamentos/${id}/gerar-link-aprovacao`).then(r => r.data),
    onSuccess: (data) => {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${base}/proposta/${data.token}`;
      navigator.clipboard.writeText(link).then(() => toast.success('Link copiado para a área de transferência!'));
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
    },
    onError: () => toast.error('Erro ao gerar link'),
  });

  const tipoLabel: Record<string, string> = { TOPOGRAFIA: 'Topografia', INFRA_PREDIAL: 'Infra/Predial', GENERICO: 'Genérico' };
  const tipoBadge: Record<string, string> = { TOPOGRAFIA: 'bg-blue-100 text-blue-800', INFRA_PREDIAL: 'bg-purple-100 text-purple-800', GENERICO: 'bg-neutral-100 text-neutral-600' };

  if (tela === 'form-topo') return (
    <div>
      <button onClick={() => setTela('lista')} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-4"><ChevronLeft size={16} /> Voltar</button>
      <OrcamentoTopografia orcamento={editando} onSaved={() => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); setTela('lista'); setEditando(null); }} onCancel={() => { setTela('lista'); setEditando(null); }} />
    </div>
  );

  if (tela === 'form-infra') return (
    <div>
      <button onClick={() => setTela('lista')} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-4"><ChevronLeft size={16} /> Voltar</button>
      <OrcamentoInfraPredial orcamento={editando} onSaved={() => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); setTela('lista'); setEditando(null); }} onCancel={() => { setTela('lista'); setEditando(null); }} />
    </div>
  );

  if (tela === 'novo-tipo') return (
    <div>
      <button onClick={() => setTela('lista')} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-4"><ChevronLeft size={16} /> Voltar</button>
      <PageHeader title="Novo Orçamento" subtitle="Selecione o tipo de orçamento" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
        <button onClick={() => { setEditando(null); setTela('form-topo'); }} className="card p-6 text-left hover:border-primary-400 hover:bg-primary-50 transition-all group">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3"><span className="text-blue-700 font-bold text-sm">TOP</span></div>
          <h3 className="font-semibold text-neutral-900 group-hover:text-primary-800">Topografia</h3>
          <p className="text-sm text-neutral-500 mt-1">Levantamentos, georeferenciamento, mapeamento</p>
        </button>
        <button onClick={() => { setEditando(null); setTela('form-infra'); }} className="card p-6 text-left hover:border-primary-400 hover:bg-primary-50 transition-all group">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3"><span className="text-purple-700 font-bold text-sm">INF</span></div>
          <h3 className="font-semibold text-neutral-900 group-hover:text-primary-800">Infra & Predial</h3>
          <p className="text-sm text-neutral-500 mt-1">Água, esgoto, drenagem, terraplanagem, macrodrenagem</p>
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Orçamentos" actions={<button onClick={() => setTela('novo-tipo')} className="btn-primary"><Plus size={16} /> Novo Orçamento</button>} />

      {isLoading ? (
        <p className="text-neutral-400 text-center py-12">Carregando...</p>
      ) : orcamentos.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 mb-4">Nenhum orçamento criado</p>
          <button onClick={() => setTela('novo-tipo')} className="btn-primary mx-auto"><Plus size={16} /> Criar primeiro orçamento</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Nº</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Aprovação</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Data</th>
                <th className="w-36" />
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium">#{o.numero}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tipoBadge[(o as any).tipo] || tipoBadge.GENERICO}`}>
                      {tipoLabel[(o as any).tipo] || 'Genérico'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{o.cliente?.nome || '-'}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(o.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    {(o as any).aprovacaoResposta === 'APROVADO' && <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle size={12} /> Aprovado pelo cliente</span>}
                    {(o as any).aprovacaoResposta === 'REJEITADO' && <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium"><XCircle size={12} /> Rejeitado</span>}
                    {!(o as any).aprovacaoResposta && (o as any).aprovacaoToken && <span className="text-xs text-neutral-400">Aguardando cliente</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditando(o); setTela((o as any).tipo === 'INFRA_PREDIAL' ? 'form-infra' : 'form-topo'); }} className="p-1.5 rounded hover:bg-neutral-100" title="Editar"><Edit2 size={14} className="text-neutral-500" /></button>
                      <button onClick={() => exportarPDFOrcamento(o)} className="p-1.5 rounded hover:bg-green-50" title="Exportar PDF"><Download size={14} className="text-green-700" /></button>
                      <button onClick={() => gerarLinkMut.mutate(o.id)} disabled={gerarLinkMut.isPending} className="p-1.5 rounded hover:bg-blue-50" title="Copiar link de aprovação para o cliente"><Link2 size={14} className="text-blue-600" /></button>
                      {!(o as any).proposta && (
                        <button onClick={() => createPropostaMut.mutate(o.id)} className="p-1.5 rounded hover:bg-primary-50" title="Gerar Proposta"><FileText size={14} className="text-primary-700" /></button>
                      )}
                      <button onClick={() => { if (confirm('Excluir?')) deleteMut.mutate(o.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
