import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/authStore.js';
import { Spinner } from '@/components/ui/index.jsx';
import NotFound from '@/pages/NotFound.jsx';

const Wait = () => <div className="grid min-h-[50dvh] place-items-center"><Spinner className="size-8" /></div>;
/** UX only. The API enforces every permission again on the server. */
export function RequireAuth({ staff }) {
  const { user, ready } = useAuth(); const loc = useLocation();
  if (!ready) return <Wait />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (staff && !['ADMIN', 'STAFF'].includes(user.role)) return <NotFound code={403} />;
  return <Outlet />;
}
