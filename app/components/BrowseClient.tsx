"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getUI } from "@/lib/i18n";
import { AdLeaderboard } from "@/app/components/AdSlot";

const CATEGORY_EMOJI: Record<string, string> = {
  "animal-coloring-pages": "🦁", "fairy-tales": "🐉", "space-science": "🚀",
  "holiday-coloring": "🎄", "nature-coloring": "🌿", "food-drinks": "🍕",
  "fantasy-coloring": "🐉", "seasonal-coloring": "🍂", "characters": "🎭",
  "emotions-mindfulness": "💛", "education": "📚", "jobs-professions": "👷",
  "pattern-coloring": "🔷", "vehicles": "🚗", "sports": "⚽",
  "tiere": "🦁", "fahrzeuge": "🚗", "bildung": "📚", "charaktere": "🎭",
  "emotionen-achtsamkeit": "💛", "feiertage": "🎄", "maerchen": "🐉",
  "natur": "🌿", "saisonale": "🍂", "fantasy": "🐉", "weltraum": "🚀",
  "sport": "⚽", "berufe-jobs": "👷", "muster": "🔷",
  "animales": "🦁", "vehiculos": "🚗", "educacion": "📚",
  "animaux": "🦁", "vehicules": "🚗", "personnages": "🎭",
  "animali": "🦁", "veicoli": "🚗",
  "dieren": "🦁", "voertuigen": "🚗",
  "animais": "🦁",
};
function emoji(slug: string) { return CATEGORY_EMOJI[slug] ?? "🎨"; }

const DIFFICULTY_BADGE: Record<string, string> = {
  easy:   "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard:   "bg-blue-100 text-blue-800",
};

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Difficulty = typeof DIFFICULTIES[number];

type LandingCard = {
  coloring_page_id: string; page_slug: string; title: string;
  image_thumb_url: string | null; image_url: string | null;
  difficulty: string | null; topic_slug: string; category_slug: string;
};
type Category = { category_id: string; name: string; slug: string };

interface BrowseClientProps {
  lang: string;
  initialPages: LandingCard[];
  categories: Category[];
  totalCount: number;
  initialQuery?: string;
  initialCategory?: string;
  initialDifficulty?: string;
  initialSort?: string;
}

export default function BrowseClient({
  lang,
  initialPages,
  categories,
  totalCount,
  initialQuery      = "",
  initialCategory   = "",
  initialDifficulty = "",
  initialSort       = "",
}: BrowseClientProps) {
  const t = getUI(lang);
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [pages,       setPages]       = useState<LandingCard[]>(initialPages);
  const [total,       setTotal]       = useState(totalCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore,     setHasMore]     = useState(totalCount > 24);
  const [loading,     setLoading]     = useState(false);

  const [query,      setQuery]      = useState(initialQuery);
  const [category,   setCategory]   = useState(initialCategory);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [sort,       setSort]       = useState(initialSort);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function syncURL(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    });
  }

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
          page:       opts.page,
          query:      opts.q,
          categories: opts.cat ? [opts.cat] : [],
          difficulty: opts.diff ? [opts.diff] : [],
          sort:       opts.s,
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
      syncURL({ q: val, category, difficulty, sort });
    }, 350);
  }

  function handleCategory(val: string) {
    const next = val === category ? "" : val;
    setCategory(next);
    setCurrentPage(1);
    fetchPages({ q: query, cat: next, diff: difficulty, s: sort, page: 1 });
    syncURL({ q: query, category: next, difficulty, sort });
  }

  function handleDifficulty(val: string) {
    const next = val === difficulty ? "" : val;
    setDifficulty(next);
    setCurrentPage(1);
    fetchPages({ q: query, cat: category, diff: next, s: sort, page: 1 });
    syncURL({ q: query, category, difficulty: next, sort });
  }

  function handleSort(val: string) {
    const next = val === sort ? "" : val;
    setSort(next);
    setCurrentPage(1);
    fetchPages({ q: query, cat: category, diff: difficulty, s: next, page: 1 });
    syncURL({ q: query, category, difficulty, sort: next });
  }

  function handleClear() {
    setQuery(""); setCategory(""); setDifficulty(""); setSort("");
    setCurrentPage(1);
    fetchPages({ q: "", cat: "", diff: "", s: "", page: 1 });
    syncURL({ q: "", category: "", difficulty: "", sort: "" });
  }

  function loadMore() {
    fetchPages({ q: query, cat: category, diff: difficulty, s: sort, page: currentPage + 1, append: true });
  }

  // Translated label — plain string comparison, no object literals
  function diffLabel(d: Difficulty): string {
    if (d === "easy")   return t.easy;
    if (d === "medium") return t.medium;
    return t.hard;
  }

  const hasFilters = !!(query || category || difficulty || sort);

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8">

      {/* ── PAGE HEADER */}
      <div className="pt-8 sm:pt-10 pb-6 border-b border-gray-200 mb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{t.freePrintable}</p>
            <h1 className="text-[clamp(24px,4vw,36px)] font-black text-gray-900 tracking-tight leading-tight">
              {t.browseTitle}
            </h1>
          </div>
          <span className="text-[13px] font-semibold text-gray-400">
            {total.toLocaleString()} {t.pages}
          </span>
        </div>
      </div>

      {/* ── AD — top of browse */}
      <AdLeaderboard className="mb-6" />

      {/* ── SEARCH */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-[14px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-[3px] focus:ring-blue-100 transition-all"
        />
        {query && (
          <button onClick={() => handleSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── FILTER BAR */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(["popular", "new"] as const).map(s => (
          <button key={s} onClick={() => handleSort(s)}
            className={`text-[12.5px] font-bold px-3.5 py-1.5 rounded-full border transition-all ${
              sort === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s === "popular" ? t.sortPopular : t.sortNew}
          </button>
        ))}
        <div className="w-px bg-gray-200 self-stretch" />
        {DIFFICULTIES.map(d => (
          <button key={d} onClick={() => handleDifficulty(d)}
            className={`text-[12.5px] font-bold px-3.5 py-1.5 rounded-full border transition-all ${
              difficulty === d ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {diffLabel(d)}
          </button>
        ))}
        {hasFilters && (
          <button onClick={handleClear}
            className="text-[12.5px] font-semibold text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-full border border-transparent hover:border-gray-200 transition-all ml-auto"
          >
            {t.clearAll}
          </button>
        )}
      </div>

      {/* ── CATEGORY PILLS */}
      <div className="flex gap-2 flex-wrap mb-7">
        {categories.map(cat => (
          <button key={cat.slug} onClick={() => handleCategory(cat.slug)}
            className={`inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-all ${
              category === cat.slug
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            <span>{emoji(cat.slug)}</span>{cat.name}
          </button>
        ))}
      </div>

      {/* ── GRID */}
      {pages.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">🎨</span>
          <p className="text-[18px] font-bold text-gray-700 mb-2">{t.noResults}</p>
          <p className="text-[14px] text-gray-400 mb-6">{t.noResultsSub}</p>
          <button onClick={handleClear} className="bg-blue-500 text-white font-bold text-[14px] px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors">
            {t.clearFilters}
          </button>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 transition-opacity ${isPending || loading ? "opacity-60" : "opacity-100"}`}>
            {pages.map(page => {
              const badge = page.difficulty ? (DIFFICULTY_BADGE[page.difficulty.toLowerCase()] ?? null) : null;
              const thumb = page.image_thumb_url ?? page.image_url;
              const href  = `/${lang}/${page.category_slug}/${page.topic_slug}/${page.page_slug}`;
              return (
                <Link key={page.coloring_page_id} href={href}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-blue-200 hover:shadow-[0_4px_20px_rgba(17,24,39,.09)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="aspect-square bg-[#FAFAFA] border-b border-gray-200 flex items-center justify-center relative overflow-hidden">
                    {thumb
                      ? <img src={thumb} alt={`${page.title} coloring page`} className="w-[78%] h-[78%] object-contain group-hover:scale-[1.04] transition-transform" loading="lazy" />
                      : <span className="text-4xl text-gray-200">🎨</span>
                    }
                    {badge && page.difficulty && (
                      <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${badge}`}>
                        {page.difficulty.charAt(0).toUpperCase() + page.difficulty.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">{page.title}</p>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5 capitalize">{page.category_slug.replace(/-/g, " ")}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── AD — mid browse ────────────────────────────────── */}
          <AdLeaderboard className="mt-10 mb-2" />

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button onClick={loadMore} disabled={loading}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold text-[14px] px-8 py-3.5 rounded-xl hover:border-blue-400 hover:text-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />{t.loading}</>
                ) : (
                  `${t.loadMore} · ${(total - pages.length).toLocaleString()} ${t.remaining}`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
