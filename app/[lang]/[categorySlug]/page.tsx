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
import { categoryHreflang, fetchCategorySlugsByLang } from "@/lib/hreflang";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TopicPreviews    = Record<string, string[]>;
type CategoryPreviews = Record<string, string[]>;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";

// ─────────────────────────────────────────────────────────────────
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { lang, categorySlug } = await params;

  const { data: cat } = await supabase
    .from("category_translations")
    .select("category_id, name, seo_title, seo_description")
    .eq("slug", categorySlug)
    .eq("language", lang)
    .single();

  if (!cat) return {};

  const title       = cat.seo_title ?? `${cat.name} Coloring Pages — Free Printable | colorversum`;
  const description = cat.seo_description ?? `Free printable ${cat.name.toLowerCase()} coloring pages. Instant PDF download, no sign-up required.`;

  // Hreflang — fetch slugs for all languages
  const catSlugs  = await fetchCategorySlugsByLang(supabase, cat.category_id);
  const hreflang  = categoryHreflang(catSlugs);
  const canonicalUrl = `${BASE_URL}/${lang}/${categorySlug}`;

  return {
    title,
    description,
    alternates: { ...(hreflang.alternates as Record<string, unknown>), canonical: canonicalUrl },
    openGraph: { title, description, type: "website", url: canonicalUrl },
  };
}

// ─────────────────────────────────────────────────────────────────
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ lang: string; categorySlug: string }>;
}) {
  const { lang, categorySlug } = await params;
  const t = getUI(lang);

  // ── 1. Category from translation table ────────────────────────
  const { data: category } = await supabase
    .from("category_translations")
    .select("category_id, name, slug, description, seo_title, seo_description")
    .eq("slug", categorySlug)
    .eq("language", lang)
    .single();

  if (!category) notFound();

  // ── 2. Get all topic IDs for this category ─────────────────────
  const { data: baseTopics } = await supabase
    .from("topics")
    .select("id")
    .eq("category_id", category.category_id);

  const allTopicIdsInCategory = (baseTopics ?? []).map(t => t.id).filter(Boolean);

  // ── 3. Keep only topics that have published pages ──────────────
  const { data: topicIdsWithPages } = allTopicIdsInCategory.length
    ? await supabase
        .from("coloring_pages")
        .select("topic_id")
        .in("topic_id", allTopicIdsInCategory)
        .eq("is_published", true)
        .eq("is_ready", true)
    : { data: [] };

  const validTopicIds = [
    ...new Set((topicIdsWithPages ?? []).map(p => p.topic_id).filter(Boolean))
  ];

  // ── 4. Fetch topic translations ────────────────────────────────
  const { data: topicsRaw } = validTopicIds.length
    ? await supabase
        .from("topic_translations")
        .select("topic_id, name, slug, topics!inner(category_id)")
        .eq("language", lang)
        .eq("topics.category_id", category.category_id)
        .in("topic_id", validTopicIds)
        .not("slug", "is", null)
    : { data: [] };

  const topics = (topicsRaw ?? []).filter(t => !!t.slug && t.slug.trim() !== "");

  if (!topics || topics.length === 0) notFound();

  // ── 5. Everything else in parallel ────────────────────────────
  const [popularRes, newestRes, previewRes, otherCatsRes, pageCountsRes] = await Promise.all([
    validTopicIds.length
      ? supabase
          .from("coloring_page_translations")
          .select("slug, title, coloring_pages!inner(image_thumb_url, image_url, difficulty, topic_id, views)")
          .eq("language", lang)
          .in("coloring_pages.topic_id", validTopicIds)
          .eq("coloring_pages.is_published", true)
          .eq("coloring_pages.is_ready", true)
          .order("coloring_pages(views)", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),

    validTopicIds.length
      ? supabase
          .from("coloring_page_translations")
          .select("slug, title, coloring_pages!inner(image_thumb_url, image_url, difficulty, topic_id, created_at)")
          .eq("language", lang)
          .in("coloring_pages.topic_id", validTopicIds)
          .eq("coloring_pages.is_published", true)
          .eq("coloring_pages.is_ready", true)
          .order("coloring_pages(created_at)", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),

    validTopicIds.length
      ? supabase
          .from("coloring_pages")
          .select("image_thumb_url, image_url, topic_id")
          .in("topic_id", validTopicIds)
          .eq("is_published", true)
          .eq("is_ready", true)
          .order("views", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [] }),

    supabase
      .from("categories_with_counts")
      .select("id, name, slug, description, computed_topic_count")
      .gt("computed_topic_count", 0)
      .neq("slug", categorySlug)
      .order("computed_topic_count", { ascending: false })
      .limit(8),

    validTopicIds.length
      ? supabase
          .from("coloring_pages")
          .select("topic_id")
          .in("topic_id", validTopicIds)
          .eq("is_published", true)
          .eq("is_ready", true)
      : Promise.resolve({ data: [] }),
  ]);

  type CPBase = { image_thumb_url: string | null; image_url: string | null; difficulty: string | null; topic_id: string | null };
  type PageRow = { slug: string; title: string; coloring_pages: CPBase };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const popularPages: PageRow[] = ((popularRes as any).data ?? []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newestPages: PageRow[]  = ((newestRes as any).data  ?? []);
  const otherCats    = otherCatsRes.data ?? [];

  const pageCountByTopicId: Record<string, number> = {};
  for (const row of pageCountsRes.data ?? []) {
    if (!row.topic_id) continue;
    pageCountByTopicId[row.topic_id] = (pageCountByTopicId[row.topic_id] ?? 0) + 1;
  }

  const topicPreviews: TopicPreviews = {};
  for (const img of previewRes.data ?? []) {
    if (!img.topic_id) continue;
    const thumb = img.image_thumb_url ?? img.image_url;
    if (!thumb) continue;
    if (!topicPreviews[img.topic_id]) topicPreviews[img.topic_id] = [];
    if (topicPreviews[img.topic_id].length < 4) topicPreviews[img.topic_id].push(thumb);
  }

  const otherSlugs = otherCats.map(c => c.slug);
  const { data: catPreviewImages } = otherSlugs.length
    ? await supabase
        .from("coloring_pages")
        .select("image_thumb_url, image_url, category_slug")
        .eq("is_published", true).eq("is_ready", true)
        .in("category_slug", otherSlugs)
        .order("views", { ascending: false })
        .limit(150)
    : { data: [] };

  const categoryPreviews: CategoryPreviews = {};
  for (const img of catPreviewImages ?? []) {
    if (!img.category_slug) continue;
    const thumb = img.image_thumb_url ?? img.image_url;
    if (!thumb) continue;
    if (!categoryPreviews[img.category_slug]) categoryPreviews[img.category_slug] = [];
    if (categoryPreviews[img.category_slug].length < 4) categoryPreviews[img.category_slug].push(thumb);
  }

  const topicSlugMap: Record<string, string> = {};
  for (const tp of topics ?? []) topicSlugMap[tp.topic_id] = tp.slug;

  function pageHref(page: PageRow): string {
    const tSlug = page.coloring_pages.topic_id ? topicSlugMap[page.coloring_pages.topic_id] : null;
    return tSlug ? `/${lang}/${categorySlug}/${tSlug}/${page.slug}` : `/${lang}/browse`;
  }

  return (
    <>
      <Header lang={lang} />

      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200" style={{ paddingTop: 64 }}>
        <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-7 sm:pb-8">
          <nav className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-400 mb-5 flex-wrap">
            <Link href={`/${lang}`} className="hover:text-blue-500 transition-colors">Home</Link>
            <span className="text-gray-300">›</span>
            <span className="text-gray-600">{category.name}</span>
          </nav>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-2">{t.freePrintable}</p>
              <h1 className="text-[clamp(24px,4vw,42px)] font-black text-gray-900 tracking-tight leading-tight flex items-center gap-3 mb-2">
                <span>{emoji(categorySlug)}</span>{category.name} Coloring Pages
              </h1>
              {category.description && <p className="text-[15px] text-gray-500 max-w-[560px] leading-relaxed">{category.description}</p>}
            </div>
            <span className="text-[13px] font-semibold text-gray-400 self-end whitespace-nowrap">{(topics ?? []).length} {t.topicsLabel}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-20">

        <AdLeaderboard className="mb-8" />

        {/* ── TOPICS GRID ───────────────────────────────────────────── */}
        <section aria-label={`${category.name} topics`}>
          <div className="flex items-end justify-between gap-5 mb-6 flex-wrap">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{t.browseByTopic}</p>
              <h2 className="text-[clamp(20px,2.8vw,30px)] font-black text-gray-900 tracking-tight">{t.chooseTopic}</h2>
            </div>
            <span className="text-[13px] font-semibold text-gray-400">{(topics ?? []).length} {t.topicsLabel}</span>
          </div>

          {!topics || topics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4 opacity-30">{emoji(categorySlug)}</span>
              <p className="text-[16px] font-bold text-gray-600 mb-2">{t.topicsComingSoon}</p>
              <p className="text-[14px] text-gray-400">{t.comingSoon}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {topics.map((topic, i) => {
                const previews = topicPreviews[topic.topic_id] ?? [];
                return (
                  <Link
                    key={topic.topic_id}
                    href={`/${lang}/${categorySlug}/${topic.slug}`}
                    className={`group rounded-[18px] border bg-white overflow-hidden flex flex-col hover:border-blue-200 hover:shadow-[0_6px_28px_rgba(17,24,39,.1)] hover:-translate-y-[3px] transition-all ${i < 4 ? "border-gray-300" : "border-gray-200"}`}
                  >
                    <div className="relative border-b border-gray-200 overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      <div className="absolute inset-0 grid grid-cols-2 gap-px bg-gray-200">
                        {[0,1,2,3].map(j => (
                          <div key={j} className="bg-[#FAFAFA] group-hover:bg-[#F5F7FF] flex items-center justify-center transition-colors overflow-hidden">
                            {previews[j]
                              ? <img src={previews[j]} alt="" aria-hidden="true" className="w-[88%] h-[88%] object-contain" loading={i < 2 && j < 2 ? "eager" : "lazy"} />
                              : <span className="text-3xl opacity-20 select-none">{emoji(categorySlug)}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-3.5 sm:p-4 flex flex-col" style={{ minHeight: 100 }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xl leading-none shrink-0">{emoji(categorySlug)}</span>
                        <span className="text-[14px] sm:text-[15px] font-black text-gray-900 tracking-tight capitalize leading-tight">{topic.name}</span>
                        {i < 4 && <span className="ml-auto text-[10px] font-bold text-blue-500 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full shrink-0">{t.topBadge}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-[12px] font-semibold text-gray-400">{(pageCountByTopicId[topic.topic_id] ?? 0) > 0 ? `${pageCountByTopicId[topic.topic_id]}+ ${t.pages}` : `${previews.length > 0 ? previews.length + "+" : "0"} ${t.pages}`}</span>
                        <span className="text-[13px] font-bold text-blue-500 group-hover:translate-x-[3px] transition-transform">{t.browse} →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <AdLeaderboard className="mt-10" />

        {/* ── POPULAR PAGES ─────────────────────────────────────────── */}
        {popularPages.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <div className="flex items-end justify-between gap-5 mb-5 flex-wrap">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{t.mostDownloaded}</p>
                <h2 className="text-[clamp(20px,2.8vw,30px)] font-black text-gray-900 tracking-tight">{t.popularPages}</h2>
              </div>
              <Link href={`/${lang}/browse?category=${categorySlug}&sort=popular`} className="text-[13px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap">{t.seeAll}</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {popularPages.map((page, i) => {
                const cp = page.coloring_pages;
                const badge = cp.difficulty ? (DIFFICULTY_BADGE[cp.difficulty.toLowerCase()] ?? null) : null;
                const thumb = cp.image_thumb_url ?? cp.image_url;
                return (
                  <Link key={page.slug} href={pageHref(page)} className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-blue-200 hover:shadow-[0_4px_20px_rgba(17,24,39,.09)] hover:-translate-y-0.5 transition-all">
                    <div className="aspect-square bg-[#FAFAFA] border-b border-gray-200 flex items-center justify-center relative overflow-hidden">
                      {thumb ? <img src={thumb} alt={`${page.title} coloring page printable`} className="w-[78%] h-[78%] object-contain group-hover:scale-[1.04] transition-transform" loading={i < 4 ? "eager" : "lazy"} /> : <span className="text-4xl text-gray-200">🎨</span>}
                      {badge && cp.difficulty && <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${badge}`}>{cp.difficulty.charAt(0).toUpperCase() + cp.difficulty.slice(1)}</span>}
                    </div>
                    <div className="px-3 py-2.5"><p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">{page.title}</p></div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── NEWEST PAGES ──────────────────────────────────────────── */}
        {newestPages.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <div className="flex items-end justify-between gap-5 mb-5 flex-wrap">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{t.justAdded}</p>
                <h2 className="text-[clamp(20px,2.8vw,30px)] font-black text-gray-900 tracking-tight">New {category.name} pages</h2>
              </div>
              <Link href={`/${lang}/browse?category=${categorySlug}&sort=new`} className="text-[13px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap">{t.seeAll}</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {newestPages.map((page, i) => {
                const cp = page.coloring_pages;
                const badge = cp.difficulty ? (DIFFICULTY_BADGE[cp.difficulty.toLowerCase()] ?? null) : null;
                const thumb = cp.image_thumb_url ?? cp.image_url;
                return (
                  <Link key={page.slug} href={pageHref(page)} className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-blue-200 hover:shadow-[0_4px_20px_rgba(17,24,39,.09)] hover:-translate-y-0.5 transition-all">
                    <div className="aspect-square bg-[#FAFAFA] border-b border-gray-200 flex items-center justify-center relative overflow-hidden">
                      {thumb ? <img src={thumb} alt={`${page.title} coloring page printable`} className="w-[78%] h-[78%] object-contain group-hover:scale-[1.04] transition-transform" loading={i < 4 ? "eager" : "lazy"} /> : <span className="text-4xl text-gray-200">🎨</span>}
                      {badge && cp.difficulty && <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${badge}`}>{cp.difficulty.charAt(0).toUpperCase() + cp.difficulty.slice(1)}</span>}
                    </div>
                    <div className="px-3 py-2.5"><p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">{page.title}</p></div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── SEO BLOCK ─────────────────────────────────────────────── */}
        <section className="mt-12 sm:mt-16">
          <div className="bg-white border border-gray-200 rounded-[20px] px-5 sm:px-10 py-7 sm:py-9">
            <h2 className="text-[20px] font-black text-gray-900 tracking-tight mb-4">{t.freePrintable} {category.name} Coloring Pages</h2>
            <div className="text-[15px] leading-[1.8] text-gray-600 space-y-3">
              <p>
                colorversum has <strong>free {category.name.toLowerCase()} coloring pages</strong> across{" "}
                {(topics ?? []).length} topics — all available as instant PDF downloads, ready to print at home.
                Whether you&apos;re looking for easy designs for young kids or detailed scenes for adults, new pages are added regularly.
              </p>
              <p>Every <strong>printable {category.name.toLowerCase()} coloring sheet</strong> is completely free — no account required, no watermarks.</p>
            </div>
            {topics && topics.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3">{t.browseByTopic}</p>
                <div className="flex flex-wrap gap-2">
                  {topics.map(tp => (
                    <Link key={tp.topic_id} href={`/${lang}/${categorySlug}/${tp.slug}`}
                      className="inline-flex items-center text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all capitalize"
                    >{tp.name}</Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── OTHER CATEGORIES ──────────────────────────────────────── */}
        {otherCats.length > 0 && (
          <section className="mt-12 sm:mt-14">
            <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-1.5">{t.keepExploring}</p>
                <h2 className="text-[clamp(20px,2.8vw,26px)] font-black text-gray-900 tracking-tight">{t.moreCategories}</h2>
              </div>
              <Link href={`/${lang}`} className="text-[13px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap">{t.allCategories} →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {otherCats.map((cat, i) => (
                <Link key={cat.slug} href={`/${lang}/${cat.slug}`}
                  className={`group rounded-[18px] border bg-white overflow-hidden flex flex-col hover:border-blue-200 hover:shadow-[0_6px_28px_rgba(17,24,39,.1)] hover:-translate-y-[3px] transition-all ${i < 4 ? "border-gray-300" : "border-gray-200"}`}
                >
                  <div className="relative border-b border-gray-200 overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    <div className="absolute inset-0 grid grid-cols-2 gap-px bg-gray-200">
                      {[0,1,2,3].map(j => (
                        <div key={j} className="bg-[#FAFAFA] group-hover:bg-[#F5F7FF] flex items-center justify-center transition-colors overflow-hidden">
                          {categoryPreviews[cat.slug]?.[j]
                            ? <img src={categoryPreviews[cat.slug][j]} alt="" aria-hidden="true" className="w-[88%] h-[88%] object-contain" loading={i < 2 && j < 2 ? "eager" : "lazy"} />
                            : <span className="text-3xl opacity-20 select-none">{emoji(cat.slug)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3.5 sm:p-4 flex flex-col" style={{ minHeight: 100 }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl leading-none shrink-0">{emoji(cat.slug)}</span>
                      <span className="text-[14px] sm:text-[15px] font-black text-gray-900 tracking-tight leading-tight">{cat.name}</span>
                    </div>
                    <p className="text-[12px] text-gray-400 line-clamp-2 flex-1 mb-2">{cat.description ?? "\u00a0"}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-gray-400">{(cat.computed_topic_count ?? 0).toLocaleString()} {t.topicsLabel}</span>
                      <span className="text-[13px] font-bold text-blue-500 group-hover:translate-x-[3px] transition-transform">{t.browse} →</span>
                    </div>
                  </div>
                </Link>
              ))}
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
                    { "@type": "ListItem", "position": 2, "name": `${category.name} Coloring Pages` },
                  ],
                },
                {
                  "@type": "CollectionPage",
                  "@id": `${BASE_URL}/${lang}/${categorySlug}`,
                  "name": `${category.name} Coloring Pages`,
                  "description": category.description ?? `Free printable ${category.name.toLowerCase()} coloring pages.`,
                  "url": `${BASE_URL}/${lang}/${categorySlug}`,
                  "numberOfItems": topics.length,
                  "hasPart": topics.slice(0, 12).map(tp => ({
                    "@type": "WebPage",
                    "name": `${tp.name} coloring pages`,
                    "url": `${BASE_URL}/${lang}/${categorySlug}/${tp.slug}`,
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
