// app/[lang]/categories/page.tsx
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { getUI } from "@/lib/i18n";
import { AdLeaderboard, AdRectangle } from "@/app/components/AdSlot";
import { landingHreflang } from "@/lib/hreflang";

export const revalidate = 3600;


const CATEGORY_EMOJI: Record<string, string> = {
  "animal-coloring-pages": "🦁", "fairy-tales": "🐉", "space-science": "🚀",
  "holiday-coloring": "🎄", "nature-coloring": "🌿", "food-drinks": "🍕",
  "fantasy-coloring": "🐉", "seasonal-coloring": "🍂", "characters": "🎭",
  "emotions-mindfulness": "💛", "education": "📚", "jobs-professions": "👷",
  "pattern-coloring": "🔷", "vehicles": "🚗", "sports": "⚽",
  "tiere": "🦁", "fahrzeuge": "🚗", "bildung": "📚", "charaktere": "🎭",
  "emotionen-achtsamkeit": "💛", "feiertage": "🎄", "maerchen": "🐉",
  "natur": "🌿", "saisonale": "🍂", "weltraum": "🚀",
  "sport": "⚽", "berufe-jobs": "👷", "muster": "🔷",
  "animales": "🦁", "vehiculos": "🚗", "educacion": "📚",
  "animaux": "🦁", "vehicules": "🚗", "personnages": "🎭",
  "animali": "🦁", "veicoli": "🚗",
  "dieren": "🦁", "voertuigen": "🚗",
  "animais": "🦁", "veiculos": "🚗",
};
function emoji(slug: string) { return CATEGORY_EMOJI[slug] ?? "🎨"; }

const DIFFICULTY_BADGE: Record<string, string> = {
  easy:   "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard:   "bg-blue-100 text-blue-800",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const tMeta = getUI(lang);
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
  const hreflang = landingHreflang();
  return {
    title: `${tMeta.categoriesTitle} | colorversum`,
    description: tMeta.categoriesSeoTitle,
    alternates: {
      ...hreflang.alternates,
      canonical: `${BASE_URL}/${lang}/categories`,
    },
  };
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = getUI(lang);

  // ── Data fetching ──────────────────────────────────────────────
  const [catRes, countRes] = await Promise.all([
    supabase
      .from("category_translations")
      .select("category_id, name, slug, description")
      .eq("language", lang)
      .not("slug", "is", null),
    supabase
      .from("categories_with_counts")
      .select("id, computed_topic_count"),
  ]);

  const countById: Record<string, number> = {};
  for (const row of countRes.data ?? []) countById[row.id] = row.computed_topic_count;

  // English slugs for preview image bridge
  const { data: enCats } = await supabase
    .from("category_translations")
    .select("category_id, slug")
    .eq("language", "en");

  const catIdToEnSlug: Record<string, string> = {};
  for (const row of enCats ?? []) catIdToEnSlug[row.category_id] = row.slug;

  const categories = (catRes.data ?? [])
    .map(c => ({
      ...c,
      topic_count: countById[c.category_id] ?? 0,
      en_slug:     catIdToEnSlug[c.category_id] ?? "",
    }))
    .filter(c => c.topic_count > 0)
    .sort((a, b) => b.topic_count - a.topic_count);

  // Preview images — direct from view, keyed by category_id (no slug bridge needed)
  const { data: catPreviewData } = await supabase
    .from("category_preview_images")
    .select("category_id, image_thumb_url, image_url");

  const previewsByCatId: Record<string, string[]> = {};
  for (const row of catPreviewData ?? []) {
    const thumb = row.image_thumb_url ?? row.image_url;
    if (!thumb) continue;
    if (!previewsByCatId[row.category_id]) previewsByCatId[row.category_id] = [];
    previewsByCatId[row.category_id].push(thumb);
  }

  // Popular pages for the hero section
  const [featuredRes, popularRes, countRes2] = await Promise.all([
    supabase
      .from("landing_page_cards")
      .select("page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug")
      .eq("language", lang)
      .eq("is_featured", true)
      .order("views", { ascending: false })
      .limit(8),
    supabase
      .from("landing_page_cards")
      .select("page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug")
      .eq("language", lang)
      .order("views", { ascending: false })
      .limit(8),
    supabase
      .from("landing_page_cards")
      .select("coloring_page_id", { count: "exact", head: true })
      .eq("language", lang),
  ]);

  const heroCards = [...(featuredRes.data ?? []), ...(popularRes.data ?? [])]
    .filter((c, i, arr) => arr.findIndex(x => x.page_slug === c.page_slug) === i)
    .slice(0, 8);

  const totalPages = countRes2.count ?? 0;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <Header lang={lang} />
      <div className="overflow-x-hidden">

        {/* ── PAGE HEADER ─────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200" style={{ paddingTop: 64 }}>
          <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-7 sm:pb-8">
            <nav className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-400 mb-5">
              <Link href={`/${lang}`} className="hover:text-blue-500 transition-colors">
                {t.browse}
              </Link>
              <span className="text-gray-300">›</span>
              <span className="text-gray-600">{t.categories}</span>
            </nav>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-2">
                  {t.freePrintable}
                </p>
                <h1 className="text-[clamp(26px,4vw,42px)] font-black text-gray-900 tracking-tight leading-tight">
                  {t.categoriesTitle}
                </h1>
                <p className="text-[15px] text-gray-500 mt-2 max-w-[560px] leading-relaxed">
                  {totalPages.toLocaleString()}+ {t.categoriesDesc} {categories.length} {t.categoriesOf}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/${lang}/browse`}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold text-[13px] px-4 py-2.5 rounded-xl hover:border-blue-400 hover:text-blue-500 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  {t.browseAllBtn}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-20">

          {/* ── AD ────────────────────────────────────────────────── */}
          <AdLeaderboard className="mb-10" />

          {/* ── CATEGORIES GRID ─────────────────────────────────────── */}
          <section>
            <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">
                  {t.browseByCategory}
                </p>
                <h2 className="text-[clamp(20px,2.8vw,28px)] font-black text-gray-900 tracking-tight">
                  {categories.length} {t.categories.toLowerCase()}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat, i) => {
                const emojiStr = emoji(cat.slug);
                const previews = previewsByCatId[cat.category_id] ?? [];
                return (
                  <Link
                    key={cat.category_id}
                    href={`/${lang}/${cat.slug}`}
                    className={`group rounded-[18px] border bg-white overflow-hidden flex flex-col hover:border-blue-200 hover:shadow-[0_6px_28px_rgba(17,24,39,.1)] hover:-translate-y-[3px] transition-all ${
                      i < 4 ? "border-gray-300" : "border-gray-200"
                    }`}
                  >
                    <div className="relative border-b border-gray-200 overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      <div className="absolute inset-0 grid grid-cols-2 gap-px bg-gray-200">
                        {[0, 1, 2, 3].map(j => (
                          <div
                            key={j}
                            className="bg-[#FAFAFA] group-hover:bg-[#F5F7FF] flex items-center justify-center transition-colors overflow-hidden"
                          >
                            {previews[j]
                              ? <img src={previews[j]} alt="" aria-hidden="true" className="w-[88%] h-[88%] object-contain" loading="lazy" />
                              : <span className="text-3xl opacity-20 select-none">{emojiStr}</span>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 flex flex-col" style={{ minHeight: 110 }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xl leading-none shrink-0">{emojiStr}</span>
                        <span className="text-[15px] font-black text-gray-900 tracking-tight leading-tight">
                          {cat.name}
                        </span>
                        {i < 4 && (
                          <span className="ml-auto text-[10px] font-bold text-blue-500 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full shrink-0">
                            {t.topBadge}
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-[12px] text-gray-400 leading-snug line-clamp-2 mb-2 flex-1">
                          {cat.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[12px] font-semibold text-gray-400">
                          {cat.topic_count} {t.topicsLabel}
                        </span>
                        <span className="text-[13px] font-bold text-blue-500 group-hover:translate-x-[3px] transition-transform">
                          {t.browse} →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ── AD ────────────────────────────────────────────────── */}
          <AdLeaderboard className="mt-12" />

          {/* ── POPULAR PAGES ─────────────────────────────────────── */}
          {heroCards.length > 0 && (
            <section className="mt-12 sm:mt-16">
              <div className="flex items-end justify-between gap-5 mb-6 flex-wrap">
                <div>
                  <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">
                    {t.mostDownloaded}
                  </p>
                  <h2 className="text-[clamp(20px,2.8vw,28px)] font-black text-gray-900 tracking-tight">
                    {t.popularPages}
                  </h2>
                </div>
                <Link
                  href={`/${lang}/browse?sort=popular`}
                  className="text-[13px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap"
                >
                  {t.seeAll}
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {heroCards.map(page => {
                  const badge = page.difficulty
                    ? (DIFFICULTY_BADGE[page.difficulty.toLowerCase()] ?? null)
                    : null;
                  const thumb = page.image_thumb_url ?? page.image_url;
                  return (
                    <Link
                      key={page.page_slug}
                      href={`/${lang}/${page.category_slug}/${page.topic_slug}/${page.page_slug}`}
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
                        <p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">
                          {page.title}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── SEO TEXT BLOCK ────────────────────────────────────── */}
          <section className="mt-12 sm:mt-16">
            <div className="bg-white border border-gray-200 rounded-[20px] px-5 sm:px-10 py-7 sm:py-9">
              <h2 className="text-[20px] font-black text-gray-900 tracking-tight mb-4">
                {t.categoriesSeoTitle}
              </h2>
              <div className="text-[15px] leading-[1.8] text-gray-600 space-y-3">
                <p>{t.categoriesSeoP1}</p>
                <p>{t.categoriesSeoP2}</p>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3">
                  {t.allCategories}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <Link
                      key={cat.category_id}
                      href={`/${lang}/${cat.slug}`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <span>{emoji(cat.slug)}</span>
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
      <Footer lang={lang} />
    </>
  );
}
