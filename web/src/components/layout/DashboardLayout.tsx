'use client';
import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-100">
      <Header onToggleSidebar={() => setCollapsed((p) => !p)} />
      <Sidebar collapsed={collapsed} />
      <main className={cn(
        'pt-14 min-h-screen transition-all duration-200',
        collapsed ? 'ml-14' : 'ml-60'
      )}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
