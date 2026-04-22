'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Aquece a API no Render (evita cold start de 30-60s no primeiro uso)
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://central-altitude-api.onrender.com';
    fetch(`${apiUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(10_000) }).catch(() => {});
  }, []);

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,   // 1 min antes de refetch em background
        gcTime: 300_000,     // 5 min no cache — dados disponíveis instantaneamente ao navegar de volta
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px', borderRadius: '8px' },
          success: { iconTheme: { primary: '#2E7D32', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
