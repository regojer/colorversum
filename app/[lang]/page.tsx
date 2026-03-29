import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import HeroCards from "@/app/components/HeroCards";
import { getUI } from "@/lib/i18n";
import { AdLeaderboard } from "@/app/components/AdSlot";
import { landingHreflang } from "@/lib/hreflang";

export const revalidate = 3600; // ISR — rebuild every hour


// Emoji keyed by English category slug only
const CATEGORY_EMOJI: Record<string, string> = {
  animals: "🦁", fantasy: "🐉", dinosaurs: "🦕", space: "🚀",
  holidays: "🎄", flowers: "🌸", vehicles: "🚗", underwater: "🐠",
  food: "🍕", sports: "⚽", buildings: "🏰", nature: "🌿",
  // common en slugs used in the view
  "animal-coloring-pages": "🦁", "fairy-tales": "🐉", "space-science": "🚀",
  "holiday-coloring": "🎄", "nature-coloring": "🌿", "food-drinks": "🍕",
  "fantasy-coloring": "🐉", "seasonal-coloring": "🍂", "characters": "🎭",
  "emotions-mindfulness": "💛", "education": "📚", "jobs-professions": "👷",
  "pattern-coloring": "🔷", "vehicles": "🚗",
};
function emoji(enSlug: string) { return CATEGORY_EMOJI[enSlug] ?? "🎨"; }

const DIFFICULTY_BADGE: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-blue-100 text-blue-800",
};

// ── Types ──────────────────────────────────────────────────────────
type CardRow = {
  coloring_page_id: string;
  page_slug: string;
  title: string;
  image_url: string | null;
  image_thumb_url: string | null;
  difficulty: string | null;
  is_featured: boolean | null;
  views: number | null;
  topic_slug: string;      // already translated for this lang
  category_slug: string;   // already translated for this lang
};

type CategoryRow = {
  category_id: string;
  name: string;
  slug: string;            // translated slug
  description: string | null;
};

// ── UI Components ──────────────────────────────────────────────────
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

function PageCard({ card, lang }: { card: CardRow; lang: string }) {
  const badge = card.difficulty ? (DIFFICULTY_BADGE[card.difficulty.toLowerCase()] ?? null) : null;
  const thumb = card.image_thumb_url ?? card.image_url;
  // URL is guaranteed correct — all slugs come pre-joined from the view
  const href = `/${lang}/${card.category_slug}/${card.topic_slug}/${card.page_slug}`;
  return (
    <Link href={href} className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-blue-200 hover:shadow-[0_4px_20px_rgba(17,24,39,.09)] hover:-translate-y-0.5 transition-all">
      <div className="aspect-square bg-[#FAFAFA] border-b border-gray-200 flex items-center justify-center relative overflow-hidden">
        {thumb
          ? <img src={thumb} alt={`${card.title} coloring page printable`} className="w-[78%] h-[78%] object-contain group-hover:scale-[1.04] transition-transform" loading="lazy" />
          : <span className="text-4xl text-gray-200">🎨</span>
        }
        {badge && card.difficulty && (
          <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${badge}`}>
            {card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1)}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">{card.title}</p>
      </div>
    </Link>
  );
}

function SectionHeader({ eyebrow, title, href, linkLabel }: {
  eyebrow: string; title: string; href: string; linkLabel: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 sm:gap-5 mb-5 sm:mb-7 flex-wrap">
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{eyebrow}</p>
        <h2 className="text-[clamp(22px,2.8vw,30px)] font-black text-gray-900 tracking-tight leading-tight">{title}</h2>
      </div>
      <Link href={href} className="text-[13px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap transition-colors">
        {linkLabel} →
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
  return {
    title: "Free Printable Coloring Pages for Kids & Adults | colorversum",
    description:
      "Download 60,000+ free printable coloring pages for kids and adults. Animals, dinosaurs, fantasy, holidays and more. PDF coloring sheets ready to print in seconds — no sign-up required.",
    openGraph: {
      title: "Free Coloring Pages for Kids & Adults | colorversum",
      description: "60,000+ free printable coloring sheets. Print instantly.",
      type: "website",
      url: `${BASE_URL}/${lang}`,
    },
    ...landingHreflang(),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = getUI(lang);

  // All queries run in parallel
  const [
    catTransRes,
    enCatTransRes,
    featuredRes,
    popularRes,
    easyRes,
    catPreviewRes,  // ← now from category_preview_images view
    topicPreviewRes,
  ] = await Promise.all([
    // Categories (translated)
    supabase
      .from("category_translations")
      .select("category_id, name, slug, description")
      .eq("language", lang)
      .limit(12),

    // English slugs — still needed for emoji lookup
    supabase
      .from("category_translations")
      .select("category_id, slug")
      .eq("language", "en"),

    // Featured pages — from the view, language already joined
    supabase
      .from("landing_page_cards")
      .select("coloring_page_id, page_slug, title, image_url, image_thumb_url, difficulty, is_featured, views, topic_slug, category_slug")
      .eq("language", lang)
      .eq("is_featured", true)
      .limit(6),

    // Popular pages — from the view
    supabase
      .from("landing_page_cards")
      .select("coloring_page_id, page_slug, title, image_url, image_thumb_url, difficulty, is_featured, views, topic_slug, category_slug")
      .eq("language", lang)
      .order("views", { ascending: false })
      .limit(8),

    // Easy pages — from the view
    supabase
      .from("landing_page_cards")
      .select("coloring_page_id, page_slug, title, image_url, image_thumb_url, difficulty, is_featured, views, topic_slug, category_slug")
      .eq("language", lang)
      .eq("difficulty", "easy")
      .order("views", { ascending: false })
      .limit(8),

    // Category preview images — from dedicated view (max 4 per category, pre-filtered)
    supabase
      .from("category_preview_images")
      .select("category_id, image_thumb_url, image_url"),

    // Topic preview images
    supabase
      .from("coloring_pages")
      .select("image_thumb_url, image_url, topic_id")
      .eq("is_ready", true)
      .eq("is_published", true)
      .not("topic_id", "is", null)
      .order("views", { ascending: false })
      .limit(400),
  ]);

  // ── Build lookup maps ──────────────────────────────────────────
  const categories = (catTransRes.data ?? []) as CategoryRow[];

  // category_id → English slug (still needed for emoji)
  const catIdToEnSlug: Record<string, string> = {};
  for (const row of (enCatTransRes.data ?? []) as Array<{ category_id: string; slug: string }>) {
    catIdToEnSlug[row.category_id] = row.slug;
  }

  // category_id → preview images (direct from view — no slug bridge)
  const categoryPreviews: Record<string, string[]> = {};
  for (const row of (catPreviewRes.data ?? []) as Array<{ category_id: string; image_thumb_url: string | null; image_url: string | null }>) {
    const thumb = row.image_thumb_url ?? row.image_url;
    if (!thumb) continue;
    if (!categoryPreviews[row.category_id]) categoryPreviews[row.category_id] = [];
    categoryPreviews[row.category_id].push(thumb);
  }

  // topic_id → preview images[]
  const topicPreviews: Record<string, string[]> = {};
  for (const img of (topicPreviewRes.data ?? []) as Array<{ topic_id: string; image_thumb_url: string | null; image_url: string | null }>) {
    if (!img.topic_id) continue;
    const thumb = img.image_thumb_url ?? img.image_url;
    if (!thumb) continue;
    if (!topicPreviews[img.topic_id]) topicPreviews[img.topic_id] = [];
    if (topicPreviews[img.topic_id].length < 4) topicPreviews[img.topic_id].push(thumb);
  }

  const featuredCards = (featuredRes.data ?? []) as CardRow[];
  const popularCards  = (popularRes.data  ?? []) as CardRow[];
  const easyCards     = (easyRes.data     ?? []) as CardRow[];

  // Hero cards — featured first, fallback to popular
  const heroCardData = ([...featuredCards, ...popularCards])
    .filter(c => c.image_thumb_url ?? c.image_url)
    .slice(0, 5)
    .map(c => ({
      id:              c.coloring_page_id,
      slug:            c.page_slug,
      title:           c.title,
      image_thumb_url: c.image_thumb_url,
      image_url:       c.image_url,
      difficulty:      c.difficulty,
      href:            `/${lang}/${c.category_slug}/${c.topic_slug}/${c.page_slug}`,
    }));

  // ── Topic cards — single view query, all slugs pre-joined ───────
  const { data: topicCardsData } = await supabase
    .from("topic_cards")
    .select("topic_id, topic_slug, name, category_slug, category_id")
    .eq("language", lang)
    .not("topic_slug", "is", null)
    .not("category_slug", "is", null);

  type TopicCardRow = {
    topic_id: string; topic_slug: string; name: string | null;
    category_slug: string; category_id: string;
  };

  // Topics that have preview images — both slugs guaranteed from view
  const topicsWithPreviews = ((topicCardsData ?? []) as TopicCardRow[])
    .filter(tp => (topicPreviews[tp.topic_id]?.length ?? 0) >= 2)
    .slice(0, 12)
    .map(tp => ({
      topic_id:      tp.topic_id,
      slug:          tp.topic_slug,
      name:          tp.name ?? tp.topic_slug.replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase()),
      category_slug: tp.category_slug,
      category_id:   tp.category_id,
    }));

  return (
    <>
      <Header lang={lang} />
      <div className="overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div
        className="rounded-b-[44px] overflow-hidden relative"
        style={{
          paddingTop: 64,
        }}
      >
        {/* Hero background — watercolor splash, desktop & mobile variants */}
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            backgroundImage: "url('/hero-bg-desktop.png')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          className="absolute inset-0 sm:hidden"
          style={{
            backgroundImage: "url('/hero-bg-mobile.png')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-10 sm:pb-16 flex flex-col items-center text-center relative z-10">
          <div className="hidden xs:inline-flex items-center gap-2 bg-white/75 border border-white/60 backdrop-blur-md rounded-full px-3 sm:px-4 py-1.5 mb-5 sm:mb-7 text-[11px] sm:text-[12.5px] font-bold text-gray-700">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,.2)] shrink-0" />
            {t.heroBadge}
          </div>
          <h1 className="font-black text-white leading-none mb-5 whitespace-pre-line" style={{ fontSize: "clamp(40px,7.5vw,84px)", letterSpacing: "-.04em", textShadow: "0 1px 12px rgba(80,120,160,.35), 0 2px 4px rgba(0,0,0,.12)" }}>
            {t.heroTitle}
          </h1>
          <p className="text-gray-600 text-[15px] sm:text-[17px] leading-relaxed max-w-[480px] mb-7 sm:mb-9 px-2 sm:px-0">
            {t.heroSubtitle}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mb-7">
            <Link href={`/${lang}/browse`} className="inline-flex items-center gap-2 bg-white text-blue-500 font-bold text-[15px] px-7 py-3.5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,.14)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,.18)] transition-all">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              {t.browsePages}
            </Link>
          </div>
          <div className="hidden sm:flex items-center justify-center gap-6 flex-wrap mb-1">
            {[t.freeToPrint, t.noSignUp, t.newEveryDay].map(txt => (
              <span key={txt} className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-blue-500"><polyline points="20 6 9 17 4 12"/></svg>
                {txt}
              </span>
            ))}
          </div>
          <HeroCards cards={heroCardData} />
        </div>
      </div>

      {/* ── TRUST BAR ─────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-8 grid grid-cols-2 md:grid-cols-4">
          {([
            { stat: "1M+",   label: t.trustDownloaded },
            { stat: "10,000+", label: t.trustFreePages },
            { stat: "Free",    label: t.trustNoCreditCard },
            { stat: "100+",     label: t.trustAddedWeekly },
          ] as { stat: string; label: string }[]).map((item, i) => (
            <div key={i} className={["flex flex-col items-center justify-center py-4 px-3 gap-0.5", i % 2 === 0 ? "border-r border-gray-200" : "", i < 2 ? "border-b border-gray-200 md:border-b-0" : "", i < 3 ? "md:border-r md:border-gray-200" : ""].join(" ")}>
              <span className="text-[15px] sm:text-[17px] font-black text-gray-900 leading-none">{item.stat}</span>
              <span className="text-[11px] sm:text-[12px] font-semibold text-gray-400 text-center leading-snug mt-0.5">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── AD ────────────────────────────────────────────────────── */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-7"><AdLeaderboard /></div>

      {/* ── CATEGORIES ────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-8" style={{ paddingTop: "clamp(40px, 6vw, 72px)" }}>
        <SectionHeader eyebrow={t.browseByCategory} title={t.findWhatKidLoves} href={`/${lang}/browse`} linkLabel={t.allCategories} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.length === 0
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-[18px] border border-gray-100 bg-gray-50 h-[200px] animate-pulse" />)
            : categories.map((cat, i) => {
                const enSlug   = catIdToEnSlug[cat.category_id] ?? "";
                const emojiStr = emoji(enSlug);
                const previews = categoryPreviews[cat.category_id] ?? [];
                return (
                  <Link key={cat.category_id} href={`/${lang}/${cat.slug}`}
                    className={`group rounded-[18px] border bg-white overflow-hidden flex flex-col hover:border-blue-200 hover:shadow-[0_6px_28px_rgba(17,24,39,.1)] hover:-translate-y-[3px] transition-all ${i < 4 ? "border-gray-300" : "border-gray-200"}`}
                  >
                    <div className="relative border-b border-gray-200 overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      <div className="absolute inset-0 grid grid-cols-2 gap-px bg-gray-200">
                        {[0,1,2,3].map(j => (
                          <div key={j} className="bg-[#FAFAFA] group-hover:bg-[#F5F7FF] flex items-center justify-center transition-colors overflow-hidden">
                            {previews[j]
                              ? <img src={previews[j]} alt="" aria-hidden="true" className="w-[88%] h-[88%] object-contain" loading="lazy" />
                              : <span className="text-3xl opacity-20 select-none">{emojiStr}</span>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 flex flex-col" style={{ minHeight: 112 }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xl leading-none shrink-0">{emojiStr}</span>
                        <span className="text-[15px] font-black text-gray-900 tracking-tight leading-tight">{cat.name}</span>
                        {i < 4 && <span className="ml-auto text-[10px] font-bold text-blue-500 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full shrink-0">{t.top}</span>}
                      </div>
                      <p className="text-[12.5px] text-gray-400 leading-[1.5] line-clamp-2 flex-1 mb-3">{cat.description ?? "\u00a0"}</p>
                      <div className="flex items-center justify-end">
                        <span className="text-[13px] font-bold text-blue-500 group-hover:translate-x-[3px] transition-transform">{t.browse} →</span>
                      </div>
                    </div>
                  </Link>
                );
              })
          }
        </div>
        <div className="flex justify-center pt-5 sm:pt-6">
          <Link href={`/${lang}/browse`} className="inline-flex items-center gap-2 bg-white text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 font-bold text-[14px] px-6 py-3 rounded-xl transition-all hover:-translate-y-px">
            {t.browseAll}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>
      </section>

      {/* ── SEO BLOCK ─────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-8" style={{ paddingTop: "clamp(36px, 5vw, 64px)" }}>
        <div className="bg-white border border-gray-200 rounded-[20px] px-5 sm:px-10 py-7 sm:py-9">
          <h2 className="text-[22px] font-black text-gray-900 tracking-tight mb-5">{t.seoTitle}</h2>
          <div className="text-[15px] leading-[1.8] text-gray-600 space-y-3">
            <p>{t.seoP1}</p>
            <p>{t.seoP2}</p>
          </div>
          <div className="mt-7 pt-6 border-t border-gray-100">
            <p className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3">{t.popularCategories}</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {categories.map(cat => (
                <Link key={cat.category_id} href={`/${lang}/${cat.slug}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
                  <span>{emoji(catIdToEnSlug[cat.category_id] ?? "")}</span>{cat.name}
                </Link>
              ))}
              <Link href={`/${lang}/browse`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-3.5 py-1.5 hover:bg-blue-100 transition-all">{t.viewAll} →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── AD ────────────────────────────────────────────────────── */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-10"><AdLeaderboard /></div>

      {/* ── POPULAR PAGES ─────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-8" style={{ paddingTop: "clamp(40px, 6vw, 72px)" }}>
        <SectionHeader eyebrow={t.mostDownloaded} title={t.popularPages} href={`/${lang}/browse?sort=popular`} linkLabel={t.seeAllPopular} />
        {popularCards.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {popularCards.map(card => <PageCard key={card.coloring_page_id} card={card} lang={lang} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}
      </section>

      {/* ── EASY PAGES ────────────────────────────────────────────── */}
      {easyCards.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-4 sm:px-8" style={{ paddingTop: "clamp(40px, 6vw, 72px)" }}>
          <SectionHeader eyebrow={t.greatForKids} title={t.easyPages} href={`/${lang}/browse?difficulty=easy`} linkLabel={t.seeAllEasy} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {easyCards.map(card => <PageCard key={card.coloring_page_id} card={card} lang={lang} />)}
          </div>
        </section>
      )}

      {/* ── POPULAR TOPICS ────────────────────────────────────────── */}
      {topicsWithPreviews.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-4 sm:px-8" style={{ paddingTop: "clamp(40px, 6vw, 72px)" }}>
          <div className="flex items-end justify-between gap-5 mb-5 sm:mb-7 flex-wrap">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{t.exploreByTopic}</p>
              <h2 className="text-[clamp(22px,2.8vw,30px)] font-black text-gray-900 tracking-tight">{t.popularTopics}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {topicsWithPreviews.map((topic, i) => {
              const catSlug  = topic.category_slug;
              const enSlug   = catIdToEnSlug[topic.category_id] ?? "";
              if (!catSlug || !topic.slug) return null;
              const previews = topicPreviews[topic.topic_id] ?? [];
              return (
                <Link key={topic.topic_id} href={`/${lang}/${catSlug}/${topic.slug}`}
                  className={`group rounded-[18px] border bg-white overflow-hidden flex flex-col hover:border-blue-200 hover:shadow-[0_6px_28px_rgba(17,24,39,.1)] hover:-translate-y-[3px] transition-all ${i < 4 ? "border-gray-300" : "border-gray-200"}`}
                >
                  <div className="relative border-b border-gray-200 overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    <div className="absolute inset-0 grid grid-cols-2 gap-px bg-gray-200">
                      {[0,1,2,3].map(j => (
                        <div key={j} className="bg-[#FAFAFA] group-hover:bg-[#F5F7FF] flex items-center justify-center transition-colors overflow-hidden">
                          {previews[j]
                            ? <img src={previews[j]} alt="" aria-hidden="true" className="w-[88%] h-[88%] object-contain" loading="lazy" />
                            : <span className="text-3xl opacity-20 select-none">{emoji(enSlug)}</span>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col" style={{ minHeight: 100 }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl leading-none shrink-0">{emoji(enSlug)}</span>
                      <span className="text-[15px] font-black text-gray-900 tracking-tight capitalize">{topic.name}</span>
                      {i < 4 && <span className="ml-auto text-[10px] font-bold text-blue-500 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full shrink-0">{t.top}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[12px] font-semibold text-gray-400">{previews.length}+ {t.pages}</span>
                      <span className="text-[13px] font-bold text-blue-500 group-hover:translate-x-[3px] transition-transform">{t.browse} →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── AD ────────────────────────────────────────────────────── */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-10"><AdLeaderboard /></div>

      {/* ── CTA BANNER ────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-8 mt-6 mb-4">
        <div className="rounded-[20px] sm:rounded-[28px] px-6 sm:px-12 py-10 sm:py-14 text-center relative overflow-hidden" style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#1D4ED8 100%)" }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 right-40 w-40 h-40 rounded-full bg-white/5" />
          <div className="relative z-10">
            <h2 className="text-[clamp(24px,3.5vw,38px)] font-black text-white tracking-tight leading-tight mb-4">{t.ctaBrowseTitle}</h2>
            <p className="text-white/70 text-[16px] max-w-lg mx-auto mb-8 leading-relaxed">{t.ctaBrowseSubtitle}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/${lang}/browse`} className="inline-flex items-center gap-2 bg-white text-blue-700 font-extrabold text-[15px] px-8 py-4 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,.25)] hover:-translate-y-0.5 transition-all">{t.ctaBrowseBtn}</Link>
              <Link href={`/${lang}/categories`} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-[15px] px-8 py-4 rounded-xl transition-all">{t.ctaCategoriesBtn}</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer lang={lang} />
      </div>
    </>
  );
}
