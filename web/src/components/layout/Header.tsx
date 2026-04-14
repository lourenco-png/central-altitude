'use client';
import { Bell, Menu, Search, LogOut, User, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { getInitials, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Notificacao } from '@/types';

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout } = useAuthStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notifsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const { data: notifs = [], refetch } = useQuery<Notificacao[]>({
    queryKey: ['notificacoes'],
    queryFn: () => api.get('/notificacoes').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const unread = notifs.filter((n) => !n.lida).length;

  const markRead = async (id: string) => {
    await api.patch(`/notificacoes/${id}/lida`);
    refetch();
  };

  const markAllRead = async () => {
    await api.patch('/notificacoes/marcar-todas-lidas');
    refetch();
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const tipoColor: Record<string, string> = {
    warning: 'text-orange-500',
    error: 'text-red-500',
    success: 'text-green-600',
    info: 'text-blue-500',
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-neutral-200 flex items-center px-4 gap-4 z-50 shadow-sm">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 bg-primary-800 rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">CA</span>
        </div>
        <span className="font-semibold text-neutral-900 text-sm hidden sm:block">Central Altitude</span>
      </Link>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-neutral-100 rounded-lg px-3 py-1.5 w-64">
        <Search size={15} className="text-neutral-400" />
        <input
          placeholder="Buscar... (Ctrl+K)"
          className="bg-transparent text-sm outline-none text-neutral-700 placeholder-neutral-400 w-full"
        />
      </div>

      {/* Notifications */}
      <div className="relative" ref={notifsRef}>
        <button
          onClick={() => { setShowNotifs((p) => !p); setShowUser(false); }}
          className="relative p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-accent-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-neutral-200 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <span className="font-semibold text-sm">Notificações</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary-700 hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-8">Nenhuma notificação</p>
              ) : (
                notifs.slice(0, 15).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      'px-4 py-3 border-b border-neutral-50 cursor-pointer hover:bg-neutral-50 transition-colors',
                      !n.lida && 'bg-primary-50/50'
                    )}
                  >
                    <p className={cn('text-sm font-medium', tipoColor[n.tipo] || 'text-neutral-800')}>{n.titulo}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{n.mensagem}</p>
                    <p className="text-xs text-neutral-400 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
            <Link href="/notificacoes" className="block text-center text-xs text-primary-700 py-2.5 border-t border-neutral-100 hover:bg-neutral-50">
              Ver todas as notificações
            </Link>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => { setShowUser((p) => !p); setShowNotifs(false); }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user ? getInitials(user.nome) : '?'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-neutral-900 leading-tight">{user?.nome}</p>
            <p className="text-xs text-neutral-500">{user?.role}</p>
          </div>
        </button>

        {showUser && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-neutral-200 shadow-lg overflow-hidden">
            <Link href="/perfil" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors">
              <User size={15} className="text-neutral-500" />
              <span>Meu perfil</span>
            </Link>
            <Link href="/configuracoes" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors">
              <Settings size={15} className="text-neutral-500" />
              <span>Configurações</span>
            </Link>
            <hr className="border-neutral-100 my-1" />
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
