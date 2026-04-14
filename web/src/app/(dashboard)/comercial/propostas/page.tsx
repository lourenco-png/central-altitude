'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Eye, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Proposta } from '@/types';

export default function PropostasPage() {
  const { data: propostas = [], isLoading } = useQuery<Proposta[]>({
    queryKey: ['propostas'],
    queryFn: () => api.get('/comercial/propostas').then(r => r.data),
  });

  const pdfMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.get(`/comercial/propostas/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('PDF gerado!'),
    onError: () => toast.error('Erro ao gerar PDF'),
  });

  return (
    <div>
      <PageHeader title="Propostas" />

      {isLoading ? (
        <p className="text-neutral-400 text-center py-12">Carregando...</p>
      ) : propostas.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-400">Nenhuma proposta. Gere uma a partir de um orçamento.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {propostas.map((p) => (
            <div key={p.id} className="card p-5">
              {/* Header estilo documento */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-neutral-500">#{p.orcamento?.numero}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <h3 className="font-semibold text-lg text-neutral-900">
                    Proposta — {p.orcamento?.cliente?.nome}
                  </h3>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    Emitida em {formatDate(p.createdAt)} · Validade: {p.validade} dias
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-800">{formatCurrency(p.orcamento?.total || 0)}</p>
                  <p className="text-xs text-neutral-400">{p.orcamento?.itens?.length || 0} item(s)</p>
                </div>
              </div>

              {/* Itens resumo */}
              {p.orcamento?.itens && p.orcamento.itens.length > 0 && (
                <div className="mt-4 border border-neutral-100 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-neutral-500">Serviço</th>
                        <th className="text-right px-3 py-2 text-xs text-neutral-500">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.orcamento.itens.map((item, i) => (
                        <tr key={i} className="border-t border-neutral-100">
                          <td className="px-3 py-2">{item.descricao}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {p.observacoes && (
                <p className="text-sm text-neutral-500 mt-3 italic">{p.observacoes}</p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => pdfMut.mutate(p.id)}
                  disabled={pdfMut.isPending}
                  className="btn-primary"
                >
                  <Download size={15} /> Gerar PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
