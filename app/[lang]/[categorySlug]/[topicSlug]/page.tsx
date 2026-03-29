import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { getUI } from "@/lib/i18n";
import { AdLeaderboard, AdRectangle } from "@/app/components/AdSlot";
import { topicHreflang, fetchCategorySlugsByLang, fetchTopicSlugsByLang } from "@/lib/hreflang";


const CATEGORY_EMOJI: Record<string, string> = {
  animals:    "🦁", fantasy:    "🐉", dinosaurs:  "🦕", space:      "🚀",
  holidays:   "🎄", flowers:    "🌸", vehicles:   "🚗", underwater: "🐠",
  food:       "🍕", sports:     "⚽", buildings:  "🏰", nature:     "🌿",
};
function emoji(slug: string) { return CATEGORY_EMOJI[slug] ?? "🎨"; }

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const DIFFICULTY_BADGE: Record<string, string> = {
  easy:   "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard:   "bg-blue-100 text-blue-800",
};

// ─────────────────────────────────────────────────────────────────
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; categorySlug: string; topicSlug: string }>;
}): Promise<Metadata> {
  const { lang, categorySlug, topicSlug } = await params;
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";

  const { data: topic } = await supabase
    .from("topic_translations")
    .select("topic_id, name, seo_title, seo_description, topics!inner(category_id)")
    .eq("slug", topicSlug)
    .eq("language", lang)
    .single();

  const displayName = topic?.name ?? titleCase(topicSlug);
  const title       = topic?.seo_title ?? `${displayName} Coloring Pages — Free Printable | colorversum`;
  const description = topic?.seo_description ?? `Download free printable ${displayName.toLowerCase()} coloring pages. High-quality PDF coloring sheets for kids and adults — no sign-up required.`;

  // Hreflang — fetch slugs for all languages
  let alternates = {};
  if (topic?.topic_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryId = (topic as any).topics?.category_id;
    const [catSlugs, topicSlugs] = await Promise.all([
      categoryId ? fetchCategorySlugsByLang(supabase, categoryId) : Promise.resolve({}),
      fetchTopicSlugsByLang(supabase, topic.topic_id),
    ]);
    alternates = topicHreflang(catSlugs, topicSlugs).alternates ?? {};
  }

  return {
    title,
    description,
    openGraph: { title, description, type: "website", url: `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}` },
    alternates,
  };
}

// ─────────────────────────────────────────────────────────────────
export default async function TopicPage({
  params,
}: {
  params: Promise<{ lang: string; categorySlug: string; topicSlug: string }>;
}) {
  const { lang, categorySlug, topicSlug } = await params;
  const t = getUI(lang);

  // ── 1. Topic from translation table ───────────────────────────
  const { data: topic } = await supabase
    .from("topic_translations")
    .select("topic_id, name, slug, seo_title, seo_description")
    .eq("slug", topicSlug)
    .eq("language", lang)
    .single();

  if (!topic) notFound();

  const displayName = titleCase(topic.name ?? topicSlug);

  // ── 2. Get category_id from base topics table (needed for related topics) ─
  const { data: baseTopic } = await supabase
    .from("topics")
    .select("category_id")
    .eq("id", topic.topic_id)
    .single();

  const categoryId = baseTopic?.category_id ?? null;

  // ── 3. Parallel fetches ───────────────────────────────────────
  const [pagesRes, categoryRes, relatedRes, countRes] = await Promise.all([
    // Pages — from landing_page_cards view, filter by topic_slug (topic_id not exposed in view)
    supabase
      .from("landing_page_cards")
      .select("page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug")
      .eq("language", lang)
      .eq("topic_slug", topicSlug)
      .order("views", { ascending: false })
      .limit(24),

    // Category name — from translation table using translated slug + lang
    supabase
      .from("category_translations")
      .select("name, slug")
      .eq("slug", categorySlug)
      .eq("language", lang)
      .single(),

    // Related topics — from topic_cards view (category_slug pre-joined)
    categoryId
      ? supabase
          .from("topic_cards")
          .select("topic_id, topic_slug, name, category_slug")
          .eq("language", lang)
          .eq("category_id", categoryId)
          .neq("topic_id", topic.topic_id)
          .not("topic_slug", "is", null)
          .limit(16)
      : Promise.resolve({ data: [] }),

    // Total count — uses topic_id (language-independent)
    supabase
      .from("coloring_pages")
      .select("id", { count: "exact", head: true })
      .eq("topic_id", topic.topic_id)
      .eq("is_published", true)
      .eq("is_ready", true),
  ]);

  type PageRow = {
    page_slug: string; title: string;
    image_thumb_url: string | null; image_url: string | null;
    difficulty: string | null; topic_slug: string; category_slug: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pages: PageRow[] = (pagesRes as any).data ?? [];
  const category   = categoryRes.data;
  const totalCount = countRes.count ?? 0;

  // Fetch related topic translations using the IDs we just got
  // topic_cards view returns slug + category_slug directly — no second query needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relatedTopics = ((relatedRes as any).data ?? [])
    .filter((t: { topic_slug?: string; category_slug?: string }) => t.topic_slug && t.category_slug)
    .map((t: { topic_slug: string; name: string | null; category_slug: string }) => ({
      slug: t.topic_slug,
      name: t.name,
      category_slug: t.category_slug,
    })) as Array<{ slug: string; name: string | null; category_slug: string }>;

  return (
    <>
      <Header lang={lang} />

      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200" style={{ paddingTop: 64 }}>
        <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-7 sm:pb-8">
          <nav className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-400 mb-5 flex-wrap">
            <Link href={`/${lang}`} className="hover:text-blue-500 transition-colors">Home</Link>
            <span className="text-gray-300">›</span>
            {category && (
              <>
                <Link href={`/${lang}/${categorySlug}`} className="hover:text-blue-500 transition-colors flex items-center gap-1">
                  <span>{emoji(categorySlug)}</span>{category.name}
                </Link>
                <span className="text-gray-300">›</span>
              </>
            )}
            <span className="text-gray-600 capitalize">{displayName}</span>
          </nav>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-2">{t.freePrintable}</p>
              <h1 className="text-[clamp(24px,4vw,42px)] font-black text-gray-900 tracking-tight leading-tight mb-2">
                {displayName} {t.coloringPages}
              </h1>
              <p className="text-[15px] text-gray-500 max-w-[560px] leading-relaxed">
                {t.explorePages} {displayName.toLowerCase()} coloring pages — perfect for kids and adults. Download as PDF and print instantly at home.
              </p>
            </div>
            <span className="text-[13px] font-semibold text-gray-400 self-end whitespace-nowrap">{totalCount.toLocaleString()} pages</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-20">

        <AdLeaderboard className="mb-8" />

        {/* ── PAGES GRID ───────────────────────────────────────────── */}
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl mb-4 opacity-30">🎨</span>
            <p className="text-[18px] font-bold text-gray-700 mb-2">{t.noPages}</p>
            <p className="text-[14px] text-gray-400 mb-6 max-w-xs">{t.noPagesSubtitle}</p>
            {category && (
              <Link href={`/${lang}/${categorySlug}`} className="inline-flex items-center gap-2 bg-blue-500 text-white font-bold text-[14px] px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors">
                Browse {category.name}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {pages.map(page => {
              const badge = page.difficulty ? (DIFFICULTY_BADGE[page.difficulty.toLowerCase()] ?? null) : null;
              const thumb = page.image_thumb_url ?? page.image_url;
              return (
                <Link
                  key={page.page_slug}
                  href={`/${lang}/${page.category_slug}/${page.topic_slug}/${page.page_slug}`}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-blue-200 hover:shadow-[0_4px_20px_rgba(17,24,39,.09)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="aspect-square bg-[#FAFAFA] border-b border-gray-200 flex items-center justify-center relative overflow-hidden">
                    {thumb
                      ? <img src={thumb} alt={`${page.title} coloring page printable`} className="w-[78%] h-[78%] object-contain group-hover:scale-[1.04] transition-transform" loading="lazy" />
                      : <span className="text-4xl text-gray-200">🎨</span>
                    }
                    {badge && page.difficulty && (
                      <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${badge}`}>
                        {page.difficulty!.charAt(0).toUpperCase() + page.difficulty!.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">{page.title}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="w-full h-[50px] sm:h-[90px] rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[10.5px] font-bold uppercase tracking-widest text-gray-400 mt-10">
          ▤ Advertisement
        </div>

        {/* ── SEO + RELATED TOPICS ──────────────────────────────────── */}
        <section className="mt-10 sm:mt-12">
          <div className="bg-white border border-gray-200 rounded-[20px] px-5 sm:px-10 py-7 sm:py-9">
            <h2 className="text-[20px] font-black text-gray-900 tracking-tight mb-4">Free Printable {displayName} Coloring Pages</h2>
            <div className="text-[15px] leading-[1.8] text-gray-600 space-y-3 mb-6">
              <p>
                Our <strong>{displayName.toLowerCase()} coloring pages</strong> are completely free to download and print — no account needed, no watermarks. Each page is a high-resolution PDF coloring sheet with clean bold outlines that work perfectly with crayons, markers, or colored pencils.
              </p>
              <p>
                Whether you need <strong>easy {displayName.toLowerCase()} coloring pages</strong> for young kids or more detailed designs for adults, you&apos;ll find a variety of styles and difficulty levels above. New <strong>printable {displayName.toLowerCase()} coloring sheets</strong> are added regularly.
              </p>
            </div>
            {relatedTopics.length > 0 && (
              <div className="pt-6 border-t border-gray-100">
                <p className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3">
                  {t.moreTopics} — {category?.name ?? "this category"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {relatedTopics.map(t => (
                    <Link key={t.slug} href={`/${lang}/${t.category_slug ?? categorySlug}/${t.slug}`}
                      className="inline-flex items-center text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all capitalize"
                    >{t.name ?? titleCase(t.slug)}</Link>
                  ))}
                  {category && (
                    <Link href={`/${lang}/${categorySlug}`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-3.5 py-1.5 hover:bg-blue-100 transition-all"
                    >All {category.name} →</Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── RELATED TOPIC CARDS ───────────────────────────────────── */}
        {relatedTopics.length > 0 && (
          <section className="mt-12 sm:mt-14">
            <div className="flex items-end justify-between gap-4 mb-5 sm:mb-6">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{t.keepExploringTopics}</p>
                <h2 className="text-[clamp(20px,2.8vw,26px)] font-black text-gray-900 tracking-tight">
                  More {category?.name ?? ""} topics
                </h2>
              </div>
              {category && (
                <Link href={`/${lang}/${categorySlug}`} className="text-[13px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap">
                  All {category.name} →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {relatedTopics.slice(0, 8).map(t => (
                <Link key={t.slug} href={`/${lang}/${t.category_slug ?? categorySlug}/${t.slug}`}
                  className="group flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-3.5 sm:px-4 py-3 sm:py-3.5 hover:border-blue-200 hover:shadow-[0_4px_16px_rgba(17,24,39,.08)] hover:-translate-y-0.5 transition-all"
                >
                  <span className="text-2xl shrink-0">{emoji(categorySlug)}</span>
                  <span className="text-[13px] sm:text-[13.5px] font-bold text-gray-700 group-hover:text-blue-600 transition-colors capitalize leading-snug">
                    {t.name ?? titleCase(t.slug)}
                  </span>
                  <svg className="ml-auto shrink-0 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-[3px] transition-all" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
      <Footer lang={lang} />
    </>
  );
}
