'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

export default function ConfiguracoesPage() {
  const { user } = useAuthStore();
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const pwdMut = useMutation({
    mutationFn: (d: any) => api.post('/auth/change-password', d),
    onSuccess: () => { toast.success('Senha alterada!'); setPwdForm({ currentPassword: '', newPassword: '', confirm: '' }); },
    onError: () => toast.error('Senha atual incorreta'),
  });

  const handlePwd = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirm) { toast.error('As senhas não coincidem'); return; }
    pwdMut.mutate({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
  };

  return (
    <div>
      <PageHeader title="Configurações" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-2xl">
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Alterar Senha</h3>
          <form onSubmit={handlePwd} className="space-y-4">
            <div><label className="label">Senha atual</label><input type="password" value={pwdForm.currentPassword} onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} className="input" required /></div>
            <div><label className="label">Nova senha</label><input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} className="input" required /></div>
            <div><label className="label">Confirmar nova senha</label><input type="password" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} className="input" required /></div>
            <button type="submit" className="btn-primary"><Save size={15} /> Salvar</button>
          </form>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Minha Conta</h3>
          <div className="space-y-2 text-sm">
            <div><p className="text-neutral-400 text-xs">Nome</p><p className="font-medium">{user?.nome}</p></div>
            <div><p className="text-neutral-400 text-xs">E-mail</p><p>{user?.email}</p></div>
            <div><p className="text-neutral-400 text-xs">Perfil</p><p className="capitalize">{user?.role?.toLowerCase()}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
