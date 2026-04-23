'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Triangle, Users, DollarSign, Settings,
  ChevronDown, ChevronRight, Calendar, FileText, Clipboard,
  UserCheck, Shield, Umbrella, Building2, ShoppingCart,
  FileSignature, File, Kanban, UserCircle, UserX, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: { label: string; href: string; icon: React.ReactNode }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Topografia',
    icon: <Triangle size={18} />,
    children: [
      { label: 'Calendário', href: '/topografia/calendario', icon: <Calendar size={16} /> },
      { label: 'Solicitações', href: '/topografia/solicitacoes', icon: <Clipboard size={16} /> },
      { label: 'RDO', href: '/topografia/rdo', icon: <FileText size={16} /> },
      { label: 'Obras', href: '/topografia/obras', icon: <Building2 size={16} /> },
      { label: 'Engenheiros', href: '/topografia/engenheiros', icon: <UserCheck size={16} /> },
    ],
  },
  {
    label: 'RH / DP',
    icon: <Users size={18} />,
    children: [
      { label: 'Funcionários', href: '/rh/funcionarios', icon: <UserCircle size={16} /> },
      { label: 'Faltas', href: '/rh/faltas', icon: <UserX size={16} /> },
      { label: 'Disciplinar', href: '/rh/disciplinar', icon: <ShieldAlert size={16} /> },
      { label: 'EPIs', href: '/rh/epis', icon: <Shield size={16} /> },
      { label: 'Férias', href: '/rh/ferias', icon: <Umbrella size={16} /> },
      { label: 'Empresa', href: '/rh/empresa', icon: <Building2 size={16} /> },
    ],
  },
  {
    label: 'Comercial',
    icon: <DollarSign size={18} />,
    children: [
      { label: 'Clientes', href: '/comercial/clientes', icon: <UserCircle size={16} /> },
      { label: 'Orçamentos', href: '/comercial/orcamentos', icon: <ShoppingCart size={16} /> },
      { label: 'Propostas', href: '/comercial/propostas', icon: <File size={16} /> },
      { label: 'Contratos', href: '/comercial/contratos', icon: <FileSignature size={16} /> },
      { label: 'Pipeline', href: '/comercial/pipeline', icon: <Kanban size={16} /> },
    ],
  },
  { label: 'Configurações', href: '/configuracoes', icon: <Settings size={18} /> },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Topografia: pathname.startsWith('/topografia'),
    'RH / DP': pathname.startsWith('/rh'),
    Comercial: pathname.startsWith('/comercial'),
  });

  const toggle = (label: string) => setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <aside className={cn(
      'fixed top-14 left-0 bottom-0 bg-white border-r border-neutral-200 flex flex-col overflow-y-auto transition-all duration-200 z-40',
      collapsed ? 'w-14' : 'w-60'
    )}>
      {/* Logo / empresa */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-neutral-100">
          <Logo size="sm" />
        </div>
      )}

      <nav className="flex-1 py-3 px-2">
        {navItems.map((item) => {
          const isActive = item.href ? pathname === item.href : item.children?.some((c) => pathname.startsWith(c.href));

          if (!item.children) {
            return (
              <Link
                key={item.label}
                href={item.href!}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-800 font-medium border-l-[3px] border-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                )}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => toggle(item.label)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors',
                  isActive ? 'text-primary-800 font-medium' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                )}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {expanded[item.label] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </>
                )}
              </button>

              {!collapsed && expanded[item.label] && (
                <div className="ml-3 mb-1">
                  {item.children.map((child) => {
                    const childActive = pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors mb-0.5',
                          childActive
                            ? 'bg-primary-50 text-primary-800 font-medium'
                            : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                        )}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
