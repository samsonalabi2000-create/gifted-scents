import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductGrid } from './ProductCard.jsx';

export const SectionHead = ({ eyebrow, title, to, cta = 'View all', className = '' }) => (
  <div className={`mb-8 flex items-end justify-between gap-4 ${className}`}>
    <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 className="mt-1 text-3xl sm:text-4xl">{title}</h2></div>
    {to && <Link to={to} className="hidden items-center gap-1.5 text-sm font-semibold text-accent hover:underline sm:flex">{cta}<ArrowRight className="size-4" /></Link>}
  </div>
);

export const ProductRow = ({ eyebrow, title, to, query, loading, items }) => (
  <section className="container-x py-12 sm:py-16">
    <SectionHead eyebrow={eyebrow} title={title} to={to} />
    <ProductGrid items={items || []} loading={loading} count={4} />
    {to && <Link to={to} className="mt-8 flex justify-center text-sm font-semibold text-accent sm:hidden">View all <ArrowRight className="ml-1 size-4" /></Link>}
  </section>
);

export const Breadcrumbs = ({ items }) => (
  <nav aria-label="Breadcrumb" className="container-x pt-5 text-xs text-muted">
    <ol className="flex flex-wrap items-center gap-1.5">{items.map((c, i) => (
      <li key={c.to || c.name} className="flex items-center gap-1.5">{i > 0 && <span aria-hidden>/</span>}{c.to && i < items.length - 1 ? <Link to={c.to} className="hover:text-accent">{c.name}</Link> : <span aria-current="page" className="text-fg">{c.name}</span>}</li>))}</ol>
  </nav>
);
