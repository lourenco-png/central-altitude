import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy') {
  return format(new Date(date), fmt, { locale: ptBR });
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function getEpiStatus(validade: string | Date | null) {
  if (!validade) return { label: 'Sem validade', color: 'gray' };
  const dias = differenceInDays(new Date(validade), new Date());
  if (dias < 0) return { label: 'Vencido', color: 'red' };
  if (dias <= 7) return { label: `Vence em ${dias}d`, color: 'red' };
  if (dias <= 30) return { label: `Vence em ${dias}d`, color: 'orange' };
  return { label: 'OK', color: 'green' };
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
