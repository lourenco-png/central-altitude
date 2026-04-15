'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, FileText, Building2 } from 'lucide-react';
import axios from 'axios';

const publicApi = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001' });

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function PropostaPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const [mensagem, setMensagem] = useState('');
  const [respondido, setRespondido] = useState<'aprovado' | 'rejeitado' | null>(null);

  const { data: orc, isLoading, isError } = useQuery({
    queryKey: ['proposta-publica', token],
    queryFn: () => publicApi.get(`/publico/proposta/${token}`).then(r => r.data),
    enabled: !!token,
    retry: false,
  });

  const responderMut = useMutation({
    mutationFn: (aprovado: boolean) =>
      publicApi.post(`/publico/proposta/${token}/responder`, { aprovado, mensagem }),
    onSuccess: (_, aprovado) => setRespondido(aprovado ? 'aprovado' : 'rejeitado'),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-200 border-t-green-700 rounded-full animate-spin" />
    </div>
  );

  if (isError || !orc) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center">
        <FileText size={48} className="text-neutral-300 mx-auto mb-4" />
        <p className="text-lg font-semibold text-neutral-600">Proposta não encontrada</p>
        <p className="text-sm text-neutral-400 mt-1">O link pode estar inválido ou expirado.</p>
      </div>
    </div>
  );

  if (respondido || orc.aprovacaoResposta) {
    const resp = respondido || orc.aprovacaoResposta?.toLowerCase();
    const aprovado = resp === 'aprovado';
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          {aprovado ? (
            <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle size={56} className="text-red-400 mx-auto mb-4" />
          )}
          <h2 className="text-xl font-bold mb-2">
            {aprovado ? 'Proposta Aprovada!' : 'Proposta Rejeitada'}
          </h2>
          <p className="text-neutral-500 text-sm">
            {aprovado
              ? 'Obrigado! Nossa equipe entrará em contato em breve.'
              : 'Resposta registrada. Entre em contato se desejar revisar.'}
          </p>
          <p className="text-xs text-neutral-400 mt-4">Altitude Topografia e Engenharia Ltda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
          <div className="bg-[#2E7D32] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Altitude Topografia e Engenharia</h1>
                <p className="text-green-100 text-sm">Proposta Comercial Nº {orc.numero}</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-b border-neutral-100">
            <p className="text-xs text-neutral-400 uppercase font-semibold tracking-wide">Cliente</p>
            <p className="font-semibold text-neutral-900">{orc.cliente?.nome}</p>
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h2 className="font-semibold text-neutral-900">Itens da Proposta</h2>
          </div>
          <div className="divide-y divide-neutral-50">
            {orc.itens?.map((item: any) => (
              <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">{item.descricao}</p>
                  <p className="text-xs text-neutral-400">Qtd: {item.quantidade} × {fmt(item.unitario)}</p>
                </div>
                <p className="text-sm font-semibold text-neutral-900">{fmt(item.total)}</p>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-neutral-50 flex items-center justify-between">
            <span className="font-bold text-neutral-900">Total</span>
            <span className="font-bold text-xl text-[#2E7D32]">{fmt(orc.total)}</span>
          </div>
        </div>

        {/* Resposta */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-4">Sua resposta</h2>
          <textarea
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            placeholder="Mensagem opcional (observações, ajustes solicitados...)"
            className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-green-300 resize-none"
            rows={3}
          />
          <div className="flex gap-3">
            <button
              onClick={() => responderMut.mutate(true)}
              disabled={responderMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <CheckCircle size={18} /> Aprovar Proposta
            </button>
            <button
              onClick={() => responderMut.mutate(false)}
              disabled={responderMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl border border-red-200 transition-colors"
            >
              <XCircle size={18} /> Rejeitar
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Altitude Topografia e Engenharia Ltda · lourenco@altitudetopo.com.br
        </p>
      </div>
    </div>
  );
}
