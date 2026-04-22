'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://central-altitude.onrender.com';

// Aquece a API e avisa o usuário se estiver dormindo (cold start Render free tier)
function useApiWarmup() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let done = false;

    const warmup = async () => {
      // Após 8s sem resposta, mostra o aviso
      timer = setTimeout(() => { if (!done) setSlow(true); }, 8000);
      try {
        await fetch(`${API_URL}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(60_000),
        });
      } catch {
        // silencioso — o interceptor do axios já trata erros de autenticação
      } finally {
        done = true;
        clearTimeout(timer);
        setSlow(false);
      }
    };

    warmup();
    return () => { clearTimeout(timer); };
  }, []);

  return slow;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const apiSlow = useApiWarmup();

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* Banner de cold start */}
      {apiSlow && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-neutral-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl">
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
          Servidor acordando após inatividade, aguarde alguns segundos…
        </div>
      )}

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
