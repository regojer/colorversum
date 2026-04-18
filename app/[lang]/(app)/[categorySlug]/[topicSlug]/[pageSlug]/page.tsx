import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PrintButton from "@/app/components/PrintButton";
import DownloadButton from "@/app/components/DownloadButton";
import BackButton from "@/app/components/BackButton";
import { getUI } from "@/lib/i18n";
import { DIFFICULTY_BADGE } from "@/lib/constants";
import { pageHreflang, fetchCategorySlugsByLang, fetchTopicSlugsByLang, fetchPageSlugsByLang } from "@/lib/hreflang";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";

function cleanSeoTitle(title: string): string {
  const cleaned = title
    .replace(/^(discover the magic of our|explore our|introducing the|enjoy our|check out our|welcome to|presenting the)\s+/i, "")
    .replace(/\s*-\s*free\s*printable(\s*pdf)?$/i, "")
    .replace(/\s*coloring\s*page\s*for\s*kids\s*$/i, "")
    .trim();
  return cleaned.length > 55 ? cleaned.substring(0, 52).trim() + "…" : cleaned;
}

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; categorySlug: string; topicSlug: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { lang, categorySlug, topicSlug, pageSlug } = await params;

  const { data } = await supabase
    .from("coloring_page_translations")
    .select("title, description, coloring_page_id")
    .eq("slug", pageSlug)
    .eq("language", lang)
    .single();

  if (!data) return {};

  const { data: basePage } = await supabase
    .from("coloring_pages")
    .select("image_url, topic_id, category_slug")
    .eq("id", data.coloring_page_id)
    .single();

  const title       = `${cleanSeoTitle(data.title)} — Free Printable | colorversum`;
  const description = (data.description as string | null) ?? `Free printable ${data.title.toLowerCase()} coloring page. Download PDF instantly — no sign-up required.`;
  const imageUrl    = basePage?.image_url ?? null;

  let alternates = {};
  const topicId = basePage?.topic_id;
  if (topicId) {
    const { data: baseTopic } = await supabase.from("topics").select("category_id").eq("id", topicId).single();
    if (baseTopic?.category_id) {
      const [catSlugs, topicSlugs, pageSlugs] = await Promise.all([
        fetchCategorySlugsByLang(supabase, baseTopic.category_id),
        fetchTopicSlugsByLang(supabase, topicId),
        fetchPageSlugsByLang(supabase, data.coloring_page_id),
      ]);
      alternates = pageHreflang(catSlugs, topicSlugs, pageSlugs).alternates ?? {};
    }
  }

  const canonicalUrl = `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}/${pageSlug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 1200, alt: title }] : [],
      url: canonicalUrl,
      type: "website",
    },
    alternates: {
      ...(alternates as Record<string, unknown>),
      canonical: canonicalUrl,
    },
  };
}

export default async function PageDetail({
  params,
}: {
  params: Promise<{ lang: string; categorySlug: string; topicSlug: string; pageSlug: string }>;
}) {
  const { lang, categorySlug, topicSlug, pageSlug } = await params;

  if (!topicSlug || topicSlug === "null") notFound();

  const t = getUI(lang);

  const { data: translation } = await supabase
    .from("coloring_page_translations")
    .select("id, slug, title, description, html_content, coloring_page_id")
    .eq("slug", pageSlug)
    .eq("language", lang)
    .single();

  if (!translation) notFound();

  const { data: basePage } = await supabase
    .from("coloring_pages")
    .select("id, image_url, image_thumb_url, pdf_url, difficulty, age_group, style, topic_id, category_slug, views, keyword, created_at")
    .eq("id", translation.coloring_page_id)
    .single();

  if (!basePage) notFound();
  if (!basePage.image_url) notFound();

  type CPFull = {
    id: string; image_url: string | null; image_thumb_url: string | null;
    pdf_url: string | null; difficulty: string | null; age_group: string | null;
    style: string | null; topic_id: string | null; category_slug: string | null;
    views: number | null; keyword: string | null; created_at: string | null;
  };
  const cp = basePage as CPFull;

  const [relatedTopicRes, relatedCategoryRes, similarTopicsRes, nextIdRes, prevIdRes, randomPagesRes] = await Promise.all([
    cp.topic_id
      ? supabase
          .from("landing_page_cards")
          .select("page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug")
          .eq("language", lang)
          .eq("topic_id", cp.topic_id)
          .neq("page_slug", pageSlug)
          .not("image_url", "is", null)
          .order("views", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),

    supabase
      .from("landing_page_cards")
      .select("page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug")
      .eq("language", lang)
      .eq("category_slug", categorySlug)
      .neq("topic_id", cp.topic_id ?? "")
      .neq("page_slug", pageSlug)
      .not("image_url", "is", null)
      .order("views", { ascending: false })
      .limit(8),

    cp.topic_id
      ? supabase
          .from("topic_cards")
          .select("topic_id, topic_slug, name, category_slug")
          .eq("language", lang)
          .eq("category_slug", categorySlug)
          .neq("topic_id", cp.topic_id)
          .not("topic_slug", "is", null)
          .limit(20)
      : Promise.resolve({ data: [] }),

    cp.topic_id && cp.created_at
      ? supabase
          .from("coloring_pages")
          .select("id")
          .eq("topic_id", cp.topic_id)
          .gt("created_at", cp.created_at)
          .order("created_at", { ascending: true })
          .limit(1)
      : Promise.resolve({ data: [] }),

    cp.topic_id && cp.created_at
      ? supabase
          .from("coloring_pages")
          .select("id")
          .eq("topic_id", cp.topic_id)
          .lt("created_at", cp.created_at)
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] }),

    supabase
      .from("landing_page_cards")
      .select("page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug")
      .eq("language", lang)
      .neq("category_slug", categorySlug)
      .not("image_url", "is", null)
      .order("views", { ascending: false })
      .range(20, 35)
      .limit(6),
  ]);

  type NavPage = { slug: string; title: string };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextId: string | null = ((nextIdRes as any).data?.[0]?.id) ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevId: string | null = ((prevIdRes as any).data?.[0]?.id) ?? null;

  const [nextTransRes, prevTransRes] = await Promise.all([
    nextId
      ? supabase.from("coloring_page_translations").select("slug, title").eq("coloring_page_id", nextId).eq("language", lang).single()
      : Promise.resolve({ data: null }),
    prevId
      ? supabase.from("coloring_page_translations").select("slug, title").eq("coloring_page_id", prevId).eq("language", lang).single()
      : Promise.resolve({ data: null }),
  ]);

  const nextPage: NavPage | null = nextTransRes.data as NavPage | null;
  const prevPage: NavPage | null = prevTransRes.data as NavPage | null;

  type RelatedPage = {
    page_slug: string; title: string;
    image_thumb_url: string | null; image_url: string | null;
    difficulty: string | null; topic_slug: string; category_slug: string;
  };
  const topicPages    = (relatedTopicRes.data    ?? []) as RelatedPage[];
  const categoryPages = (relatedCategoryRes.data ?? []) as RelatedPage[];
  const seenSlugs     = new Set(topicPages.map(p => p.page_slug));
  const fillPages     = categoryPages.filter(p => !seenSlugs.has(p.page_slug));
  const relatedPages  = [...topicPages, ...fillPages].slice(0, 12);

  type SimilarTopic = { topic_id: string; topic_slug: string | null; name: string | null; category_slug: string | null };
  const candidateTopics = ((similarTopicsRes.data ?? []) as SimilarTopic[])
    .filter(t => !!t.topic_slug && t.topic_slug !== "null");

  const candidateIds = candidateTopics.map(t => t.topic_id);
  const { data: validTopicRows } = candidateIds.length
    ? await supabase.from("landing_page_cards").select("topic_id").eq("language", lang).in("topic_id", candidateIds)
    : { data: [] };
  const validTopicIdSet = new Set((validTopicRows ?? []).map((r: { topic_id: string }) => r.topic_id));
  const similarTopics = candidateTopics
    .filter(t => validTopicIdSet.has(t.topic_id))
    .slice(0, 6) as Array<{ topic_id: string; topic_slug: string; name: string | null; category_slug: string | null }>;

  const randomPages = (randomPagesRes.data ?? []) as RelatedPage[];

  const difficultyBadge = cp.difficulty
    ? (DIFFICULTY_BADGE[cp.difficulty.toLowerCase()] ?? "bg-gray-100 text-gray-700")
    : "bg-gray-100 text-gray-700";

  const rawKeyword = typeof cp.keyword === "string" ? cp.keyword : "";
  const tags: string[] = rawKeyword
    .replace(/\b(easy|medium|hard|simple|cartoon|realistic|coloring page|printable)\b/gi, "")
    .split(/[\s,]+/)
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 2 && tag.length < 20)
    .slice(0, 6);

  return (
    <div className="px-4 sm:px-6 xl:px-8 pt-5 pb-20">

      {/* Breadcrumb */}
      <nav className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 list-none text-[12px] font-semibold text-gray-400">
          <li><Link href={`/${lang}`} className="hover:text-violet-500 transition-colors">Home</Link></li>
          <li className="text-gray-300">›</li>
          <li><Link href={`/${lang}/${categorySlug}`} className="hover:text-violet-500 transition-colors capitalize">{titleCase(categorySlug)}</Link></li>
          <li className="text-gray-300">›</li>
          <li><Link href={`/${lang}/${categorySlug}/${topicSlug}`} className="hover:text-violet-500 transition-colors capitalize">{titleCase(topicSlug)}</Link></li>
          <li className="text-gray-300">›</li>
          <li className="text-gray-700 font-semibold truncate max-w-[160px] sm:max-w-[240px]">{translation.title}</li>
        </ol>
      </nav>

      <BackButton />

      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight mb-5">
        {translation.title}
      </h1>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] gap-5 sm:gap-7 items-start">

        {/* Image */}
        <div className="flex flex-col gap-2.5">
          <div className="relative bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
            {cp.image_url ? (
              <img
                src={cp.image_url}
                alt={`${translation.title} coloring page printable`}
                className="w-[92%] h-[92%] object-contain"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm font-medium">Image generating…</div>
            )}
            {cp.difficulty && (
              <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${difficultyBadge}`}>
                {cp.difficulty}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 font-medium text-center tracking-wide">{t.printReady}</p>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[64px]">

          <div className="bg-white border border-gray-200 rounded-[18px] p-5 shadow-sm flex flex-col gap-3">
            <div className="flex gap-3.5 flex-wrap text-[13px] font-semibold text-gray-500">
              {cp.views && cp.views > 0 && (
                <span className="flex items-center gap-1.5">
                  <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {cp.views.toLocaleString()} {t.downloads}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Free forever
              </span>
            </div>

            <DownloadButton pdfUrl={cp.pdf_url ?? null} imageUrl={cp.image_url ?? null} title={translation.title} />
            <PrintButton imageUrl={cp.image_url ?? ""} title={translation.title} />
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <Link key={tag} href={`/${lang}?q=${encodeURIComponent(tag)}`}
                    className="text-[12px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                  >{tag}</Link>
                ))}
              </div>
            </div>
          )}

          {/* Meta chips */}
          <div className="flex flex-col gap-1.5">
            {cp.difficulty && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium">{t.difficulty}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md capitalize ${difficultyBadge}`}>{cp.difficulty}</span>
              </div>
            )}
            {cp.age_group && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium">{t.ageGroup}</span>
                <span className="text-xs font-semibold text-gray-600 capitalize">{cp.age_group}</span>
              </div>
            )}
            {cp.style && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium">{t.style}</span>
                <span className="text-xs font-semibold text-gray-600 capitalize">{cp.style}</span>
              </div>
            )}
          </div>

          {/* Print tips */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
            <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-700 mb-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Print tips
            </p>
            <ul className="flex flex-col gap-1.5 list-none">
              {[t.tip1, 'Select "Fit to page" in print settings', t.tip3].map(tip => (
                <li key={tip} className="text-[12.5px] text-gray-500 pl-4 relative leading-snug before:content-['·'] before:absolute before:left-1 before:text-gray-300 before:font-black">{tip}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Prev / Next navigation */}
      {(prevPage || nextPage) && (
        <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-gray-100">
          {prevPage ? (
            <Link
              href={`/${lang}/${categorySlug}/${topicSlug}/${prevPage.slug}`}
              className="group flex items-center gap-2 text-[13px] font-semibold text-gray-500 hover:text-violet-600 transition-colors max-w-[45%]"
            >
              <svg className="shrink-0 group-hover:-translate-x-[2px] transition-transform" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              <span className="line-clamp-1">{prevPage.title}</span>
            </Link>
          ) : <span />}
          {nextPage && (
            <Link
              href={`/${lang}/${categorySlug}/${topicSlug}/${nextPage.slug}`}
              className="group flex items-center gap-2 text-[13px] font-semibold text-gray-500 hover:text-violet-600 transition-colors ml-auto max-w-[45%]"
            >
              <span className="line-clamp-1 text-right">{nextPage.title}</span>
              <svg className="shrink-0 group-hover:translate-x-[2px] transition-transform" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          )}
        </div>
      )}

      {/* SEO description */}
      {translation.html_content && (
        <section className="max-w-[760px] mt-8">
          <div
            className="prose prose-gray max-w-none prose-headings:font-extrabold prose-headings:text-gray-900 prose-h2:text-xl prose-p:text-[15.5px] prose-p:text-gray-700 prose-p:leading-[1.75] prose-a:text-violet-500 prose-strong:text-gray-800"
            dangerouslySetInnerHTML={{ __html: translation.html_content }}
          />
        </section>
      )}

      {/* Related Coloring Pages */}
      {relatedPages.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-violet-500 mb-1.5">You might also like</p>
              <h2 className="text-[20px] sm:text-[22px] font-extrabold text-gray-900 tracking-tight">
                More {titleCase(topicSlug)} coloring pages
              </h2>
            </div>
            <Link href={`/${lang}/${categorySlug}/${topicSlug}`} className="text-[13.5px] font-bold text-violet-500 hover:text-violet-700 whitespace-nowrap">
              See all {titleCase(topicSlug)} →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {relatedPages.map((page) => {
              const badge = page.difficulty ? (DIFFICULTY_BADGE[page.difficulty.toLowerCase()] ?? null) : null;
              const thumb = page.image_thumb_url ?? page.image_url;
              return (
                <Link
                  key={page.page_slug}
                  href={`/${lang}/${page.category_slug}/${page.topic_slug}/${page.page_slug}`}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-violet-200 hover:shadow-[0_4px_20px_rgba(109,40,217,.08)] hover:-translate-y-0.5 transition-all"
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
                  <div className="px-3 py-2.5"><p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">{page.title}</p></div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Similar topics */}
      {similarTopics.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-violet-500 mb-1.5">More to explore</p>
              <h2 className="text-[20px] sm:text-[22px] font-extrabold text-gray-900 tracking-tight">
                More {titleCase(categorySlug)} coloring topics
              </h2>
            </div>
            <Link href={`/${lang}/${categorySlug}`} className="text-[13.5px] font-bold text-violet-500 hover:text-violet-700 whitespace-nowrap">
              All {titleCase(categorySlug)} →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {similarTopics.map(topic => (
              <Link
                key={topic.topic_id}
                href={`/${lang}/${categorySlug}/${topic.topic_slug}`}
                className="group flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-3.5 py-3 hover:border-violet-200 hover:shadow-[0_4px_16px_rgba(109,40,217,.08)] hover:-translate-y-0.5 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-gray-800 group-hover:text-violet-600 transition-colors capitalize leading-snug line-clamp-2">
                    {topic.name ?? titleCase(topic.topic_slug!)} coloring pages
                  </p>
                </div>
                <svg className="shrink-0 text-gray-300 group-hover:text-violet-400 group-hover:translate-x-[3px] transition-all" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Explore more (other categories) */}
      {randomPages.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-violet-500 mb-1.5">Explore more</p>
              <h2 className="text-[20px] sm:text-[22px] font-extrabold text-gray-900 tracking-tight">
                More free printable coloring pages
              </h2>
            </div>
            <Link href={`/${lang}`} className="text-[13.5px] font-bold text-violet-500 hover:text-violet-700 whitespace-nowrap">
              Browse all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {randomPages.map((page) => {
              const badge = page.difficulty ? (DIFFICULTY_BADGE[page.difficulty.toLowerCase()] ?? null) : null;
              const thumb = page.image_thumb_url ?? page.image_url;
              return (
                <Link
                  key={page.page_slug}
                  href={`/${lang}/${page.category_slug}/${page.topic_slug}/${page.page_slug}`}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-violet-200 hover:shadow-[0_4px_20px_rgba(109,40,217,.08)] hover:-translate-y-0.5 transition-all"
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
                  <div className="px-3 py-2.5"><p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">{page.title}</p></div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "ImageObject",
                "@id": `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}/${pageSlug}#image`,
                "url": cp.image_url ?? "",
                "contentUrl": cp.image_url ?? "",
                "name": translation.title,
                "description": `Free printable ${translation.title.toLowerCase()} coloring page. Download as PDF instantly.`,
                "encodingFormat": "image/webp",
                "license": "https://creativecommons.org/licenses/by/4.0/",
                "acquireLicensePage": `${BASE_URL}/${lang}/terms`,
                "creditText": "colorversum",
                "creator": { "@type": "Organization", "name": "colorversum", "url": BASE_URL },
                "isPartOf": { "@type": "WebPage", "url": `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}/${pageSlug}` },
              },
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/${lang}` },
                  { "@type": "ListItem", "position": 2, "name": titleCase(categorySlug), "item": `${BASE_URL}/${lang}/${categorySlug}` },
                  { "@type": "ListItem", "position": 3, "name": titleCase(topicSlug), "item": `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}` },
                  { "@type": "ListItem", "position": 4, "name": translation.title },
                ],
              },
            ],
          }),
        }}
      />
    </div>
  );
}
