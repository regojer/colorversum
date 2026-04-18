"use client";

import { useState, useCallback, useRef, useTransition, useEffect } from "react";
import Link from "next/link";

// ── Emoji + badge maps ─────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  "animal-coloring-pages": "🦁", "fairy-tales": "🐉", "space-science": "🚀",
  "holiday-coloring": "🎄", "nature-coloring": "🌿", "food-drinks": "🍕",
  "fantasy-coloring": "🐉", "seasonal-coloring": "🍂", "characters": "🎭",
  "emotions-mindfulness": "💛", "education": "📚", "jobs-professions": "👷",
  "pattern-coloring": "🔷", "vehicles": "🚗", "sports": "⚽",
};
function emoji(slug: string) { return CATEGORY_EMOJI[slug] ?? "🎨"; }

const DIFFICULTY_CONFIG = {
  easy:   { badge: "bg-green-100 text-green-700", dot: "bg-green-400", label: "Easy" },
  medium: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-400", label: "Medium" },
  hard:   { badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-400",  label: "Hard" },
} as const;

type Difficulty = keyof typeof DIFFICULTY_CONFIG;

type LandingCard = {
  coloring_page_id: string; page_slug: string; title: string;
  image_thumb_url: string | null; image_url: string | null;
  difficulty: string | null; topic_slug: string; category_slug: string; views: number;
};
type Category = { category_id: string; name: string; slug: string };

interface Props {
  lang: string;
  initialPages: LandingCard[];
  categories: Category[];
  totalCount: number;
}

export default function AlternativeClient({ lang, initialPages, categories, totalCount }: Props) {
  const [pages, setPages] = useState<LandingCard[]>(initialPages);
  const [total, setTotal] = useState(totalCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(totalCount > 24);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [, startTransition] = useTransition();

  const fetchPages = useCallback(async (opts: {
    q: string; cat: string; diff: string; s: string; page: number; append?: boolean;
  }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          page: opts.page,
          query: opts.q,
          categories: opts.cat ? [opts.cat] : [],
          difficulty: opts.diff ? [opts.diff] : [],
          sort: opts.s,
        }),
      });
      const data = await res.json();
      if (opts.append) setPages(prev => [...prev, ...(data.pages ?? [])]);
      else setPages(data.pages ?? []);
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      setCurrentPage(opts.page);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  function handleSearch(val: string) {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchPages({ q: val, cat: category, diff: difficulty, s: sort, page: 1 });
    }, 350);
  }

  function handleCategory(val: string) {
    const next = val === category ? "" : val;
    setCategory(next);
    setCurrentPage(1);
    startTransition(() => {
      fetchPages({ q: query, cat: next, diff: difficulty, s: sort, page: 1 });
    });
  }

  function handleDifficulty(val: string) {
    const next = val === difficulty ? "" : val;
    setDifficulty(next);
    setCurrentPage(1);
    fetchPages({ q: query, cat: category, diff: next, s: sort, page: 1 });
  }

  function handleSort(val: string) {
    const next = val === sort ? "" : val;
    setSort(next);
    setCurrentPage(1);
    fetchPages({ q: query, cat: category, diff: difficulty, s: next, page: 1 });
  }

  function handleClear() {
    setQuery(""); setCategory(""); setDifficulty(""); setSort("");
    fetchPages({ q: "", cat: "", diff: "", s: "", page: 1 });
  }

  const hasFilters = !!(query || category || difficulty || sort);
  const activeCategory = categories.find(c => c.slug === category);

  // ── Sidebar component ──────────────────────────────────────────
  const Sidebar = () => (
    <aside className="flex flex-col h-full overflow-y-auto">

      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <Link href={`/${lang}`} className="flex items-center gap-2 group w-fit">
          <span className="text-2xl">🎨</span>
          <span className="text-[16px] font-black tracking-[-0.04em] text-gray-900 group-hover:text-blue-600 transition-colors">
            colorversum
          </span>
        </Link>
        <p className="text-[11.5px] text-gray-400 mt-1 font-medium">Free printable coloring pages</p>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="search"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search coloring pages…"
            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-[3px] focus:ring-blue-100 transition-all"
          />
          {query && (
            <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <div className="px-4 pb-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-gray-400 mb-2">Sort by</p>
        <div className="flex gap-1.5">
          {[
            { val: "new", icon: "✨", label: "Newest" },
            { val: "popular", icon: "🔥", label: "Popular" },
          ].map(s => (
            <button key={s.val} onClick={() => handleSort(s.val)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-[12px] font-bold py-2 rounded-lg border transition-all ${
                sort === s.val
                  ? "bg-blue-500 text-white border-blue-500 shadow-[0_2px_8px_rgba(59,130,246,.4)]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-500"
              }`}
            >
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="px-4 pb-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-gray-400 mb-2">Difficulty</p>
        <div className="flex flex-col gap-1">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(d => {
            const cfg = DIFFICULTY_CONFIG[d];
            const active = difficulty === d;
            return (
              <button key={d} onClick={() => handleDifficulty(d)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-all ${
                  active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-white" : cfg.dot}`} />
                {cfg.label}
                {active && (
                  <svg className="ml-auto w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100 mb-4" />

      {/* Categories */}
      <div className="px-4 pb-6 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-gray-400 mb-2">Categories</p>
        <div className="flex flex-col gap-0.5">
          <button onClick={() => handleCategory("")}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all text-left w-full ${
              !category ? "bg-blue-50 text-blue-600 border border-blue-100" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="text-base w-5 text-center shrink-0">🎨</span>
            <span className="flex-1">All categories</span>
            {!category && <svg className="w-3.5 h-3.5 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
          {categories.map(cat => (
            <button key={cat.slug} onClick={() => handleCategory(cat.slug)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all text-left w-full ${
                category === cat.slug
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-base w-5 text-center shrink-0">{emoji(cat.slug)}</span>
              <span className="flex-1 truncate">{cat.name}</span>
              {category === cat.slug && <svg className="w-3.5 h-3.5 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex">

      {/* ── Desktop Sidebar ────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 bg-white border-r border-gray-200 fixed left-0 top-0 bottom-0 z-20">
        <Sidebar />
      </div>

      {/* ── Mobile Sidebar Overlay ─────────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-white h-full overflow-y-auto shadow-2xl z-10">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 xl:ml-72 min-w-0">

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200">
          <div className="px-4 sm:px-6 xl:px-8 h-[60px] flex items-center gap-3">
            {/* Mobile hamburger */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            {/* Breadcrumb / context */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[13px] font-bold text-gray-900">
                {activeCategory ? (
                  <span className="flex items-center gap-1.5">
                    <span>{emoji(activeCategory.slug)}</span>
                    {activeCategory.name}
                  </span>
                ) : "All Coloring Pages"}
              </span>
              <span className="text-[12px] text-gray-400 font-medium shrink-0">
                {total.toLocaleString()} pages
              </span>
            </div>

            {/* Active filter chips */}
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              {difficulty && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${DIFFICULTY_CONFIG[difficulty as Difficulty]?.badge ?? "bg-gray-100 text-gray-600"}`}>
                  {DIFFICULTY_CONFIG[difficulty as Difficulty]?.label}
                  <button onClick={() => handleDifficulty(difficulty)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                </span>
              )}
              {sort && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                  {sort === "popular" ? "🔥 Popular" : "✨ Newest"}
                  <button onClick={() => handleSort(sort)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                </span>
              )}
              {hasFilters && (
                <button onClick={handleClear} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Hero banner ─────────────────────────────────────────── */}
        {!hasFilters && (
          <div className="mx-4 sm:mx-6 xl:mx-8 mt-5 mb-6 rounded-2xl overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1D4ED8 60%, #7c3aed 100%)", minHeight: 120 }}
          >
            {/* decorative blobs */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute bottom-0 left-1/3 w-24 h-24 rounded-full bg-white/5" />
            <div className="absolute top-2 right-1/4 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative z-10 px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold text-white mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_0_3px_rgba(74,222,128,.3)]" />
                  New pages every day
                </div>
                <h1 className="text-white font-black text-[clamp(18px,3vw,26px)] tracking-tight leading-tight">
                  Free Printable Coloring Pages
                </h1>
                <p className="text-white/70 text-[13px] mt-1">
                  Download instantly · No sign-up · PDF ready to print
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleSort("new")}
                  className="inline-flex items-center gap-1.5 bg-white text-blue-700 font-bold text-[13px] px-4 py-2.5 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,.2)] hover:-translate-y-px transition-all"
                >
                  ✨ Just added
                </button>
                <button onClick={() => handleSort("popular")}
                  className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-white/25 transition-all"
                >
                  🔥 Popular
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 xl:px-8 pb-16">
          {pages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-[18px] font-bold text-gray-700 mb-2">No pages found</p>
              <p className="text-[14px] text-gray-400 mb-6">Try different keywords or clear the filters</p>
              <button onClick={handleClear} className="bg-blue-500 text-white font-bold text-[14px] px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
                {pages.map(page => {
                  const diff = page.difficulty?.toLowerCase() as Difficulty | undefined;
                  const cfg = diff ? DIFFICULTY_CONFIG[diff] : null;
                  const thumb = page.image_thumb_url ?? page.image_url;
                  const href = `/${lang}/${page.category_slug}/${page.topic_slug}/${page.page_slug}`;
                  const isHovered = hoveredId === page.coloring_page_id;

                  return (
                    <Link key={page.coloring_page_id} href={href}
                      onMouseEnter={() => setHoveredId(page.coloring_page_id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(17,24,39,.12)] hover:-translate-y-1 transition-all duration-200"
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-[#FAFAFA] overflow-hidden">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={`${page.title} coloring page`}
                            className="w-full h-full object-contain p-4 group-hover:scale-[1.05] transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">🎨</div>
                        )}

                        {/* Difficulty badge */}
                        {cfg && diff && (
                          <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        )}

                        {/* Hover overlay with action */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-blue-100/80 via-blue-50/20 to-transparent flex items-end justify-center pb-3 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}>
                          <span className="inline-flex items-center gap-1.5 bg-white/95 text-blue-600 font-bold text-[12px] px-4 py-2 rounded-xl shadow-[0_2px_12px_rgba(59,130,246,.2)] border border-blue-100">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Free Download
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1.5">
                        <p className="text-[12.5px] font-bold text-gray-800 line-clamp-2 leading-snug">{page.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400 font-medium capitalize truncate">
                            {emoji(page.category_slug)} {page.category_slug.replace(/-/g, " ")}
                          </span>
                          {page.views > 0 && (
                            <span className="text-[10.5px] text-gray-400 font-medium shrink-0">
                              {page.views.toLocaleString()} ↓
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* Skeleton placeholders while loading more */}
                {loading && !pages.length && Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="px-3 py-2.5 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-4/5" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button onClick={() => fetchPages({ q: query, cat: category, diff: difficulty, s: sort, page: currentPage + 1, append: true })}
                    disabled={loading}
                    className="inline-flex items-center gap-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-[14px] px-8 py-3.5 rounded-2xl hover:border-blue-400 hover:text-blue-500 hover:shadow-[0_4px_16px_rgba(59,130,246,.15)] transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" /> Loading…</>
                    ) : (
                      <>Load more · {(total - pages.length).toLocaleString()} remaining</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
