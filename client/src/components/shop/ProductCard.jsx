
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/index.jsx';
import {
  SmartImage,
  PriceDisplay,
  RatingStars,
  WishlistButton,
} from './bits.jsx';
import { useCart } from '@/store/cartStore.js';
import { ShoppingBag } from 'lucide-react';

export function ProductCard({ product: p, priority }) {
  const add = useCart((s) => s.add);

  const badge = !p.inStock ? (
    <Badge tone="dark">Sold out</Badge>
  ) : p.onSale ? (
    <Badge tone="rose">Sale</Badge>
  ) : p.isNewArrival ? (
    <Badge tone="gold">New</Badge>
  ) : p.isBestseller ? (
    <Badge tone="gold">Bestseller</Badge>
  ) : p.lowStock ? (
    <Badge tone="warn">Low stock</Badge>
  ) : null;

  const quick =
    p.inStock && p.defaultVariantId && !p.hasMultipleSizes;

  return (
    <article className="group relative flex flex-col">
      <Link
        to={`/product/${p.slug}`}
        className="block"
        aria-label={`${p.brand.name} ${p.name}`}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface-2">
          <SmartImage
            image={p.image}
            alt={`${p.brand.name} ${p.name}`}
            label={p.brand.name}
            priority={priority}
            className={`transition duration-500 ease-[var(--ease-lux)] group-hover:scale-[1.04] ${
              !p.inStock ? 'opacity-60 grayscale-[40%]' : ''
            }`}
          />

          {p.image2 && (
            <img
              src={p.image2.url}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 hidden h-full w-full object-contain object-center opacity-0 transition duration-500 group-hover:opacity-100 md:block"
            />
          )}

          <div className="absolute left-2.5 top-2.5">
            {badge}
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <p className="eyebrow !text-[0.66rem]">
            {p.brand.name}
          </p>

          <h3 className="line-clamp-2 min-h-[2.5rem] font-[var(--font-display)] text-xl leading-tight">
            {p.name}
          </h3>

          <div className="flex items-center justify-between gap-2">
            <PriceDisplay
              priceKobo={p.priceKobo}
              compareAtKobo={p.compareAtKobo}
              from={p.hasMultipleSizes}
            />
          </div>

          {p.ratingCount > 0 && (
            <RatingStars
              value={p.ratingAvg}
              count={p.ratingCount}
            />
          )}
        </div>
      </Link>

      <WishlistButton
        productId={p.id}
        className="absolute right-2 top-2"
      />

      {quick ? (
        <button
          type="button"
          onClick={() =>
            add(p.defaultVariantId, 1, {
              priceKobo: p.priceKobo,
            })
          }
          className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold transition hover:border-accent hover:text-accent"
        >
          <ShoppingBag
            className="size-4"
            aria-hidden="true"
          />
          Quick add
        </button>
      ) : (
        <Link
          to={`/product/${p.slug}`}
          className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-line text-sm font-semibold transition hover:border-accent hover:text-accent"
        >
          {p.inStock ? 'Choose size' : 'View details'}
        </Link>
      )}
    </article>
  );
}

export function ProductGrid({
  items,
  loading,
  count = 8,
  cols = 'grid-cols-2 lg:grid-cols-4',
}) {
  if (loading) {
    return (
      <div
        className={`grid gap-x-3 gap-y-8 sm:gap-x-5 ${cols}`}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton aspect-[4/5]" />
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-x-3 gap-y-8 sm:gap-x-5 ${cols}`}
    >
      {items.map((p, i) => (
        <ProductCard
          key={p.id}
          product={p}
          priority={i < 2}
        />
      ))}
    </div>
  );
}
