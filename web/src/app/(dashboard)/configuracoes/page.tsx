'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Users, KeyRound, ToggleLeft, ToggleRight, Trash2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
}

export default function ConfiguracoesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showResetModal, setShowResetModal] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [newUserForm, setNewUserForm] = useState({ nome: '', email: '', password: '', role: 'USER' });

  const pwdMut = useMutation({
    mutationFn: (d: any) => api.post('/auth/change-password', d),
    onSuccess: () => { toast.success('Senha alterada!'); setPwdForm({ currentPassword: '', newPassword: '', confirm: '' }); },
    onError: () => toast.error('Senha atual incorreta'),
  });

  const isAdmin = user?.role === 'ADMIN';

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: isAdmin,
  });

  const resetMut = useMutation({
    mutationFn: ({ id, newPassword }: any) => api.post(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => { toast.success('Senha redefinida!'); setShowResetModal(false); setResetPwd(''); },
    onError: () => toast.error('Erro ao redefinir senha'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, ativo }: any) => api.patch(`/users/${id}`, { ativo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Status atualizado'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuário removido'); },
  });

  const createUserMut = useMutation({
    mutationFn: (d: any) => api.post('/auth/register', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuário criado!'); setShowNewUser(false); setNewUserForm({ nome: '', email: '', password: '', role: 'USER' }); },
    onError: () => toast.error('Erro ao criar usuário. E-mail pode já estar em uso.'),
  });

  const handlePwd = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirm) { toast.error('As senhas não coincidem'); return; }
    pwdMut.mutate({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
  };

  return (
    <div>
      <PageHeader title="Configurações" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-2xl">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Alterar Senha</h3>
            <form onSubmit={handlePwd} className="space-y-4">
              <div><label className="label">Senha atual</label><input type="password" value={pwdForm.currentPassword} onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} className="input" required /></div>
              <div><label className="label">Nova senha</label><input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} className="input" required /></div>
              <div><label className="label">Confirmar nova senha</label><input type="password" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} className="input" required /></div>
              <button type="submit" disabled={pwdMut.isPending} className="btn-primary"><Save size={15} /> Salvar</button>
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

        {/* Gerenciamento de usuários - apenas admin */}
        {isAdmin && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Users size={18} className="text-primary-700" /> Gerenciar Usuários</h3>
              <button onClick={() => setShowNewUser(true)} className="btn-secondary text-xs"><UserPlus size={13} /> Novo Usuário</button>
            </div>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border ${!u.ativo ? 'bg-neutral-50 border-neutral-200 opacity-60' : 'bg-white border-neutral-200'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.nome}</p>
                    <p className="text-xs text-neutral-400">{u.email} · <span className="capitalize">{u.role.toLowerCase()}</span></p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <button
                      onClick={() => toggleMut.mutate({ id: u.id, ativo: !u.ativo })}
                      title={u.ativo ? 'Desativar' : 'Ativar'}
                      className="p-1.5 rounded hover:bg-neutral-100"
                    >
                      {u.ativo ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-neutral-400" />}
                    </button>
                    <button
                      onClick={() => { setSelectedUser(u); setResetPwd(''); setShowResetModal(true); }}
                      title="Redefinir senha"
                      className="p-1.5 rounded hover:bg-neutral-100"
                    >
                      <KeyRound size={15} className="text-neutral-500" />
                    </button>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => { if (confirm(`Remover ${u.nome}?`)) deleteMut.mutate(u.id); }}
                        title="Remover usuário"
                        className="p-1.5 rounded hover:bg-red-50"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reset password modal */}
      <Modal open={showResetModal} onClose={() => setShowResetModal(false)} title={`Redefinir Senha — ${selectedUser?.nome}`} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); if (selectedUser) resetMut.mutate({ id: selectedUser.id, newPassword: resetPwd }); }} className="space-y-4">
          <div>
            <label className="label">Nova Senha *</label>
            <input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} className="input" required minLength={6} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowResetModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={resetMut.isPending} className="btn-primary">Redefinir</button>
          </div>
        </form>
      </Modal>

      {/* Novo usuário modal */}
      <Modal open={showNewUser} onClose={() => setShowNewUser(false)} title="Novo Usuário" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); createUserMut.mutate(newUserForm); }} className="space-y-4">
          <div><label className="label">Nome *</label><input value={newUserForm.nome} onChange={e => setNewUserForm({ ...newUserForm, nome: e.target.value })} className="input" required /></div>
          <div><label className="label">E-mail *</label><input type="email" value={newUserForm.email} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })} className="input" required /></div>
          <div><label className="label">Senha *</label><input type="password" value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} className="input" required minLength={6} /></div>
          <div>
            <label className="label">Perfil</label>
            <select value={newUserForm.role} onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })} className="input">
              <option value="USER">Usuário</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowNewUser(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createUserMut.isPending} className="btn-primary">Criar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
