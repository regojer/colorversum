"use client";

import React from "react";
import { useState, useCallback, useRef, useTransition } from "react";
import Link from "next/link";

// ── Maps ───────────────────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  "animal-coloring-pages": "🦁", "fairy-tales": "🐉", "space-science": "🚀",
  "holiday-coloring": "🎄", "nature-coloring": "🌿", "food-drinks": "🍕",
  "fantasy-coloring": "🐉", "seasonal-coloring": "🍂", "characters": "🎭",
  "emotions-mindfulness": "💛", "education": "📚", "jobs-professions": "👷",
  "pattern-coloring": "🔷", "vehicles": "🚗", "sports": "⚽",
};
function catEmoji(slug: string) { return CATEGORY_EMOJI[slug] ?? "🎨"; }

const DIFF_CONFIG = {
  easy:   { badge: "bg-green-100 text-green-700",  dot: "bg-green-400",  label: "Easy"   },
  medium: { badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-400",  label: "Medium" },
  hard:   { badge: "bg-blue-100  text-blue-700",   dot: "bg-blue-400",   label: "Hard"   },
} as const;
type Difficulty = keyof typeof DIFF_CONFIG;

// ── Types ──────────────────────────────────────────────────────────────────
type LandingCard = {
  coloring_page_id: string; page_slug: string; title: string;
  image_thumb_url: string | null; image_url: string | null;
  difficulty: string | null; topic_slug: string; category_slug: string; views: number;
};
type Category = { category_id: string; name: string; slug: string };

interface Props {
  newestPages:  LandingCard[];
  popularPages: LandingCard[];
  categories:   Category[];
  totalCount:   number;
}

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IcoSearch = ({ cls = "" }: { cls?: string }) => (
  <svg className={cls} width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);
const IcoX = ({ cls = "" }: { cls?: string }) => (
  <svg className={cls} width="11" height="11" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IcoDownload = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
// Stat icons — clean SVG, no emoji
const IcoFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
  </svg>
);
const IcoShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);
const IcoPrinter = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const IcoGlobe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

// ── Main Component ─────────────────────────────────────────────────────────
export default function AlternativeLanding({ newestPages, popularPages, categories, totalCount }: Props) {

  const [pages, setPages]           = useState<LandingCard[]>(newestPages);
  const [total, setTotal]           = useState(totalCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore]       = useState(totalCount > 24);
  const [loading, setLoading]       = useState(false);
  const [hoveredId, setHoveredId]   = useState<string | null>(null);

  const [query, setQuery]           = useState("");
  const [category, setCategory]     = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort]             = useState("");

  const debounceRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gridRef        = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const hasFilters      = !!(query || category || difficulty || sort);
  const activeCategory  = categories.find(c => c.slug === category);

  // Hero thumbnails — first 4 newest with images
  const heroThumbs = newestPages.filter(p => p.image_thumb_url ?? p.image_url).slice(0, 4);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchPages = useCallback(async (opts: {
    q: string; cat: string; diff: string; s: string; page: number; append?: boolean;
  }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang: "en", page: opts.page,
          query: opts.q,
          categories: opts.cat ? [opts.cat] : [],
          difficulty: opts.diff ? [opts.diff] : [],
          sort: opts.s,
        }),
      });
      const data = await res.json();
      if (opts.append) setPages(prev => [...prev, ...(data.pages ?? [])]);
      else             setPages(data.pages ?? []);
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      setCurrentPage(opts.page);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  function applyQuery(val: string) {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchPages({ q: val, cat: category, diff: difficulty, s: sort, page: 1 });
    }, 320);
  }

  function applyCategory(val: string) {
    const next = val === category ? "" : val;
    setCategory(next); setCurrentPage(1);
    startTransition(() =>
      fetchPages({ q: query, cat: next, diff: difficulty, s: sort, page: 1 })
    );
  }

  function applyDifficulty(val: string) {
    const next = val === difficulty ? "" : val;
    setDifficulty(next); setCurrentPage(1);
    fetchPages({ q: query, cat: category, diff: next, s: sort, page: 1 });
  }

  function applySort(val: string) {
    const next = val === sort ? "" : val;
    setSort(next); setCurrentPage(1);
    fetchPages({ q: query, cat: category, diff: difficulty, s: next, page: 1 });
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function clearAll() {
    setQuery(""); setCategory(""); setDifficulty(""); setSort("");
    fetchPages({ q: "", cat: "", diff: "", s: "", page: 1 });
  }

  // ── Sidebar (desktop only) ─────────────────────────────────────────────
  const SidebarContent = () => (
    <aside className="flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <Link href="/en" className="flex items-center gap-2 group w-fit">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </div>
          <div>
            <span className="text-[15px] font-black tracking-[-0.04em] text-gray-900 group-hover:text-violet-600 transition-colors leading-none block">
              colorversum
            </span>
            <span className="text-[10.5px] text-gray-400 font-medium leading-none">Free coloring pages</span>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <IcoSearch cls="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" value={query} onChange={e => applyQuery(e.target.value)}
            placeholder="Search pages…"
            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl
                       text-[13px] font-medium text-gray-900 placeholder:text-gray-400
                       focus:outline-none focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100 transition-all"
          />
          {query && (
            <button onClick={() => applyQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
              <IcoX />
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <div className="px-4 pb-3">
        <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Sort by</p>
        <div className="flex gap-1.5">
          {[{ val: "new", label: "Newest" }, { val: "popular", label: "Popular" }].map(s => (
            <button key={s.val} onClick={() => applySort(s.val)}
              className={`flex-1 text-[12px] font-bold py-2 rounded-lg border transition-all ${
                sort === s.val
                  ? "bg-violet-600 text-white border-violet-600 shadow-[0_2px_8px_rgba(124,58,237,.35)]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600"
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Difficulty</p>
        <div className="flex flex-col gap-1">
          {(Object.keys(DIFF_CONFIG) as Difficulty[]).map(d => {
            const cfg = DIFF_CONFIG[d]; const active = difficulty === d;
            return (
              <button key={d} onClick={() => applyDifficulty(d)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-all ${
                  active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-white" : cfg.dot}`} />
                {cfg.label}
                {active && <span className="ml-auto opacity-70"><IcoCheck /></span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-4 border-t border-gray-100 mb-3" />

      {/* Categories */}
      <div className="px-4 pb-8 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Categories</p>
        <div className="flex flex-col gap-0.5">
          <button onClick={() => applyCategory("")}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all text-left w-full ${
              !category ? "bg-violet-50 text-violet-700 border border-violet-100" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="text-base w-5 text-center shrink-0">🎨</span>
            <span className="flex-1">All categories</span>
            {!category && <span className="text-violet-400 opacity-80"><IcoCheck /></span>}
          </button>
          {categories.map(cat => (
            <button key={cat.slug} onClick={() => applyCategory(cat.slug)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all text-left w-full ${
                category === cat.slug ? "bg-violet-50 text-violet-700 border border-violet-100" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-base w-5 text-center shrink-0">{catEmoji(cat.slug)}</span>
              <span className="flex-1 truncate">{cat.name}</span>
              {category === cat.slug && <span className="text-violet-400 opacity-80"><IcoCheck /></span>}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-64 xl:w-[272px] shrink-0 bg-white border-r border-gray-200 fixed left-0 top-0 bottom-0 z-20">
        <SidebarContent />
      </div>

      {/* ── Main Column ─────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 xl:ml-[272px] min-w-0 flex flex-col">

        {/* ══ MOBILE TOP BAR ══════════════════════════════════════════════ */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">

          {/* Row 1: Logo + Search ─────────────────────────────────────── */}
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <Link href="/en" className="flex items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
              </div>
              <span className="text-[14px] font-black tracking-tight text-gray-900">colorversum</span>
            </Link>
            <div className="relative flex-1">
              <IcoSearch cls="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="search" value={query} onChange={e => applyQuery(e.target.value)}
                placeholder="Search coloring pages…"
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl
                           text-[13px] text-gray-900 placeholder:text-gray-400
                           focus:outline-none focus:border-violet-400 focus:ring-[2px] focus:ring-violet-100 transition-all"
              />
              {query && (
                <button onClick={() => applyQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 p-0.5">
                  <IcoX />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Filter chips ──────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-3 pb-2.5 overflow-x-auto scrollbar-hide">

            {/* Sort */}
            {[{ val: "new", label: "✨ New" }, { val: "popular", label: "🔥 Popular" }].map(s => (
              <button key={s.val} onClick={() => applySort(s.val)}
                className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                  sort === s.val
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}>
                {s.label}
              </button>
            ))}

            <div className="w-px h-4 bg-gray-200 shrink-0 mx-0.5" />

            {/* Difficulty */}
            {(Object.keys(DIFF_CONFIG) as Difficulty[]).map(d => (
              <button key={d} onClick={() => applyDifficulty(d)}
                className={`shrink-0 flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                  difficulty === d
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${difficulty === d ? "bg-white" : DIFF_CONFIG[d].dot}`} />
                {DIFF_CONFIG[d].label}
              </button>
            ))}

            <div className="w-px h-4 bg-gray-200 shrink-0 mx-0.5" />

            {/* Categories */}
            <button onClick={() => applyCategory("")}
              className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                !category ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-white text-gray-600 border-gray-200"
              }`}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat.slug} onClick={() => applyCategory(cat.slug)}
                className={`shrink-0 flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-full border whitespace-nowrap transition-all ${
                  category === cat.slug
                    ? "bg-violet-50 text-violet-700 border-violet-200"
                    : "bg-white text-gray-600 border-gray-200"
                }`}>
                {catEmoji(cat.slug)} {cat.name}
              </button>
            ))}

            {hasFilters && (
              <button onClick={clearAll}
                className="shrink-0 text-[12px] font-semibold text-rose-500 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full whitespace-nowrap">
                Clear ×
              </button>
            )}
          </div>
        </div>

        {/* ══ DESKTOP TOP BAR ═════════════════════════════════════════════ */}
        <div className="hidden lg:flex sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 xl:px-8 h-[52px] items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[13.5px] font-bold text-gray-900">
              {activeCategory ? <>{catEmoji(activeCategory.slug)} {activeCategory.name}</> : "All Coloring Pages"}
            </span>
            <span className="text-[12px] text-gray-400 font-medium">
              {total.toLocaleString()} pages
            </span>
          </div>
          {/* Active filter badges */}
          <div className="flex items-center gap-1.5">
            {difficulty && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${DIFF_CONFIG[difficulty as Difficulty]?.badge ?? "bg-gray-100 text-gray-600"}`}>
                {DIFF_CONFIG[difficulty as Difficulty]?.label}
                <button onClick={() => applyDifficulty(difficulty)} className="opacity-50 hover:opacity-100 ml-0.5"><IcoX /></button>
              </span>
            )}
            {sort && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
                {sort === "popular" ? "Popular" : "Newest"}
                <button onClick={() => applySort(sort)} className="opacity-50 hover:opacity-100 ml-0.5"><IcoX /></button>
              </span>
            )}
            {hasFilters && (
              <button onClick={clearAll} className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* ══ BENTO HERO (hidden while filtering) ═════════════════════════ */}
        <div className={`transition-all duration-300 overflow-hidden ${hasFilters ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[2000px] opacity-100"}`}>
          <div className="px-4 sm:px-6 xl:px-8 pt-5 pb-4 space-y-3">

            {/* ── Row 1: Hero + Stats ─────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* Hero bento */}
              <div className="md:col-span-2 rounded-2xl overflow-hidden relative"
                   style={{ minHeight: 200, background: "linear-gradient(135deg, #1e1154 0%, #4C1D95 45%, #7C3AED 80%, #c084fc 100%)" }}>
                {/* Blobs */}
                <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-white/[0.04] pointer-events-none" />
                <div className="absolute bottom-4 left-1/2 w-28 h-28 rounded-full bg-white/[0.04] pointer-events-none" />
                {/* Floating thumbnails on desktop */}
                <div className="absolute right-0 top-0 bottom-0 hidden md:flex items-center gap-2 pr-5 pointer-events-none">
                  {heroThumbs.slice(0, 3).map((card, i) => {
                    const thumb = card.image_thumb_url ?? card.image_url;
                    const tilts = ["rotate-[-4deg] translate-y-1", "rotate-[2deg] -translate-y-2", "rotate-[-2deg] translate-y-3"];
                    return (
                      <div key={card.coloring_page_id}
                        className={`w-[72px] h-[72px] xl:w-20 xl:h-20 bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,.25)] flex items-center justify-center overflow-hidden shrink-0 ${tilts[i]}`}>
                        {thumb && <img src={thumb} alt="" className="w-[80%] h-[80%] object-contain" loading="lazy" />}
                      </div>
                    );
                  })}
                </div>
                {/* Copy */}
                <div className="relative z-10 p-6 sm:p-7 flex flex-col justify-between gap-5" style={{ minHeight: 200 }}>
                  <div>
                    <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold text-white mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      New pages added daily
                    </div>
                    <h1 className="text-white font-black leading-[1.1] tracking-tight max-w-[280px]"
                        style={{ fontSize: "clamp(22px, 2.8vw, 30px)" }}>
                      Free Printable<br/>Coloring Pages<br/>
                      <span className="text-violet-200 font-extrabold">for kids &amp; adults</span>
                    </h1>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => applySort("new")}
                      className="inline-flex items-center gap-1.5 bg-white text-violet-700 font-bold text-[13px] px-4 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,0,0,.2)] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,0,0,.25)] transition-all">
                      ✨ Just added
                    </button>
                    <button onClick={() => applySort("popular")}
                      className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-white/25 transition-all">
                      🔥 Trending
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats bento */}
              <div className="rounded-2xl bg-white border border-gray-200 p-4 grid grid-cols-2 gap-2.5">
                {([
                  {
                    Icon: IcoFile,
                    stat: totalCount >= 1000 ? "1,000+" : `${totalCount}`,
                    label: "Free pages",
                    accent: "text-violet-500 bg-violet-50",
                  },
                  {
                    Icon: IcoShield,
                    stat: "Free",
                    label: "Always & forever",
                    accent: "text-emerald-500 bg-emerald-50",
                  },
                  {
                    Icon: IcoPrinter,
                    stat: "PDF",
                    label: "Print-ready",
                    accent: "text-blue-500 bg-blue-50",
                  },
                  {
                    Icon: IcoGlobe,
                    stat: "7",
                    label: "Languages",
                    accent: "text-amber-500 bg-amber-50",
                  },
                ] as { Icon: () => React.ReactElement; stat: string; label: string; accent: string }[]).map(item => (
                  <div key={item.label} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.accent}`}>
                      <item.Icon />
                    </div>
                    <div>
                      <div className="text-[17px] font-black text-gray-900 leading-none">{item.stat}</div>
                      <div className="text-[11px] font-semibold text-gray-400 mt-0.5 leading-tight">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Row 2: Trending strip ──────────────────────────────── */}
            {popularPages.length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-[.12em] text-violet-500">Trending now</span>
                    <span className="text-[11px] text-gray-400 font-medium ml-2">Most downloaded this week</span>
                  </div>
                  <button onClick={() => applySort("popular")}
                    className="flex items-center gap-1 text-[12px] font-bold text-violet-600 hover:text-violet-800 transition-colors shrink-0">
                    See all <IcoArrow />
                  </button>
                </div>
                <div className="flex gap-3 px-5 py-4 overflow-x-auto scrollbar-hide">
                  {popularPages.slice(0, 8).map((card, i) => {
                    const thumb = card.image_thumb_url ?? card.image_url;
                    const href  = `/en/${card.category_slug}/${card.topic_slug}/${card.page_slug}`;
                    return (
                      <Link key={card.coloring_page_id} href={href}
                        className="group flex flex-col shrink-0 w-[110px] sm:w-[128px] overflow-hidden rounded-2xl border border-gray-100 bg-[#FAFAFA] hover:border-violet-200 hover:shadow-[0_6px_20px_rgba(109,40,217,.12)] hover:-translate-y-0.5 transition-all duration-200">
                        <div className="aspect-square flex items-center justify-center overflow-hidden relative">
                          {/* Rank badge */}
                          {i < 3 && (
                            <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm z-10">
                              {i + 1}
                            </span>
                          )}
                          {thumb
                            ? <img src={thumb} alt={card.title}
                                className="w-[78%] h-[78%] object-contain group-hover:scale-[1.07] transition-transform duration-300"
                                loading="lazy" />
                            : <span className="text-4xl opacity-20">🎨</span>
                          }
                        </div>
                        <div className="px-2.5 pb-3 pt-1">
                          <p className="text-[11px] font-bold text-gray-700 line-clamp-2 leading-snug">{card.title}</p>
                          {card.views > 0 && (
                            <p className="text-[10px] text-gray-400 mt-1 font-semibold flex items-center gap-0.5">
                              <IcoDownload /> {card.views.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Row 3: Category tiles ──────────────────────────────── */}
            <div className="rounded-2xl bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-black uppercase tracking-[.12em] text-gray-400">Browse by category</p>
                <span className="text-[11px] text-gray-300 font-medium">{categories.length} categories</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button key={cat.slug} onClick={() => applyCategory(cat.slug)}
                    className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-[12.5px] px-3.5 py-2 rounded-full transition-all duration-150 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:-translate-y-px">
                    <span className="text-[15px] leading-none">{catEmoji(cat.slug)}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Divider label when filtering ────────────────────────────── */}
        {hasFilters && (
          <div className="px-4 sm:px-6 xl:px-8 pt-4 pb-2 flex items-center justify-between">
            <p className="text-[12px] font-black uppercase tracking-[.1em] text-violet-500">
              {activeCategory ? `${catEmoji(activeCategory.slug)} ${activeCategory.name}` : query ? `Results for "${query}"` : "Filtered results"}
            </p>
            <button onClick={clearAll} className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
              <IcoX /> Clear filters
            </button>
          </div>
        )}

        {/* ══ CARD GRID ════════════════════════════════════════════════════ */}
        <div ref={gridRef} className="px-4 sm:px-6 xl:px-8 pb-8">
          {pages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-3xl">🎨</div>
              <p className="text-[17px] font-bold text-gray-700 mb-1.5">No pages found</p>
              <p className="text-[13.5px] text-gray-400 mb-6">Try different keywords or remove some filters</p>
              <button onClick={clearAll}
                className="bg-violet-600 text-white font-bold text-[14px] px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors">
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
                {pages.map(page => {
                  const diff  = page.difficulty?.toLowerCase() as Difficulty | undefined;
                  const cfg   = diff ? DIFF_CONFIG[diff] : null;
                  const thumb = page.image_thumb_url ?? page.image_url;
                  const href  = `/en/${page.category_slug}/${page.topic_slug}/${page.page_slug}`;

                  return (
                    <Link key={page.coloring_page_id} href={href}
                      onMouseEnter={() => setHoveredId(page.coloring_page_id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-violet-200 hover:shadow-[0_8px_32px_rgba(109,40,217,.11)] hover:-translate-y-1 transition-all duration-200"
                    >
                      <div className="relative aspect-square bg-[#FAFAFA] overflow-hidden">
                        {thumb
                          ? <img src={thumb} alt={`${page.title} coloring page`}
                              className="w-full h-full object-contain p-3.5 group-hover:scale-[1.05] transition-transform duration-300"
                              loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">🎨</div>
                        }
                        {cfg && diff && (
                          <span className={`absolute top-2 left-2 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        )}
                        {/* Hover overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-violet-200/60 via-violet-50/10 to-transparent flex items-end justify-center pb-3 transition-opacity duration-200 ${hoveredId === page.coloring_page_id ? "opacity-100" : "opacity-0"}`}>
                          <span className="inline-flex items-center gap-1.5 bg-white text-violet-700 font-bold text-[12px] px-4 py-2 rounded-xl shadow-[0_4px_16px_rgba(109,40,217,.2)] border border-violet-100">
                            <IcoDownload /> Free Download
                          </span>
                        </div>
                      </div>
                      <div className="px-3 pt-2.5 pb-3">
                        <p className="text-[12.5px] font-bold text-gray-800 line-clamp-2 leading-snug mb-1">{page.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400 font-medium truncate">
                            {catEmoji(page.category_slug)}{" "}
                            {page.category_slug.replace(/-coloring-pages$/, "").replace(/-/g, " ")}
                          </span>
                          {page.views > 0 && (
                            <span className="text-[10.5px] text-gray-400 font-semibold shrink-0 flex items-center gap-0.5">
                              <IcoDownload /> {page.views.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* Loading skeletons */}
                {loading && !pages.length && Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="px-3 py-3 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-4/5" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => fetchPages({ q: query, cat: category, diff: difficulty, s: sort, page: currentPage + 1, append: true })}
                    disabled={loading}
                    className="inline-flex items-center gap-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-[14px] px-8 py-3.5 rounded-2xl hover:border-violet-300 hover:text-violet-700 hover:shadow-[0_4px_16px_rgba(109,40,217,.12)] transition-all disabled:opacity-50"
                  >
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" /> Loading…</>
                      : <>Load {Math.min(24, total - pages.length)} more &middot; {(total - pages.length).toLocaleString()} remaining</>
                    }
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ══ SEO CONTENT ══════════════════════════════════════════════════ */}
        {!hasFilters && (
          <div className="px-4 sm:px-6 xl:px-8 pb-16">
            <div className="rounded-2xl bg-white border border-gray-200 px-6 sm:px-10 py-8 sm:py-10">
              <h2 className="text-[20px] sm:text-[22px] font-black text-gray-900 tracking-tight mb-5">
                Free Printable Coloring Pages for Kids &amp; Adults
              </h2>
              <div className="text-[14.5px] leading-[1.85] text-gray-500 space-y-3 max-w-[760px]">
                <p>
                  Colorversum is your free destination for 1,000+ printable coloring pages, available instantly
                  with no sign-up required. Whether you&rsquo;re looking for simple designs for toddlers, relaxing
                  mandalas for adults, or exciting fantasy scenes for older kids — you&rsquo;ll find it here.
                  Every page downloads as a high-quality PDF, optimized for home printing on A4 or Letter paper.
                </p>
                <p>
                  Our collection spans animals, dinosaurs, fairy tales, space, holidays, food, vehicles, nature,
                  sports and many more categories. Each sheet is graded by difficulty — <strong className="text-gray-700 font-semibold">Easy</strong> for
                  young children, <strong className="text-gray-700 font-semibold">Medium</strong> for school-age kids, and{" "}
                  <strong className="text-gray-700 font-semibold">Hard</strong> for adults who want detailed artwork.
                  New pages are added every day so there&rsquo;s always something fresh to discover.
                </p>
              </div>
              <div className="mt-7 pt-6 border-t border-gray-100">
                <p className="text-[11px] font-black uppercase tracking-[.1em] text-gray-400 mb-3">Popular categories</p>
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 10).map(cat => (
                    <button key={cat.slug} onClick={() => applyCategory(cat.slug)}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all">
                      {catEmoji(cat.slug)} {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
