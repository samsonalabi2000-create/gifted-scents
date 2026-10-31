import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AppRoutes from '@/routes/index.jsx';
import { useAuth } from '@/store/authStore.js';
import { useCart } from '@/store/cartStore.js';
import { useWishlist } from '@/store/wishlistStore.js';
import { useTheme } from '@/store/themeStore.js';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });

function Boot() {
  const init = useAuth((s) => s.init); const user = useAuth((s) => s.user); const loadCart = useCart((s) => s.load); const sync = useWishlist((s) => s.syncAfterLogin);
  useEffect(() => { init(); loadCart(); }, [init, loadCart]);
  useEffect(() => { if (user) sync(); }, [user?.id, sync]);
  return null;
}

export default function App() {
  const dark = useTheme((s) => s.pref);
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter><Boot /><AppRoutes /></BrowserRouter>
      <Toaster position="top-center" theme={dark === 'system' ? 'system' : dark} closeButton toastOptions={{ classNames: { toast: '!rounded-2xl !border !border-line !bg-surface !text-fg' } }} />
    </QueryClientProvider>
  );
}
