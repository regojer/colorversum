"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { NavCategory } from "./Header";
import { getUI } from "@/lib/i18n";

const CATEGORY_EMOJI: Record<string, string> = {
  "animal-coloring-pages": "🦁", "fairy-tales": "🐉", "space-science": "🚀",
  "holiday-coloring": "🎄", "nature-coloring": "🌿", "food-drinks": "🍕",
  "fantasy-coloring": "🐉", "seasonal-coloring": "🍂", "characters": "🎭",
  "emotions-mindfulness": "💛", "education": "📚", "jobs-professions": "👷",
  "pattern-coloring": "🔷", "vehicles": "🚗", "sports": "⚽",
  "tiere": "🦁", "fahrzeuge": "🚗", "bildung": "📚", "charaktere": "🎭",
  "emotionen-achtsamkeit": "💛", "feiertage": "🎄", "maerchen": "🐉",
  "natur": "🌿", "saisonale": "🍂", "fantasy": "🐉", "weltraum": "🚀",
  "sport": "⚽", "berufe-jobs": "👷", "muster": "🔷", "essen-getraenke": "🍕",
  "animales": "🦁", "vehiculos": "🚗", "educacion": "📚",
  "emociones-mindfulness": "💛", "festivos": "🎄", "cuentos-de-hadas": "🐉",
  "naturaleza": "🌿", "estacional": "🍂", "ciencia-espacial": "🚀",
  "deportes": "⚽", "trabajos-profesiones": "👷", "patrones": "🔷",
  "animaux": "🦁", "vehicules": "🚗", "personnages": "🎭",
  "emotions-pleine-conscience": "💛", "jours-feries": "🎄",
  "contes-de-fees": "🐉", "nature-2": "🌿", "saisonnier": "🍂",
  "science-espace": "🚀", "sports-2": "⚽",
  "animali": "🦁", "veicoli": "🚗", "istruzione": "📚",
  "dieren": "🦁", "voertuigen": "🚗", "onderwijs": "📚",
  "animais": "🦁", "veiculos": "🚗", "educacao": "📚",
};
function emoji(slug: string) { return CATEGORY_EMOJI[slug] ?? "🎨"; }

export default function HeaderClient({
  categories,
  lang: langProp,
}: {
  categories: NavCategory[];
  lang: string;
}) {
  const pathname = usePathname();
  const lang = langProp || pathname.split("/")[1] || "en";
  const t = getUI(lang);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [catsOpen,    setCatsOpen]    = useState(false);
  const [showHeader,  setShowHeader]  = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSidebarOpen(false); setCatsOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) { setShowHeader(true); setLastScrollY(y); return; }
      setShowHeader(y < lastScrollY);
      setLastScrollY(y);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  function clampDropdown() {
    const dd = dropdownRef.current;
    if (!dd) return;
    dd.style.left = "0px";
    dd.style.removeProperty("right");
    requestAnimationFrame(() => {
      const rect = dd.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        dd.style.left  = "auto";
        dd.style.right = "0px";
      }
    });
  }

  // Quick filter items — plain objects, no JSX in values
  const quickFilters = [
    { label: t.new,      href: `/${lang}/browse?sort=new`,        dot: "bg-green-500"  },
    { label: t.popular,  href: `/${lang}/browse?sort=popular`,    dot: "bg-amber-500"  },
    { label: t.easy,     href: `/${lang}/browse?difficulty=easy`, dot: ""              },
    { label: t.featured, href: `/${lang}/browse?featured=true`,   dot: "bg-purple-500" },
  ];

  const discoverLinks = [
    { icon: "🆕", label: t.new,      href: `/${lang}/browse?sort=new`      },
    { icon: "🔥", label: t.popular,  href: `/${lang}/browse?sort=popular`  },
    { icon: "⭐", label: t.featured, href: `/${lang}/browse?featured=true` },
  ];

  return (
    <>
      {/* ── NAV BAR ──────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-[400] flex items-center transition-transform duration-300 ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{
          height: 64,
          background: "rgba(255,255,255,.93)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px bg-[#EBEBEB] rounded-full"
          style={{ width: "min(1060px, calc(100% - 32px))" }}
        />

        <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-7 flex items-center gap-2 min-w-0">

          {/* Brand */}
          <Link
            href={`/${lang}`}
            className="text-[17px] font-black tracking-[-0.04em] text-gray-900 shrink-0 mr-4 sm:mr-6 hover:opacity-70 transition-opacity"
          >
            colorversum
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">

            <Link
              href={`/${lang}/browse`}
              className="text-[13.5px] font-semibold text-gray-500 hover:text-gray-900 hover:bg-black/[0.04] px-3.5 py-[7px] rounded-lg transition-all whitespace-nowrap"
            >
              {t.browseAll}
            </Link>

            {/* Categories — click → full page, hover → dropdown */}
            <div
              className="relative"
              onMouseEnter={() => { setCatsOpen(true); clampDropdown(); }}
              onMouseLeave={() => setCatsOpen(false)}
            >
              <div className="absolute top-full -left-5 -right-5 h-[14px]" />

              <Link
                href={`/${lang}/categories`}
                className="flex items-center gap-1 text-[13.5px] font-semibold text-gray-500 hover:text-gray-900 hover:bg-black/[0.04] px-3.5 py-[7px] rounded-lg transition-all whitespace-nowrap"
              >
                {t.categories}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  className={`transition-transform duration-200 ${catsOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </Link>

              <div
                ref={dropdownRef}
                className={`absolute top-[calc(100%+10px)] w-[520px] max-w-[calc(100vw-32px)] bg-white border border-gray-200 rounded-[18px] p-4 shadow-[0_8px_40px_rgba(17,24,39,.13)] transition-all duration-[180ms] ${
                  catsOpen
                    ? "opacity-100 pointer-events-auto translate-y-0"
                    : "opacity-0 pointer-events-none translate-y-1.5"
                }`}
              >
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {quickFilters.map(q => (
                    <Link
                      key={q.href}
                      href={q.href}
                      onClick={() => setCatsOpen(false)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                    >
                      {q.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${q.dot}`} />}
                      {q.label}
                    </Link>
                  ))}
                </div>

                <div className="h-px bg-gray-100 mb-3" />

                <div className="grid grid-cols-3 gap-0.5">
                  {categories.slice(0, 9).map(cat => (
                    <Link
                      key={cat.slug}
                      href={`/${lang}/${cat.slug}`}
                      onClick={() => setCatsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-[17px] leading-none shrink-0">{emoji(cat.slug)}</span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-gray-700 truncate">{cat.name}</div>
                        <div className="text-[11px] text-gray-400 font-medium">
                          {cat.topic_count.toLocaleString()} {t.topicsLabel}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="h-px bg-gray-100 mt-3 mb-2.5" />

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-500">
                    {categories.length} {t.categories.toLowerCase()}
                  </span>
                  <Link
                    href={`/${lang}/categories`}
                    onClick={() => setCatsOpen(false)}
                    className="text-[12.5px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    {t.allCategories} →
                  </Link>
                </div>
              </div>
            </div>


            <Link
              href={`/${lang}/generator`}
              className="text-[13.5px] font-semibold text-gray-500 hover:text-gray-900 hover:bg-black/[0.04] px-3.5 py-[7px] rounded-lg transition-all whitespace-nowrap"
            >
              {t.aiGenerator}
            </Link>
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
            <form
              action={`/${lang}/browse`}
              method="get"
              className="flex items-center bg-gray-50 border-[1.5px] border-gray-200 rounded-[9px] px-3 h-9 gap-1.5 w-[180px] focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,.1)] focus-within:w-[230px] transition-all"
            >
              <svg className="text-gray-400 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                name="q"
                type="search"
                placeholder={t.searchPlaceholder}
                autoComplete="off"
                className="flex-1 bg-transparent border-none outline-none text-[13px] font-medium text-gray-900 placeholder:text-gray-400 min-w-0"
              />
            </form>

          </div>

          {/* Mobile right */}
          <div className="md:hidden ml-auto flex items-center gap-2 shrink-0">
            <Link
              href={`/${lang}/browse`}
              className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t.browseAll}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </Link>
            <button
              className="w-9 h-9 flex flex-col justify-center gap-[5px] bg-transparent border-[1.5px] border-gray-200 rounded-[10px] p-[9px] hover:bg-gray-50 transition-all"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="block w-full h-[1.5px] bg-gray-700 rounded-sm" />
              <span className="block w-full h-[1.5px] bg-gray-700 rounded-sm" />
              <span className="block w-full h-[1.5px] bg-gray-700 rounded-sm" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE OVERLAY ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[498] bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MOBILE SIDEBAR ───────────────────────────────────────── */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[499] w-[min(300px,85vw)] bg-white flex flex-col overflow-y-auto shadow-[-12px_0_48px_rgba(17,24,39,.14)] transition-transform duration-[280ms] ease-[cubic-bezier(.4,0,.2,1)] ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-gray-100 shrink-0">
          <Link
            href={`/${lang}`}
            onClick={() => setSidebarOpen(false)}
            className="text-[17px] font-black tracking-[-0.04em] text-gray-900"
          >
            colorversum
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center border-[1.5px] border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
            aria-label="Close menu"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-3 pt-3 shrink-0">
          <form
            action={`/${lang}/browse`}
            method="get"
            className="flex items-center bg-gray-50 border-[1.5px] border-gray-200 rounded-[9px] px-3 h-10 gap-2 focus-within:border-blue-400 focus-within:bg-white transition-all"
          >
            <svg className="text-gray-400 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              name="q"
              type="search"
              placeholder={t.searchPages}
              autoComplete="off"
              className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-gray-900 placeholder:text-gray-400"
            />
          </form>
        </div>

        <div className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">

          <Link
            href={`/${lang}/browse`}
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 mt-2 rounded-lg text-[14px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span className="text-[17px] w-6 text-center shrink-0">🔍</span>
            {t.browseAll}
          </Link>

          <Link
            href={`/${lang}/categories`}
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span className="text-[17px] w-6 text-center shrink-0">📂</span>
            {t.categories}
          </Link>

          <div className="h-px bg-gray-100 my-1.5" />
          <p className="text-[10.5px] font-bold uppercase tracking-[.09em] text-gray-400 px-2.5 pb-1.5">
            {t.exploreByTopic}
          </p>

          {discoverLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              <span className="text-[17px] w-6 text-center shrink-0">{l.icon}</span>
              {l.label}
            </Link>
          ))}

          <div className="h-px bg-gray-100 my-1.5" />
          <p className="text-[10.5px] font-bold uppercase tracking-[.09em] text-gray-400 px-2.5 pb-1.5">
            {t.categories}
          </p>

          {categories.slice(0, 8).map(cat => (
            <Link
              key={cat.slug}
              href={`/${lang}/${cat.slug}`}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              <span className="text-[17px] w-6 text-center shrink-0">{emoji(cat.slug)}</span>
              {cat.name}
            </Link>
          ))}

          <div className="h-px bg-gray-100 my-1.5" />

          <Link
            href={`/${lang}/generator`}
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span className="text-[17px] w-6 text-center shrink-0">✨</span>
            {t.aiGenerator}
          </Link>

        </div>


      </div>
    </>
  );
}
