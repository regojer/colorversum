"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { categoryEmoji as ce } from "@/lib/emoji";

// ── Types ───────────────────────────────────────────────────────────────────
type Category = { category_id: string; name: string; slug: string };
interface Props {
  lang: string;
  categories: Category[];
  children: React.ReactNode;
}

// ── Icons ───────────────────────────────────────────────────────────────────
const IcoSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);
const IcoX = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoChevron = ({ open }: { open: boolean }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
       style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const DIFF = {
  easy:   { dot: "bg-green-400", badge: "bg-green-100 text-green-700", label: "Easy"   },
  medium: { dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700", label: "Medium" },
  hard:   { dot: "bg-blue-400",  badge: "bg-blue-100  text-blue-700",  label: "Hard"   },
} as const;
type DiffKey = keyof typeof DIFF;

// ── Main Component ──────────────────────────────────────────────────────────
export default function DashboardShell({ lang, categories, children }: Props) {
  const pathname      = usePathname();
  const router        = useRouter();
  const searchParams  = useSearchParams();

  // Derive active state from URL
  const parts = pathname.split("/").filter(Boolean); // [lang, cat?, topic?, page?]
  const activeCatSlug  = parts.length >= 2 ? parts[1] : "";
  const isDetailPage   = parts.length >= 4;
  const activeCategory = categories.find(c => c.slug === activeCatSlug);

  const q          = searchParams.get("q")          ?? "";
  const sortVal    = searchParams.get("sort")        ?? "";
  const diffVal    = searchParams.get("difficulty")  ?? "";

  // Local search input (debounced sync to URL)
  const [searchInput, setSearchInput] = useState(q);
  const [filterOpen, setFilterOpen]   = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync search input when URL changes (e.g. after nav)
  useEffect(() => { setSearchInput(searchParams.get("q") ?? ""); }, [searchParams]);

  // Lock body scroll when sheet open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  // ── URL helpers ────────────────────────────────────────────────────────
  const updateParam = useCallback((key: string, val: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (val) p.set(key, val); else p.delete(key);
    const qs = p.toString();
    router.push(pathname + (qs ? `?${qs}` : ""));
  }, [pathname, router, searchParams]);

  const toggleParam = useCallback((key: string, val: string) => {
    const current = searchParams.get(key) ?? "";
    updateParam(key, current === val ? "" : val);
  }, [searchParams, updateParam]);

  function handleSearch(val: string) {
    setSearchInput(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => updateParam("q", val), 350);
  }

  function navigateToCategory(slug: string) {
    setFilterOpen(false);
    router.push(slug ? `/${lang}/${slug}` : `/${lang}`);
  }

  function clearAll() {
    setSearchInput("");
    router.push(pathname);
  }

  const hasFilters = !!(q || sortVal || diffVal);

  // ── Sidebar inner (shared desktop + mobile sheet) ──────────────────────
  const SidebarInner = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
        <Link href={`/${lang}`} onClick={onClose}
          className="text-[16px] font-black tracking-[-0.04em] text-gray-900 hover:text-violet-600 transition-colors block">
          colorversum
        </Link>
        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Free printable coloring pages</p>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
          <input type="search" value={searchInput} onChange={e => handleSearch(e.target.value)}
            placeholder="Search pages…"
            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-medium
                       text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-violet-400
                       focus:ring-[3px] focus:ring-violet-100 transition-all"
          />
          {searchInput && (
            <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
              <IcoX />
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <div className="px-4 pb-3">
        <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Sort by</p>
        <div className="flex gap-1.5">
          {([{ val: "new", label: "Newest" }, { val: "popular", label: "Popular" }] as const).map(s => (
            <button key={s.val} onClick={() => toggleParam("sort", s.val)}
              className={`flex-1 text-[12px] font-bold py-2 rounded-lg border transition-all ${
                sortVal === s.val
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
          {(Object.keys(DIFF) as DiffKey[]).map(d => {
            const cfg = DIFF[d]; const active = diffVal === d;
            return (
              <button key={d} onClick={() => { toggleParam("difficulty", d); onClose?.(); }}
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
          <button onClick={() => { navigateToCategory(""); onClose?.(); }}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all text-left w-full ${
              !activeCatSlug ? "bg-violet-50 text-violet-700 border border-violet-100" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="text-base w-5 text-center shrink-0">🎨</span>
            <span className="flex-1">All categories</span>
            {!activeCatSlug && <span className="text-violet-400 opacity-80"><IcoCheck /></span>}
          </button>
          {categories.map(cat => (
            <button key={cat.slug} onClick={() => { navigateToCategory(cat.slug); onClose?.(); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all text-left w-full ${
                activeCatSlug === cat.slug ? "bg-violet-50 text-violet-700 border border-violet-100" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-base w-5 text-center shrink-0">{ce(cat.slug)}</span>
              <span className="flex-1 truncate">{cat.name}</span>
              {activeCatSlug === cat.slug && <span className="text-violet-400 opacity-80"><IcoCheck /></span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa]">

      {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-[272px] fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 z-20">
        <SidebarInner />
      </aside>

      {/* ── Mobile Top Bar ───────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-12">
          <Link href={`/${lang}`}
            className="text-[15px] font-black tracking-[-0.04em] text-gray-900 hover:text-violet-600 transition-colors">
            colorversum
          </Link>
          <div className="flex items-center gap-2">
            {(hasFilters || activeCatSlug) && (
              <button onClick={() => { clearAll(); if (activeCatSlug) router.push(`/${lang}`); }}
                className="text-[11.5px] font-bold text-rose-500 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100">
                Clear
              </button>
            )}
            {(hasFilters || activeCatSlug) && (
              <span className="text-[11px] font-bold text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                {[sortVal, diffVal, q, activeCatSlug].filter(Boolean).length} active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile FAB ───────────────────────────────────────────────── */}
      <button
        onClick={() => setFilterOpen(true)}
        className="lg:hidden fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-violet-600 text-white
                   shadow-[0_8px_28px_rgba(109,40,217,.45)] flex items-center justify-center
                   hover:bg-violet-700 active:scale-95 transition-all"
        aria-label="Open filters"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
        {(hasFilters || activeCatSlug) && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
            {[sortVal, diffVal, q, activeCatSlug].filter(Boolean).length}
          </span>
        )}
      </button>

      {/* ── Mobile Filter Sheet ──────────────────────────────────────── */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${filterOpen ? "visible" : "invisible"}`}>
        {/* Backdrop */}
        <div
          onClick={() => setFilterOpen(false)}
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${filterOpen ? "opacity-100" : "opacity-0"}`}
        />

        {/* Sheet */}
        <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl flex flex-col
                         max-h-[92vh] shadow-2xl transition-transform duration-300 ease-out
                         ${filterOpen ? "translate-y-0" : "translate-y-full"}`}>

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 pt-1 shrink-0">
            <span className="text-[17px] font-black text-gray-900">
              Filters
              {(hasFilters || activeCatSlug) && (
                <span className="ml-2 text-[12px] font-bold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">
                  {[sortVal, diffVal, q, activeCatSlug].filter(Boolean).length} active
                </span>
              )}
            </span>
            {(hasFilters || activeCatSlug) && (
              <button
                onClick={() => { clearAll(); if (activeCatSlug) router.push(`/${lang}`); setFilterOpen(false); }}
                className="text-[13px] font-bold text-rose-500">
                Clear all
              </button>
            )}
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-5">

            {/* Search */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Search</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IcoSearch /></span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search coloring pages…"
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px]
                             text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-violet-400
                             focus:ring-[3px] focus:ring-violet-100 transition-all"
                />
                {searchInput && (
                  <button onClick={() => handleSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 p-0.5">
                    <IcoX size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Sort */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Sort by</p>
              <div className="flex gap-2">
                {([{ val: "new", label: "✨ Newest" }, { val: "popular", label: "🔥 Popular" }] as const).map(s => (
                  <button key={s.val} onClick={() => toggleParam("sort", s.val)}
                    className={`flex-1 py-2.5 rounded-2xl text-[13.5px] font-bold border transition-all ${
                      sortVal === s.val
                        ? "bg-violet-600 text-white border-violet-600 shadow-[0_2px_12px_rgba(124,58,237,.3)]"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Difficulty</p>
              <div className="flex gap-2">
                {(Object.keys(DIFF) as DiffKey[]).map(d => {
                  const cfg = DIFF[d]; const active = diffVal === d;
                  return (
                    <button key={d} onClick={() => toggleParam("difficulty", d)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-[13px] font-bold transition-all ${
                        active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
                      }`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${active ? "bg-white" : cfg.dot}`} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categories */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Category</p>
              <div className="flex flex-col gap-1">
                <button onClick={() => navigateToCategory("")}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-[14px] font-semibold transition-all ${
                    !activeCatSlug ? "bg-violet-50 text-violet-700 border border-violet-100" : "text-gray-700 hover:bg-gray-50"
                  }`}>
                  <span className="text-xl w-7 text-center shrink-0">🎨</span>
                  <span className="flex-1 text-left">All categories</span>
                  {!activeCatSlug && <IcoCheck />}
                </button>
                {categories.map(cat => (
                  <button key={cat.slug} onClick={() => navigateToCategory(cat.slug)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-[14px] font-semibold transition-all ${
                      activeCatSlug === cat.slug ? "bg-violet-50 text-violet-700 border border-violet-100" : "text-gray-700 hover:bg-gray-50"
                    }`}>
                    <span className="text-xl w-7 text-center shrink-0">{ce(cat.slug)}</span>
                    <span className="flex-1 text-left">{cat.name}</span>
                    {activeCatSlug === cat.slug && <IcoCheck />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={() => setFilterOpen(false)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black text-[15px] py-4
                         rounded-2xl shadow-[0_4px_16px_rgba(109,40,217,.35)] active:scale-[.98] transition-all">
              Show results
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop active filter bar ────────────────────────────────── */}
      <div className="hidden lg:flex sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200
                      lg:ml-64 xl:ml-[272px] px-6 xl:px-8 h-[52px] items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[13.5px] font-bold text-gray-900">
            {isDetailPage ? "Coloring Page" : activeCategory ? <>{ce(activeCategory.slug)} {activeCategory.name}</> : "All Coloring Pages"}
          </span>
          {!isDetailPage && (
            <span className="text-[12px] text-gray-400 font-medium">
              {hasFilters || activeCatSlug ? "filtered" : "1,000+ pages"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {diffVal && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${DIFF[diffVal as DiffKey]?.badge ?? "bg-gray-100 text-gray-600"}`}>
              {DIFF[diffVal as DiffKey]?.label}
              <button onClick={() => toggleParam("difficulty", diffVal)} className="opacity-50 hover:opacity-100 ml-0.5"><IcoX /></button>
            </span>
          )}
          {sortVal && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
              {sortVal === "popular" ? "Popular" : "Newest"}
              <button onClick={() => toggleParam("sort", sortVal)} className="opacity-50 hover:opacity-100 ml-0.5"><IcoX /></button>
            </span>
          )}
          {q && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
              "{q}"
              <button onClick={() => { updateParam("q", ""); setSearchInput(""); }} className="opacity-50 hover:opacity-100 ml-0.5"><IcoX /></button>
            </span>
          )}
          {hasFilters && (
            <button onClick={clearAll} className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="lg:ml-64 xl:ml-[272px]">
        {children}
      </div>

    </div>
  );
}
