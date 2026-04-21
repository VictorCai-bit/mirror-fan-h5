import '@/styles/globals.css';
import '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { App } from './App';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// MSW is enabled whenever no real API base is configured (dev + Vercel demo).
// Set VITE_API_BASE in your environment to point at a real backend and skip mocking.
const USE_MOCK = !import.meta.env.VITE_API_BASE;

async function enableMocking() {
  if (!USE_MOCK) return;
  // Unregister any stale mockServiceWorker from previous dev sessions
  // (different ports, older handler bundles) so the fresh one can take over.
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? '';
        if (url.includes('mockServiceWorker.js') && !url.startsWith(window.location.origin)) {
          await r.unregister();
        }
      }
    } catch {
      /* ignore */
    }
  }
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={qc}>
        <App />
        <Toaster richColors theme="dark" position="top-center" duration={1800} />
      </QueryClientProvider>
    </StrictMode>,
  );
});
