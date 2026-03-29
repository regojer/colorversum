import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import PrintButton from "@/app/components/PrintButton";
import DownloadButton from "@/app/components/DownloadButton";
import { getUI } from "@/lib/i18n";
import { AdLeaderboard, AdRectangle } from "@/app/components/AdSlot";
import { pageHreflang, fetchCategorySlugsByLang, fetchTopicSlugsByLang, fetchPageSlugsByLang } from "@/lib/hreflang";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; categorySlug: string; topicSlug: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { lang, categorySlug, topicSlug, pageSlug } = await params;
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";

  const { data } = await supabase
    .from("coloring_page_translations")
    .select("title, description, coloring_page_id")
    .eq("slug", pageSlug)
    .eq("language", lang)
    .single();

  if (!data) return {};

  // Parallel: get image + topic/category IDs for hreflang
  const [baseForMeta, basePageForHreflang] = await Promise.all([
    supabase.from("coloring_pages").select("image_url, topic_id, category_slug").eq("id", data.coloring_page_id).single(),
    supabase.from("coloring_pages").select("topic_id").eq("id", data.coloring_page_id).single(),
  ]);

  const title       = `${data.title} — Free Printable PDF | colorversum`;
  const description = (data.description as string | null) ?? `Free printable ${data.title.toLowerCase()} coloring page. Download PDF instantly — no sign-up required.`;
  const imageUrl    = baseForMeta.data?.image_url ?? null;

  // Hreflang — requires knowing slugs in all languages
  let alternates = {};
  const topicId = baseForMeta.data?.topic_id;
  if (topicId) {
    // Get category_id from base topics table
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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
      url: `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}/${pageSlug}`,
    },
    alternates,
  };
}

// ─────────────────────────────────────────────────────────────────
export default async function PageDetail({
  params,
}: {
  params: Promise<{ lang: string; categorySlug: string; topicSlug: string; pageSlug: string }>;
}) {
  const { lang, categorySlug, topicSlug, pageSlug } = await params;
  const t = getUI(lang);

  // ── Step 1: Get translation (no join — avoid fragile !inner) ──────
  const { data: translation } = await supabase
    .from("coloring_page_translations")
    .select("id, slug, title, description, html_content, coloring_page_id")
    .eq("slug", pageSlug)
    .eq("language", lang)
    .single();

  if (!translation) notFound();

  // ── Step 2: Get base page data separately ──────────────────────
  const { data: basePage } = await supabase
    .from("coloring_pages")
    .select("id, image_url, image_thumb_url, pdf_url, difficulty, age_group, style, topic_id, category_slug, views, keyword")
    .eq("id", translation.coloring_page_id)
    .single();

  if (!basePage) notFound();

  type CPFull = {
    id: string; image_url: string | null; image_thumb_url: string | null;
    pdf_url: string | null; difficulty: string | null; age_group: string | null;
    style: string | null; topic_id: string | null; category_slug: string | null;
    views: number | null; keyword: string | null;
  };
  const cp = basePage as CPFull;

  // ── Related pages — use landing_page_cards view (no !inner join) ──
  const { data: relatedTranslations } = cp.topic_id
    ? await supabase
        .from("landing_page_cards")
        .select("page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug")
        .eq("language", lang)
        .eq("topic_id", cp.topic_id)
        .neq("page_slug", pageSlug)
        .order("views", { ascending: false })
        .limit(6)
    : { data: [] };

  const DIFFICULTY_BADGE: Record<string, string> = {
    easy:   "bg-green-100 text-green-800",
    medium: "bg-amber-100 text-amber-800",
    hard:   "bg-blue-100 text-blue-800",
  };
  const difficultyBadge = cp.difficulty
    ? (DIFFICULTY_BADGE[cp.difficulty.toLowerCase()] ?? "bg-gray-100 text-gray-700")
    : "bg-gray-100 text-gray-700";

  const tags: string[] = typeof cp.keyword === "string"
    ? cp.keyword.split(",").map(t => t.trim()).filter(Boolean)
    : [];

  const downloads = cp.views?.toLocaleString() ?? "0";

  return (
    <>
      <Header lang={lang} />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-8 pb-20" style={{ paddingTop: 84 }}>

        {/* Breadcrumb */}
        <nav className="mb-5">
          <ol className="flex flex-wrap items-center gap-1 list-none text-[12.5px] font-semibold text-gray-400">
            <li><Link href={`/${lang}`} className="hover:text-blue-500 transition-colors">Home</Link></li>
            <li className="text-gray-300">›</li>
            <li><Link href={`/${lang}/${categorySlug}`} className="hover:text-blue-500 transition-colors capitalize">{titleCase(categorySlug)}</Link></li>
            <li className="text-gray-300">›</li>
            <li><Link href={`/${lang}/${categorySlug}/${topicSlug}`} className="hover:text-blue-500 transition-colors capitalize">{titleCase(topicSlug)}</Link></li>
            <li className="text-gray-300">›</li>
            <li className="text-gray-700 font-semibold truncate max-w-[160px] sm:max-w-[200px]">{translation.title}</li>
          </ol>
        </nav>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight mb-5">
          {translation.title}
        </h1>

        <div className="w-full h-[50px] sm:h-[90px] mb-6 sm:mb-7 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[10.5px] font-bold uppercase tracking-widest text-gray-400">
          ▤ Advertisement
        </div>

        {/* ── Two-column layout ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 sm:gap-8 items-start">

          {/* Image */}
          <div className="flex flex-col gap-2.5">
            <div className="relative bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
              {cp.image_url ? (
                <img
                  src={cp.image_url}
                  alt={`${translation.title} coloring page printable`}
                  className="w-[92%] h-[92%] object-contain"
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
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[76px]">

            <div className="bg-white border border-gray-200 rounded-[18px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex gap-3.5 flex-wrap text-[13px] font-semibold text-gray-500">
                <span className="flex items-center gap-1.5">
                  <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {downloads} {t.downloads}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  Free forever
                </span>
              </div>

              <DownloadButton pdfUrl={cp.pdf_url ?? null} imageUrl={cp.image_url ?? null} title={translation.title} />
              <PrintButton imageUrl={cp.image_url ?? ""} title={translation.title} />
            </div>

            {/* Ad rectangle */}
            <AdRectangle />

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <Link key={tag} href={`/${lang}/browse?q=${encodeURIComponent(tag)}`}
                      className="text-[12px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
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

        {/* Ad in-content */}
        <AdLeaderboard className="my-8 sm:my-10" />

        {/* SEO description */}
        {translation.html_content && (
          <section className="max-w-[760px]">
            <div
              className="prose prose-gray max-w-none prose-headings:font-extrabold prose-headings:text-gray-900 prose-h2:text-xl prose-p:text-[15.5px] prose-p:text-gray-700 prose-p:leading-[1.75] prose-a:text-blue-500 prose-strong:text-gray-800"
              dangerouslySetInnerHTML={{ __html: translation.html_content }}
            />
          </section>
        )}

        {/* Related pages */}
        <section className="mt-12 sm:mt-14">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-[20px] sm:text-[22px] font-extrabold text-gray-900 tracking-tight">
              More {titleCase(topicSlug)} pages
            </h2>
            <Link href={`/${lang}/${categorySlug}/${topicSlug}`} className="text-[13.5px] font-bold text-blue-500 hover:text-blue-700 whitespace-nowrap">
              View all →
            </Link>
          </div>

          {relatedTranslations && relatedTranslations.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {((relatedTranslations ?? []) as Array<{
                  page_slug: string; title: string;
                  image_thumb_url: string | null; image_url: string | null;
                  difficulty: string | null; topic_slug: string; category_slug: string;
                }>).map((page) => {
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
                          {page.difficulty.charAt(0).toUpperCase() + page.difficulty.slice(1)}
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2.5"><p className="text-[13px] font-bold text-gray-700 line-clamp-2 leading-snug">{page.title}</p></div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-gray-50 aspect-square animate-pulse" />
              ))}
            </div>
          )}
        </section>

      </main>
      <Footer lang={lang} />
    </>
  );
}
