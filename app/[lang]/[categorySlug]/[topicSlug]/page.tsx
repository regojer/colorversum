import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { AdLeaderboard } from "@/app/components/AdSlot";
import { getUI } from "@/lib/i18n";
import { categoryEmoji as emoji } from "@/lib/emoji";
import { DIFFICULTY_BADGE } from "@/lib/constants";
import { topicHreflang, fetchCategorySlugsByLang, fetchTopicSlugsByLang } from "@/lib/hreflang";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";

// ─────────────────────────────────────────────────────────────────
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; categorySlug: string; topicSlug: string }>;
}): Promise<Metadata> {
  const { lang, categorySlug, topicSlug } = await params;

  const { data: topic } = await supabase
    .from("topic_translations")
    .select("topic_id, name, seo_title, seo_description")
    .eq("slug", topicSlug)
    .eq("language", lang)
    .single();

  const displayName = topic?.name ?? titleCase(topicSlug);
  const title       = topic?.seo_title ?? `${displayName} Coloring Pages — Free Printable | colorversum`;
  const description = topic?.seo_description ?? `Download free printable ${displayName.toLowerCase()} coloring pages. High-quality PDF coloring sheets for kids and adults — no sign-up required.`;

  // Hreflang — fetch slugs for all languages
  let alternates: Record<string, unknown> = {};
  if (topic?.topic_id) {
    const { data: baseTopic } = await supabase
      .from("topics")
      .select("category_id")
      .eq("id", topic.topic_id)
      .single();
    if (baseTopic?.category_id) {
      const [catSlugs, topicSlugs] = await Promise.all([
        fetchCategorySlugsByLang(supabase, baseTopic.category_id),
        fetchTopicSlugsByLang(supabase, topic.topic_id),
      ]);
      alternates = topicHreflang(catSlugs, topicSlugs).alternates ?? {};
    }
  }

  const canonicalUrl = `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}`;
  return {
    title,
    description,
    alternates: { ...(alternates as Record<string, unknown>), canonical: canonicalUrl },
    openGraph: { title, description, type: "website", url: canonicalUrl },
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

  // ── 2. Get category_id from base topics table ─────────────────
  const { data: baseTopic } = await supabase
    .from("topics")
    .select("category_id")
    .eq("id", topic.topic_id)
    .single();

  const categoryId = baseTopic?.category_id ?? null;

  // ── 3. Parallel fetches ───────────────────────────────────────
  // Step A: base coloring pages + other parallel data (no join, no !inner)
  const [cpRes, categoryRes, relatedRes, countRes] = await Promise.all([
    supabase
      .from("coloring_pages")
      .select("id, image_thumb_url, image_url, difficulty")
      .eq("topic_id", topic.topic_id)
      .eq("is_published", true)
      .eq("is_ready", true)
      .order("views", { ascending: false })
      .limit(24),

    supabase
      .from("category_translations")
      .select("name, slug")
      .eq("slug", categorySlug)
      .eq("language", lang)
      .single(),

    categoryId
      ? supabase
          .from("topics")
          .select("id")
          .eq("category_id", categoryId)
          .neq("id", topic.topic_id)
          .limit(16)
      : Promise.resolve({ data: [] }),

    supabase
      .from("coloring_pages")
      .select("id", { count: "exact", head: true })
      .eq("topic_id", topic.topic_id)
      .eq("is_published", true)
      .eq("is_ready", true),
  ]);

  // Step B: translations for those page IDs (depends on cpRes)
  const cpIds = (cpRes.data ?? []).map(p => p.id);
  const { data: translationsRaw } = cpIds.length
    ? await supabase
        .from("coloring_page_translations")
        .select("slug, title, coloring_page_id")
        .eq("language", lang)
        .in("coloring_page_id", cpIds)
    : { data: [] };

  // Join: preserve views-based order from cpRes, drop entries with no translation
  type PageRow = { slug: string; title: string; image_thumb_url: string | null; image_url: string | null; difficulty: string | null };
  const transMap = new Map((translationsRaw ?? []).map(t => [t.coloring_page_id, t]));
  const pages: PageRow[] = (cpRes.data ?? [])
    .map(cp => {
      const tr = transMap.get(cp.id);
      if (!tr) return null;
      return { slug: tr.slug, title: tr.title, image_thumb_url: cp.image_thumb_url, image_url: cp.image_url, difficulty: cp.difficulty };
    })
    .filter((p): p is PageRow => p !== null);

  if (pages.length === 0) notFound();

  const category   = categoryRes.data;
  const totalCount = countRes.count ?? 0;

  // Fetch related topic translations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relatedTopicIds = ((relatedRes as any).data ?? []).map((t: { id: string }) => t.id) as string[];
  const { data: relatedTopicsRaw } = relatedTopicIds.length
    ? await supabase
        .from("topic_translations")
        .select("topic_id, slug, name")
        .eq("language", lang)
        .in("topic_id", relatedTopicIds)
    : { data: [] };
  const relatedTopics = ((relatedTopicsRaw ?? []) as Array<{ topic_id: string; slug: string | null; name: string | null }>)
    .filter(t => t.slug && t.slug.trim() !== "") as Array<{ topic_id: string; slug: string; name: string | null }>;

  // Explore more: pages from same category, different topics
  const { data: explorePagesRaw } = categoryId
    ? await supabase
        .from("landing_page_cards")
        .select("page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug")
        .eq("language", lang)
        .eq("category_slug", categorySlug)
        .neq("topic_id", topic.topic_id)
        .order("views", { ascending: false })
        .range(0, 11)
        .limit(12)
    : { data: [] };

  type CrossPage = {
    page_slug: string; title: string;
    image_thumb_url: string | null; image_url: string | null;
    difficulty: string | null; topic_slug: string; category_slug: string;
  };
  const explorePages = (explorePagesRaw ?? []) as CrossPage[];
  const firstRelatedTopic = relatedTopics[0] ?? null;

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
                {t.explorePages} {displayName.toLowerCase()} {t.coloringPages.toLowerCase()} — {t.noPagesSubtitle.replace("We're still adding pages for this topic.", `${t.freeToPrint ?? "free to print"}.`)}
              </p>
            </div>
            <span className="text-[13px] font-semibold text-gray-400 self-end whitespace-nowrap">{totalCount.toLocaleString()} {t.pages}</span>
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
                {t.browse} {category.name}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {pages.map((page, i) => {
              const badge = page.difficulty ? (DIFFICULTY_BADGE[page.difficulty.toLowerCase()] ?? null) : null;
              const thumb = page.image_thumb_url ?? page.image_url;
              return (
                <Link
                  key={page.slug}
                  href={`/${lang}/${categorySlug}/${topicSlug}/${page.slug}`}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-blue-200 hover:shadow-[0_4px_20px_rgba(17,24,39,.09)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="aspect-square bg-[#FAFAFA] border-b border-gray-200 flex items-center justify-center relative overflow-hidden">
                    {thumb
                      ? <img src={thumb} alt={`${page.title} coloring page printable`} className="w-[78%] h-[78%] object-contain group-hover:scale-[1.04] transition-transform" loading={i < 4 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} />
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
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <AdLeaderboard className="mt-10" />

        {/* ── SEO + RELATED TOPICS ──────────────────────────────────── */}
        <section className="mt-10 sm:mt-12">
          <div className="bg-white border border-gray-200 rounded-[20px] px-5 sm:px-10 py-7 sm:py-9">
            <h2 className="text-[20px] font-black text-gray-900 tracking-tight mb-4">{t.freePrintable} {displayName} {t.coloringPages}</h2>
            <div className="text-[15px] leading-[1.8] text-gray-600 space-y-3 mb-6">
              <p>
                Our <strong>{displayName.toLowerCase()} coloring pages</strong> are completely free to download and print — no account needed, no watermarks. Each page is a high-resolution PDF coloring sheet with clean bold outlines that work perfectly with crayons, markers, or colored pencils.
              </p>
              <p>
                Whether you need <strong>easy {displayName.toLowerCase()} coloring pages</strong> for young kids or more detailed designs for adults, you&apos;ll find a variety of styles and difficulty levels above. New <strong>printable {displayName.toLowerCase()} coloring sheets</strong> are added regularly.
              </p>
              {relatedTopics.length > 0 && (
                <p>
                  {"If you enjoy "}<Link href={`/${lang}/${categorySlug}/${topicSlug}`} className="text-blue-500 hover:underline font-semibold">{displayName} coloring pages</Link>
                  {", you might also like "}
                  {relatedTopics.slice(0, 3).map((rt, i) => (
                    <span key={rt.slug}>
                      <Link href={`/${lang}/${categorySlug}/${rt.slug}`} className="text-blue-500 hover:underline font-semibold">
                        {rt.name ?? titleCase(rt.slug)} coloring pages
                      </Link>
                      {i < Math.min(2, relatedTopics.length - 1) ? ", " : ""}
                    </span>
                  ))}
                  {"."}
                </p>
              )}
            </div>
            {relatedTopics.length > 0 && (
              <div className="pt-6 border-t border-gray-100">
                <p className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3">
                  {t.moreTopics} {category?.name ?? ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {relatedTopics.map(rt => (
                    <Link key={rt.slug} href={`/${lang}/${categorySlug}/${rt.slug}`}
                      className="inline-flex items-center text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all capitalize"
                    >{rt.name ?? titleCase(rt.slug)}</Link>
                  ))}
                  {category && (
                    <Link href={`/${lang}/${categorySlug}`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-3.5 py-1.5 hover:bg-blue-100 transition-all"
                    >{t.allTopics} →</Link>
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
                <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{t.keepExploring}</p>
                <h2 className="text-[clamp(20px,2.8vw,26px)] font-black text-gray-900 tracking-tight">
                  {t.moreTopics} {category?.name ?? ""}
                </h2>
              </div>
              {category && (
                <Link href={`/${lang}/${categorySlug}`} className="text-[13px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap">
                  {t.allTopics} →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {relatedTopics.slice(0, 8).map(rt => (
                <Link key={rt.slug} href={`/${lang}/${categorySlug}/${rt.slug}`}
                  className="group flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-3.5 sm:px-4 py-3 sm:py-3.5 hover:border-blue-200 hover:shadow-[0_4px_16px_rgba(17,24,39,.08)] hover:-translate-y-0.5 transition-all"
                >
                  <span className="text-2xl shrink-0">{emoji(categorySlug)}</span>
                  <span className="text-[13px] sm:text-[13.5px] font-bold text-gray-700 group-hover:text-blue-600 transition-colors capitalize leading-snug">
                    {rt.name ?? titleCase(rt.slug)}
                  </span>
                  <svg className="ml-auto shrink-0 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-[3px] transition-all" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── CROSS-TOPIC SECTION ───────────────────────────────────── */}
        {explorePages.length > 0 && (
          <section className="mt-12 sm:mt-14">
            <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{t.keepExploring}</p>
                <h2 className="text-[clamp(18px,2.5vw,24px)] font-black text-gray-900 tracking-tight">
                  Explore {category?.name} coloring pages
                </h2>
              </div>
              <Link href={`/${lang}/${categorySlug}`} className="text-[13px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap">
                {t.seeAll}
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {explorePages.map((page, i) => {
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
                        ? <img src={thumb} alt={`${page.title} coloring page`} className="w-[78%] h-[78%] object-contain group-hover:scale-[1.04] transition-transform" loading={i < 2 ? "eager" : "lazy"} />
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
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── JSON-LD ────────────────────────────────────────────────── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/${lang}` },
                    { "@type": "ListItem", "position": 2, "name": category?.name ?? titleCase(categorySlug), "item": `${BASE_URL}/${lang}/${categorySlug}` },
                    { "@type": "ListItem", "position": 3, "name": `${displayName} Coloring Pages` },
                  ],
                },
                {
                  "@type": "CollectionPage",
                  "@id": `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}`,
                  "name": `${displayName} Coloring Pages`,
                  "description": `Free printable ${displayName.toLowerCase()} coloring pages. Download as PDF instantly.`,
                  "url": `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}`,
                  "numberOfItems": totalCount,
                  "hasPart": pages.slice(0, 8).map(page => ({
                    "@type": "WebPage",
                    "name": page.title,
                    "url": `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}/${page.slug}`,
                    "image": page.image_thumb_url ?? page.image_url,
                  })),
                },
              ],
            }),
          }}
        />
      </div>
      <Footer lang={lang} />
    </>
  );
}
