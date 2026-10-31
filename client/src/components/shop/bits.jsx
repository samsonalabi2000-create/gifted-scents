
import { Link } from 'react-router-dom';
import { Heart, Star, Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/cn.js';
import { formatNaira, discountPercent } from '@/utils/money.js';
import { useWishlist } from '@/store/wishlistStore.js';
import { useAuth } from '@/store/authStore.js';

/** Branded fallback when a product has no photo yet (admin uploads real images). */
export const ProductPlaceholder = ({ label, className }) => (
  <div
    className={cn(
      'grid h-full w-full place-items-center bg-gradient-to-br from-ink-800 to-ink-950',
      className
    )}
    role="img"
    aria-label={`${label || 'Product'} - photo coming soon`}
  >
    <svg
      viewBox="0 0 80 100"
      className="w-1/3 opacity-90"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stopColor="#f6e3a8" />
          <stop offset="1" stopColor="#c9993a" />
        </linearGradient>
      </defs>

      <rect
        x="30"
        y="4"
        width="20"
        height="12"
        rx="2"
        fill="url(#g)"
      />
      <rect
        x="35"
        y="16"
        width="10"
        height="8"
        fill="#8f6a1f"
      />
      <rect
        x="12"
        y="24"
        width="56"
        height="70"
        rx="10"
        fill="none"
        stroke="url(#g)"
        strokeWidth="2.5"
      />
      <text
        x="40"
        y="66"
        textAnchor="middle"
        fontSize="22"
        fontFamily="serif"
        fill="#ff6fb5"
      >
        {(label || 'G')[0]}
      </text>
    </svg>
  </div>
);

export const SmartImage = ({
  image,
  alt,
  label,
  priority,
  sizes = '(min-width:1024px) 25vw, 50vw',
  className,
}) =>
  image?.url ? (
    <img
      src={image.url}
      alt={image.alt || alt}
      width={image.width || 800}
      height={image.height || 1000}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn(
        'block h-full w-full object-contain object-center',
        className
      )}
    />
  ) : (
    <ProductPlaceholder label={label || alt} />
  );

export const PriceDisplay = ({
  priceKobo,
  compareAtKobo,
  size = 'md',
  from,
}) => {
  const off = discountPercent(priceKobo, compareAtKobo);

  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={cn(
          'font-semibold tabular-nums',
          size === 'lg' ? 'text-3xl' : 'text-base'
        )}
      >
        {from && (
          <span className="mr-1 text-xs font-normal text-muted">
            From
          </span>
        )}
        {formatNaira(priceKobo)}
      </span>

      {compareAtKobo > priceKobo && (
        <>
          <s className="text-sm text-muted tabular-nums">
            {formatNaira(compareAtKobo)}
          </s>
          {off > 0 && (
            <span className="text-xs font-semibold text-cta">
              -{off}%
            </span>
          )}
        </>
      )}
    </div>
  );
};

export const RatingStars = ({
  value = 0,
  count,
  size = 14,
  showCount = true,
}) => (
  <span
    className="inline-flex items-center gap-1"
    role="img"
    aria-label={`Rated ${Number(value).toFixed(1)} out of 5${
      count != null ? ` from ${count} reviews` : ''
    }`}
  >
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={
            n <= Math.round(value)
              ? 'fill-gold-400 text-gold-400'
              : 'text-line'
          }
          aria-hidden="true"
        />
      ))}
    </span>

    {showCount && count != null && (
      <span className="text-xs text-muted">({count})</span>
    )}
  </span>
);

export const WishlistButton = ({ productId, className }) => {
  const has = useWishlist((s) => s.ids.includes(productId));
  const toggle = useWishlist((s) => s.toggle);
  const user = useAuth((s) => s.user);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId, Boolean(user));
      }}
      aria-pressed={has}
      aria-label={has ? 'Remove from wishlist' : 'Save to wishlist'}
      className={cn(
        'grid size-10 place-items-center rounded-full bg-bg/80 backdrop-blur transition hover:scale-105',
        className
      )}
    >
      <Heart
        className={cn(
          'size-5',
          has ? 'fill-cta text-cta' : 'text-fg'
        )}
        aria-hidden="true"
      />
    </button>
  );
};

export const QuantitySelector = ({
  value,
  onChange,
  min = 1,
  max = 10,
  label = 'Quantity',
}) => (
  <div
    className="inline-flex h-11 items-center rounded-full border border-line"
    role="group"
    aria-label={label}
  >
    <button
      type="button"
      className="grid size-11 place-items-center disabled:opacity-40"
      onClick={() => onChange(value - 1)}
      disabled={value <= min}
      aria-label="Decrease quantity"
    >
      <Minus className="size-4" />
    </button>

    <output
      aria-live="polite"
      className="min-w-8 text-center text-sm font-semibold tabular-nums"
    >
      {value}
    </output>

    <button
      type="button"
      className="grid size-11 place-items-center disabled:opacity-40"
      onClick={() => onChange(value + 1)}
      disabled={value >= max}
      aria-label="Increase quantity"
    >
      <Plus className="size-4" />
    </button>
  </div>
);

export const TextLink = ({ to, children, className }) => (
  <Link
    to={to}
    className={cn(
      'text-accent underline-offset-4 hover:underline',
      className
    )}
  >
    {children}
  </Link>
);
