'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import toast from 'react-hot-toast';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('As senhas não coincidem'); return; }
    if (password.length < 6) { toast.error('Senha deve ter ao menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success('Senha redefinida com sucesso!');
      router.push('/login');
    } catch {
      toast.error('Link inválido ou expirado. Solicite um novo.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-red-600">Link de redefinição inválido.</p>
        <Link href="/forgot-password" className="text-primary-700 text-sm hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nova Senha</label>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pr-10"
            placeholder="••••••••"
            required
            autoFocus
          />
          <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div>
        <label className="label">Confirmar Nova Senha</label>
        <input
          type={showPwd ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input"
          placeholder="••••••••"
          required
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
        {loading ? 'Salvando...' : 'Redefinir Senha'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-8">
          <div className="flex flex-col items-center mb-8">
            <Logo size="lg" showText={false} />
            <h1 className="text-xl font-bold text-neutral-900 mt-4">Nova Senha</h1>
            <p className="text-sm text-neutral-500 mt-1">Defina sua nova senha de acesso</p>
          </div>
          <Suspense fallback={<div className="text-center text-sm text-neutral-400">Carregando...</div>}>
            <ResetForm />
          </Suspense>
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
