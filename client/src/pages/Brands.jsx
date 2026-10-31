import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  ArrowRight,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';

import { api } from '@/api/endpoints.js';
import { Seo } from '@/components/Seo.jsx';
import { Breadcrumbs } from '@/components/shop/Sections.jsx';
import { Skeleton, ErrorState } from '@/components/ui/index.jsx';

const FILTERS = [
  { value: 'all', label: 'All brands' },
  { value: 'designer', label: 'Designer' },
  { value: 'arabic', label: 'Arabic fragrances' },
];

const SORTS = [
  { value: 'featured', label: 'Featured order' },
  { value: 'az', label: 'Name: A–Z' },
  { value: 'za', label: 'Name: Z–A' },
  { value: 'popular', label: 'Most products' },
];

const formatProductCount = (count) =>
  `${count} ${count === 1 ? 'product' : 'products'}`;

/**
 * Brand card with product cover image, logo fallback,
 * responsive layout and hover animations.
 */
function BrandCard({ brand, index }) {
  const count = brand._count?.products ?? 0;
  const imageUrl = brand.coverImage?.url || brand.logoUrl;

  return (
    <Link
      to={`/brands/${brand.slug}`}
      className="group relative flex min-w-0 min-h-48 flex-col justify-start overflow-hidden rounded-2xl border border-line bg-surface p-3 transition duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[var(--shadow-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:min-h-56 sm:p-4"
      aria-label={`Explore ${brand.name}, ${formatProductCount(count)}`}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      {/* Brand image: show the complete image without cropping */}
      {imageUrl ? (
        <div className="relative mb-3 flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-[#f7f5f0] p-2 sm:mb-4 sm:h-36 sm:p-3">
          <img
            src={imageUrl}
            alt={brand.coverImage?.alt || `${brand.name} fragrance`}
            className="block h-full w-full object-contain object-center"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div
          className="relative mb-3 grid h-32 w-full shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-bg font-[var(--font-display)] text-4xl text-accent sm:mb-4 sm:h-36"
          aria-hidden="true"
        >
          {brand.name?.charAt(0)?.toUpperCase() || 'G'}
        </div>
      )}

      {/* Decorative gold circle */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full border border-gold-300/20 transition duration-500 group-hover:scale-125 group-hover:border-accent/40"
      />

      {/* Brand initial and arrow */}
      <div className="relative flex items-center justify-between gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-bg text-accent transition duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-white">
          <span className="font-[var(--font-display)] text-lg">
            {brand.name?.charAt(0)?.toUpperCase() || 'G'}
          </span>
        </span>

        <ArrowUpRight
          aria-hidden="true"
          className="size-5 text-muted transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent"
        />
      </div>

      {/* Brand details */}
      <div className="relative mt-2 min-w-0 sm:mt-3">
        <h2 className="break-words font-[var(--font-display)] text-xl font-medium leading-snug tracking-tight transition-colors group-hover:text-accent sm:text-2xl">
          {brand.name}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{formatProductCount(count)}</span>

          {brand.isArabic && (
            <>
              <span aria-hidden="true">·</span>
              <span>Arabic fragrance</span>
            </>
          )}
        </div>

        <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
          Explore collection
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}

export default function Brands() {
  const q = useQuery({
    queryKey: ['brands'],
    queryFn: api.brands,
    staleTime: 5 * 60_000,
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('featured');

  const brands = useMemo(() => {
    const all = Array.isArray(q.data) ? q.data : [];

    let result = all.filter((brand) => {
      const hasProducts = (brand._count?.products ?? 0) > 0;

      const matchesSearch = brand.name
        ?.toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesFilter =
        filter === 'all' ||
        (filter === 'arabic' && brand.isArabic) ||
        (filter === 'designer' && !brand.isArabic);

      return hasProducts && matchesSearch && matchesFilter;
    });

    result = [...result];

    if (sort === 'az') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'za') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort === 'popular') {
      result.sort(
        (a, b) =>
          (b._count?.products ?? 0) -
            (a._count?.products ?? 0) ||
          a.name.localeCompare(b.name)
      );
    }

    return result;
  }, [q.data, search, filter, sort]);

  const totalBrands = Array.isArray(q.data)
    ? q.data.filter(
        (brand) => (brand._count?.products ?? 0) > 0
      ).length
    : 0;

  const clearFilters = () => {
    setSearch('');
    setFilter('all');
    setSort('featured');
  };

  return (
    <>
      <Seo
        title="Explore Perfume Brands | Gifted Scents"
        description="Discover designer perfumes, Arabic fragrances and more. Explore the brands available at Gifted Scents."
        path="/brands"
      />

      <Breadcrumbs
        items={[
          { name: 'Home', to: '/' },
          { name: 'Brands' },
        ]}
      />

      <main className="container-x pb-16 pt-6 sm:pb-24 sm:pt-10">

        {/* Hero Section */}
        <section className="relative isolate mb-10 overflow-hidden rounded-3xl border border-line bg-[#11100e] px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-14">
          <video
            className="pointer-events-none absolute inset-0 z-[-2] h-full w-full object-cover"
            src="/videos/gifted-scents-logo.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[-1] bg-gradient-to-r from-black/90 via-black/75 to-black/55"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border border-gold-300/20 sm:size-96"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 right-16 size-64 rounded-full bg-gold-300/10 blur-3xl"
          />

          <div className="relative max-w-3xl">
            <p className="eyebrow flex items-center gap-2 text-amber-300">
              <Sparkles className="size-4" aria-hidden="true" />
              The fragrance houses
            </p>

            <h1 className="mt-4 font-[var(--font-display)] text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Find a brand that
              <span className="script ml-2 text-amber-300">
                speaks to you.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl leading-relaxed text-white/90 sm:text-base">
              From iconic designer houses to distinctive Arabic fragrances,
              explore the collections behind the scents you love.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#brand-collections"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-semibold text-neutral-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explore all brands
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>

              <Link
                to="/scent-finder"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/50 bg-black/30 px-6 text-sm font-semibold text-white transition hover:border-amber-300 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Find my scent
              </Link>
            </div>
          </div>

          <div className="relative mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/25 pt-5 text-sm text-white/85">
            <span>Discover your next signature scent</span>
            <span>Explore by fragrance house</span>
          </div>
        </section>

        {/* Brand Collections */}
        <section id="brand-collections" className="scroll-mt-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Curated for you</p>

              <h2 className="mt-2 font-[var(--font-display)] text-3xl sm:text-4xl">
                Explore the brands
              </h2>

              <p className="mt-2 text-sm text-muted">
                Find a favourite or discover something new.
              </p>
            </div>

            {!q.isLoading && !q.isError && (
              <p className="text-sm text-muted" aria-live="polite">
                {filter === 'all' && !search.trim()
                  ? `${totalBrands} fragrance houses`
                  : `${brands.length} matching ${
                      brands.length === 1 ? 'brand' : 'brands'
                    }`}
              </p>
            )}
          </div>

          {/* Search and Filters */}
          <div className="mb-6 rounded-2xl border border-line bg-surface p-3 sm:p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search fragrance brands..."
                  aria-label="Search fragrance brands"
                  className="min-h-12 w-full rounded-xl border border-line bg-bg py-3 pl-12 pr-11 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear brand search"
                    className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div
                className="flex flex-wrap gap-2"
                aria-label="Filter brands"
              >
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    aria-pressed={filter === item.value}
                    className={`min-h-10 rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      filter === item.value
                        ? 'border-fg bg-fg text-bg'
                        : 'border-line bg-bg hover:border-accent hover:text-accent'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting */}
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-muted">
                <SlidersHorizontal
                  className="size-4"
                  aria-hidden="true"
                />
                Sort brands
              </label>

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort brands"
                className="min-h-10 rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:min-w-48"
              >
                {SORTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading, Error, Empty and Results */}
          {q.isError ? (
            <ErrorState error={q.error} onRetry={q.refetch} />
          ) : q.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-48 rounded-2xl sm:h-56" />
                </div>
              ))}
            </div>
          ) : brands.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-5 py-14 text-center">
              <Search
                className="mx-auto size-8 text-muted"
                aria-hidden="true"
              />

              <h3 className="mt-4 font-[var(--font-display)] text-2xl">
                No brands found
              </h3>

              <p className="mt-2 text-sm text-muted">
                Try another search or change your selected filter.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold transition hover:border-accent hover:text-accent"
              >
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {brands.map((brand, index) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  index={index}
                />
              ))}
            </div>
          )}

          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted">
            Brand names and trademarks belong to their respective owners.
            Gifted Scents is an independent retailer and is not affiliated with
            the brands featured on this page.
          </p>
        </section>

        {/* Scent Finder Call to Action */}
        <section className="mt-14 overflow-hidden rounded-3xl bg-ink-950 px-6 py-8 text-white sm:mt-20 sm:px-10 sm:py-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <p className="eyebrow text-gold-300">
                Need a little guidance?
              </p>

              <h2 className="mt-3 font-[var(--font-display)] text-3xl sm:text-4xl">
                Your next favourite scent is waiting.
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Tell us about your taste, favourite notes, occasion and budget.
                Let our Scent Finder help you explore your options.
              </p>
            </div>

            <Link
              to="/scent-finder"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-cta px-6 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:self-center"
            >
              Take the Scent Finder
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

      </main>
    </>
  );
}