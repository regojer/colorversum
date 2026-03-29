"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const CATEGORY_EMOJI: Record<string, string> = {
  animals:    "🦁",
  fantasy:    "🐉",
  dinosaurs:  "🦕",
  space:      "🚀",
  holidays:   "🎄",
  flowers:    "🌸",
  vehicles:   "🚗",
  underwater: "🐠",
  food:       "🍕",
  sports:     "⚽",
  buildings:  "🏰",
  nature:     "🌿",
};
function emoji(slug: string) { return CATEGORY_EMOJI[slug] ?? "🎨"; }

const DIFFICULTY_BADGE: Record<string, string> = {
  easy:   "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard:   "bg-blue-100 text-blue-800",
};

type Page = {
  id: string; slug: string; title: string;
  image_thumb_url: string | null; image_url: string | null;
  category_slug: string | null; difficulty: string | null;
};
type Category = {
  id: string; name: string; slug: string;
  description: string | null; computed_topic_count: number;
};
type CategoryPreviews = Record<string, string[]>;

interface CategoryClientProps {
  category: Category;
  initialPages: Page[];
  totalCount: number;
  otherCategories: Category[];
  categoryPreviews: CategoryPreviews;
  emoji: string;
  initialDifficulty: string;
  initialSort: string;
}

function PageCard({ page }: { page: Page }) {
  const badge = page.difficulty ? (DIFFICULTY_BADGE[page.difficulty.toLowerCase()] ?? null) : null;
  const thumb = page.image_thumb_url ?? page.image_url;
  return (
    <Link
      href={`/coloring/${page.slug}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-blue-200 hover:shadow-[0_4px_20px_rgba(17,24,39,.09)] hover:-translate-y-0.5 transition-all"
    >
      <div className="aspect-square bg-[#FAFAFA] border-b border-gray-200 flex items-center justify-center relative overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={`${page.title} — free printable coloring page`}
            className="w-[78%] h-[78%] object-contain group-hover:scale-[1.04] transition-transform"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl text-gray-200">🎨</span>
        )}
        {badge && page.difficulty && (
          <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${badge}`}>
            {page.difficulty.charAt(0).toUpperCase() + page.difficulty.slice(1)}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">{page.title}</p>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
      <div className="aspect-square bg-gray-100 animate-pulse" />
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export default function CategoryClient({
  category,
  initialPages,
  totalCount,
  otherCategories,
  categoryPreviews,
  emoji: catEmoji,
  initialDifficulty,
  initialSort,
}: CategoryClientProps) {
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [pages, setPages]           = useState<Page[]>(initialPages);
  const [total, setTotal]           = useState(totalCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore]       = useState(totalCount > 24);
  const [loading, setLoading]       = useState(false);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [sort, setSort]             = useState(initialSort);

  function syncURL(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    });
  }

  async function fetchPages(opts: {
    diff?: string; srt?: string; pg?: number; append?: boolean;
  }) {
    const diff = opts.diff ?? difficulty;
    const srt  = opts.srt  ?? sort;
    const pg   = opts.pg   ?? 1;

    setLoading(true);
    try {
      const res = await fetch("/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: pg,
          categories: [category.slug],
          difficulty: diff ? [diff] : [],
          sort: srt,
          query: "",
        }),
      });
      const data = await res.json();
      if (opts.append) {
        setPages(prev => [...prev, ...(data.pages ?? [])]);
      } else {
        setPages(data.pages ?? []);
      }
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      setCurrentPage(pg);
    } finally {
      setLoading(false);
    }
  }

  function handleDifficulty(val: string) {
    const next = difficulty === val ? "" : val;
    setDifficulty(next);
    setCurrentPage(1);
    fetchPages({ diff: next });
    syncURL({ difficulty: next, sort });
  }

  function handleSort(val: string) {
    setSort(val);
    setCurrentPage(1);
    fetchPages({ srt: val });
    syncURL({ difficulty, sort: val });
  }

  function loadMore() {
    fetchPages({ pg: currentPage + 1, append: true });
  }

  function clearFilters() {
    setDifficulty("");
    setSort("");
    setCurrentPage(1);
    fetchPages({ diff: "", srt: "" });
    syncURL({ difficulty: "", sort: "" });
  }

  const hasFilters = difficulty || sort;
  const displayCount = hasFilters
    ? `${total.toLocaleString()} result${total !== 1 ? "s" : ""}`
    : `${total.toLocaleString()} pages`;

  return (
    <>
      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-8 pt-10 pb-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-400 mb-5">
            <Link href="/" className="hover:text-blue-500 transition-colors">Home</Link>
            <span className="text-gray-300">›</span>
            <Link href="/category" className="hover:text-blue-500 transition-colors">Categories</Link>
            <span className="text-gray-300">›</span>
            <span className="text-gray-600">{category.name}</span>
          </nav>

          <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-2">
                Free Printable
              </p>
              <h1 className="text-[clamp(26px,4vw,42px)] font-black text-gray-900 tracking-tight leading-tight flex items-center gap-3">
                <span>{catEmoji}</span>
                {category.name} Coloring Pages
              </h1>
              {category.description && (
                <p className="text-[15px] text-gray-500 mt-2 max-w-[560px] leading-relaxed">
                  {category.description}
                </p>
              )}
            </div>
            <span className="text-[13px] font-semibold text-gray-400 self-end whitespace-nowrap">
              {loading ? "Loading…" : displayCount}
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Sort */}
            <select
              value={sort}
              onChange={e => handleSort(e.target.value)}
              className="h-9 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl px-3 text-[13px] font-semibold text-gray-700 cursor-pointer hover:border-gray-300 transition-colors outline-none appearance-none pr-8"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              <option value="">Latest first</option>
              <option value="popular">Most popular</option>
            </select>

            <div className="w-px h-5 bg-gray-200" />

            {/* Difficulty pills */}
            {(["easy", "medium", "hard"] as const).map(d => (
              <button
                key={d}
                onClick={() => handleDifficulty(d)}
                className={`inline-flex items-center text-[12.5px] font-bold px-3.5 py-1.5 rounded-full border transition-all ${
                  difficulty === d
                    ? DIFFICULTY_BADGE[d] + " border-transparent"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-8 pt-8">

        {/* ── AD ──────────────────────────────────────────────────── */}
        <div className="w-full h-[90px] rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[10.5px] font-bold uppercase tracking-widest text-gray-400 mb-8">
          ▤ Advertisement · 728×90
        </div>

        {/* ── GRID ────────────────────────────────────────────────── */}
        {pages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl mb-4 opacity-30">🔍</span>
            <p className="text-[18px] font-bold text-gray-700 mb-2">No pages found</p>
            <p className="text-[14px] text-gray-400 mb-6 max-w-xs">
              Try a different difficulty or clear the filters.
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 bg-blue-500 text-white font-bold text-[14px] px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {pages.map(page => <PageCard key={page.id} page={page} />)}
            {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
          </div>
        )}

        {/* ── LOAD MORE ───────────────────────────────────────────── */}
        {hasMore && !loading && pages.length > 0 && (
          <div className="flex flex-col items-center gap-2 mt-10">
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 text-gray-700 font-bold text-[14px] px-8 py-3.5 rounded-xl transition-all hover:-translate-y-px"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              Show more pages
            </button>
            <p className="text-[12px] text-gray-400">
              Showing {pages.length.toLocaleString()} of {total.toLocaleString()}
            </p>
          </div>
        )}

        {/* ── AD ──────────────────────────────────────────────────── */}
        <div className="w-full h-[90px] rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[10.5px] font-bold uppercase tracking-widest text-gray-400 mt-12">
          ▤ Advertisement · 728×90
        </div>

        {/* ── SEO TEXT BLOCK ──────────────────────────────────────── */}
        <section className="mt-12" aria-label={`About ${category.name} coloring pages`}>
          <div className="bg-white border border-gray-200 rounded-[20px] px-10 py-9">
            <h2 className="text-[20px] font-black text-gray-900 tracking-tight mb-4">
              Free Printable {category.name} Coloring Pages
            </h2>
            <div className="text-[15px] leading-[1.8] text-gray-600 space-y-3">
              <p>
                Explore our collection of free printable <strong>{category.name.toLowerCase()} coloring pages</strong> — all
                available as instant PDF downloads, ready to print at home in seconds. Every page in this
                category features clean bold outlines perfect for crayons, markers, or colored pencils.
              </p>
              <p>
                Whether you&apos;re looking for <strong>easy {category.name.toLowerCase()} coloring pages</strong> for
                young children or more detailed designs for older kids and adults, you&apos;ll find new pages
                added regularly. Filter by difficulty above to find the right level.
                All <strong>printable {category.name.toLowerCase()} coloring sheets</strong> are completely
                free — no account required, no watermarks.
              </p>
            </div>

            {/* Internal links — other categories */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3">
                Explore more categories
              </p>
              <div className="flex flex-wrap gap-2">
                {otherCategories.map(cat => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  >
                    <span>{emoji(cat.slug)}</span>
                    {cat.name}
                  </Link>
                ))}
                <Link
                  href="/category"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-3.5 py-1.5 hover:bg-blue-100 transition-all"
                >
                  All categories →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── OTHER CATEGORY CARDS ────────────────────────────────── */}
        {otherCategories.length > 0 && (
          <section className="mt-14" aria-label="More categories">
            <div className="flex items-end justify-between gap-4 mb-7">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">Keep exploring</p>
                <h2 className="text-[clamp(20px,2.8vw,26px)] font-black text-gray-900 tracking-tight">
                  More coloring categories
                </h2>
              </div>
              <Link href="/category" className="text-[13px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap transition-colors">
                All categories →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {otherCategories.slice(0, 8).map(cat => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="group rounded-[18px] border border-gray-200 bg-white overflow-hidden flex flex-col hover:border-blue-200 hover:shadow-[0_6px_28px_rgba(17,24,39,.1)] hover:-translate-y-[3px] transition-all"
                >
                  {/* Preview grid */}
                  <div className="relative border-b border-gray-200 overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    <div className="absolute inset-0 grid grid-cols-2 gap-px bg-gray-200">
                      {[0, 1, 2, 3].map(j => {
                        const thumb = categoryPreviews[cat.slug]?.[j];
                        return (
                          <div key={j} className="bg-[#FAFAFA] group-hover:bg-[#F5F7FF] flex items-center justify-center transition-colors overflow-hidden">
                            {thumb ? (
                              <img src={thumb} alt="" aria-hidden="true" className="w-[88%] h-[88%] object-contain" loading="lazy" />
                            ) : (
                              <span className="text-3xl opacity-20 select-none">{emoji(cat.slug)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Card body */}
                  <div className="p-4 flex flex-col" style={{ minHeight: 112 }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl leading-none shrink-0">{emoji(cat.slug)}</span>
                      <span className="text-[15px] font-black text-gray-900 tracking-tight leading-tight">{cat.name}</span>
                    </div>
                    <p className="text-[12.5px] text-gray-400 leading-[1.5] line-clamp-2 flex-1 mb-3">
                      {cat.description ?? "\u00a0"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-gray-400">
                        {(cat.computed_topic_count ?? 0).toLocaleString()} topics
                      </span>
                      <span className="text-[13px] font-bold text-blue-500 group-hover:translate-x-[3px] transition-transform">
                        Browse →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </>
  );
}
