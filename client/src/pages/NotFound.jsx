import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Seo } from '@/components/Seo.jsx';
import { Button, EmptyState } from '@/components/ui/index.jsx';

export default function NotFound({ code = 404 }) {
  const t = code === 403 ? ['Access denied', "You don't have permission to view this page."] : ['Page not found', 'The page you are looking for has moved or does not exist.'];
  return <div className="container-x py-20"><Seo title={`${t[0]} | Gifted Scents`} noindex /><EmptyState icon={SearchX} title={t[0]} text={t[1]} action={<Button as={Link} to="/">Back to home</Button>} /></div>;
}
