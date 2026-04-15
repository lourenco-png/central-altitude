'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Erro ao enviar e-mail. Verifique o endereço.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-8">
          <div className="flex flex-col items-center mb-8">
            <Logo size="lg" showText={false} />
            <h1 className="text-xl font-bold text-neutral-900 mt-4">Recuperar Senha</h1>
            <p className="text-sm text-neutral-500 mt-1 text-center">
              Informe seu e-mail para receber o link de redefinição
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail size={24} className="text-green-600" />
              </div>
              <p className="text-sm text-neutral-700">
                Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link em instantes.
              </p>
              <p className="text-xs text-neutral-400">Verifique também a caixa de spam.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="seu@email.com"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700">
              <ArrowLeft size={14} /> Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
