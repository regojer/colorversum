import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUI } from "@/lib/i18n";
import { categoryEmoji as emoji } from "@/lib/emoji";
import { categoryHreflang, fetchCategorySlugsByLang } from "@/lib/hreflang";
import CardGrid from "@/app/components/CardGrid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
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
    .eq("slug", categorySlug).eq("language", lang).single();
  if (!cat) return {};
  const title       = cat.seo_title ?? `${cat.name} Coloring Pages — Free Printable | colorversum`;
  const description = cat.seo_description ?? `Free printable ${cat.name.toLowerCase()} coloring pages. Instant PDF download, no sign-up required.`;
  const catSlugs    = await fetchCategorySlugsByLang(supabase, cat.category_id);
  const hreflang    = categoryHreflang(catSlugs);
  const canonical   = `${BASE_URL}/${lang}/${categorySlug}`;
  return {
    title, description,
    alternates: { ...(hreflang.alternates as Record<string, unknown>), canonical },
    openGraph: { title, description, type: "website", url: canonical },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; categorySlug: string }>;
  searchParams: Promise<{ q?: string; sort?: string; difficulty?: string }>;
}) {
  const { lang, categorySlug } = await params;
  const sp = await searchParams;
  const t  = getUI(lang);

  const { data: category } = await supabase
    .from("category_translations")
    .select("category_id, name, slug, description")
    .eq("slug", categorySlug).eq("language", lang).single();
  if (!category) notFound();

  // Topic IDs
  const { data: baseTopics } = await supabase
    .from("topics").select("id").eq("category_id", category.category_id);
  const allTopicIds = (baseTopics ?? []).map(t => t.id).filter(Boolean);

  const { data: topicIdsWithPages } = allTopicIds.length
    ? await supabase.from("coloring_pages").select("topic_id")
        .in("topic_id", allTopicIds).eq("is_published", true).eq("is_ready", true)
    : { data: [] };

  const validTopicIds = [...new Set((topicIdsWithPages ?? []).map(p => p.topic_id).filter(Boolean))];

  const { data: topicsRaw } = validTopicIds.length
    ? await supabase.from("topic_translations")
        .select("topic_id, name, slug, topics!inner(category_id)")
        .eq("language", lang).eq("topics.category_id", category.category_id)
        .in("topic_id", validTopicIds).not("slug", "is", null)
    : { data: [] };

  const topics = (topicsRaw ?? []).filter(t => !!t.slug && t.slug.trim() !== "" && t.slug !== "null");
  if (!topics || topics.length === 0) notFound();

  // Preview images
  const { data: previewRes } = validTopicIds.length
    ? await supabase.from("coloring_pages")
        .select("image_thumb_url, image_url, topic_id")
        .in("topic_id", validTopicIds)
        .eq("is_published", true).eq("is_ready", true)
        .order("views", { ascending: false }).limit(300)
    : { data: [] };

  const topicPreviews: Record<string, string[]> = {};
  for (const img of previewRes ?? []) {
    if (!img.topic_id) continue;
    const thumb = img.image_thumb_url ?? img.image_url;
    if (!thumb) continue;
    if (!topicPreviews[img.topic_id]) topicPreviews[img.topic_id] = [];
    if (topicPreviews[img.topic_id].length < 4) topicPreviews[img.topic_id].push(thumb);
  }

  const pageCountByTopicId: Record<string, number> = {};
  const { data: pageCounts } = validTopicIds.length
    ? await supabase.from("coloring_pages").select("topic_id")
        .in("topic_id", validTopicIds).eq("is_published", true).eq("is_ready", true)
    : { data: [] };
  for (const row of pageCounts ?? []) {
    if (!row.topic_id) continue;
    pageCountByTopicId[row.topic_id] = (pageCountByTopicId[row.topic_id] ?? 0) + 1;
  }

  // Cards for grid (uses landing_page_cards for correct slugs)
  let gridQuery = supabase
    .from("landing_page_cards")
    .select("coloring_page_id, page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug, views")
    .eq("language", lang).eq("category_slug", categorySlug)
    .not("image_url", "is", null).limit(24);

  if (sp.q)          gridQuery = gridQuery.ilike("title", `%${sp.q}%`);
  if (sp.difficulty) gridQuery = gridQuery.eq("difficulty", sp.difficulty);
  gridQuery = sp.sort === "popular"
    ? gridQuery.order("views", { ascending: false })
    : gridQuery.order("image_generated_at", { ascending: false });

  const [pagesRes, countRes] = await Promise.all([
    gridQuery,
    supabase.from("landing_page_cards")
      .select("coloring_page_id", { count: "exact", head: true })
      .eq("language", lang).eq("category_slug", categorySlug)
      .not("image_url", "is", null),
  ]);

  type Card = {
    coloring_page_id: string; page_slug: string; title: string;
    image_thumb_url: string | null; image_url: string | null;
    difficulty: string | null; topic_slug: string; category_slug: string; views: number;
  };

  const pages      = (pagesRes.data ?? []) as Card[];
  const totalCount = countRes.count ?? 0;
  const gridKey    = `${categorySlug}-${sp.q ?? ""}-${sp.sort ?? ""}-${sp.difficulty ?? ""}`;

  return (
    <div>
      {/* ── Category Header ─────────────────────────────────────── */}
      <div className="px-4 sm:px-6 xl:px-8 pt-5 pb-4">
        <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400 mb-4 flex-wrap">
          <Link href={`/${lang}`} className="hover:text-violet-500 transition-colors">Home</Link>
          <span className="text-gray-300">›</span>
          <span className="text-gray-700">{category.name}</span>
        </nav>

        <div className="rounded-2xl overflow-hidden"
             style={{ background: "linear-gradient(135deg, #1e1154 0%, #4C1D95 50%, #7C3AED 100%)" }}>
          <div className="px-6 sm:px-8 py-7 sm:py-8">
            <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold text-white mb-3">
              <span className="text-xl">{emoji(categorySlug)}</span>
              {topics.length} topics
            </div>
            <h1 className="text-white font-black tracking-tight leading-tight mb-2"
                style={{ fontSize: "clamp(22px, 3vw, 32px)" }}>
              {category.name} Coloring Pages
            </h1>
            {category.description && (
              <p className="text-white/70 text-[14px] leading-relaxed max-w-[480px]">{category.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Topics Grid ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 xl:px-8 pb-6">
        <p className="text-[11px] font-black uppercase tracking-[.12em] text-gray-400 mb-3">Browse by topic</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {topics.map((topic, i) => {
            const previews = topicPreviews[topic.topic_id] ?? [];
            return (
              <Link key={topic.topic_id} href={`/${lang}/${categorySlug}/${topic.slug}`}
                className="group rounded-2xl border bg-white overflow-hidden flex flex-col hover:border-violet-200 hover:shadow-[0_6px_28px_rgba(109,40,217,.1)] hover:-translate-y-[3px] transition-all border-gray-200">
                <div className="relative border-b border-gray-100 overflow-hidden" style={{ aspectRatio: "4/3" }}>
                  <div className="absolute inset-0 grid grid-cols-2 gap-px bg-gray-200">
                    {[0,1,2,3].map(j => (
                      <div key={j} className="bg-[#FAFAFA] group-hover:bg-[#F5F7FF] flex items-center justify-center transition-colors overflow-hidden">
                        {previews[j]
                          ? <img src={previews[j]} alt="" aria-hidden="true" className="w-[88%] h-[88%] object-contain" loading={i < 2 && j < 2 ? "eager" : "lazy"} />
                          : <span className="text-2xl opacity-15 select-none">{emoji(categorySlug)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3.5 flex flex-col" style={{ minHeight: 88 }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base leading-none shrink-0">{emoji(categorySlug)}</span>
                    <span className="text-[13.5px] font-black text-gray-900 tracking-tight capitalize leading-tight">{topic.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[11.5px] font-semibold text-gray-400">
                      {(pageCountByTopicId[topic.topic_id] ?? previews.length)}+ pages
                    </span>
                    <span className="text-[12px] font-bold text-violet-500 group-hover:translate-x-[3px] transition-transform">Browse →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 sm:mx-6 xl:mx-8 border-t border-gray-200 mb-5" />

      {/* ── All pages grid ──────────────────────────────────────── */}
      <div className="px-4 sm:px-6 xl:px-8 pb-2">
        <p className="text-[11px] font-black uppercase tracking-[.12em] text-violet-500 mb-3">
          All {category.name} coloring pages
        </p>
      </div>
      <div className="px-4 sm:px-6 xl:px-8 pb-10">
        <CardGrid
          key={gridKey}
          initialPages={pages}
          totalCount={totalCount}
          lang={lang}
          browseParams={{ category: categorySlug, query: sp.q, sort: sp.sort, difficulty: sp.difficulty }}
        />
      </div>

      {/* ── SEO Block ───────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 xl:px-8 pb-8">
        <div className="rounded-2xl bg-white border border-gray-200 px-6 sm:px-10 py-8">
          <h2 className="text-[19px] font-black text-gray-900 tracking-tight mb-4">
            Free Printable {category.name} Coloring Pages
          </h2>
          <div className="text-[14px] leading-[1.85] text-gray-500 space-y-3 max-w-[720px]">
            <p>
              colorversum has <strong className="text-gray-700 font-semibold">free {category.name.toLowerCase()} coloring pages</strong>{" "}
              across {topics.length} topics — all available as instant PDF downloads, ready to print at home.
              Whether you&apos;re looking for easy designs for young kids or detailed scenes for adults, new pages are added regularly.
            </p>
            <p>
              Every <strong className="text-gray-700 font-semibold">printable {category.name.toLowerCase()} coloring sheet</strong>{" "}
              is completely free — no account required, no watermarks.
            </p>
          </div>
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-[11px] font-black uppercase tracking-[.1em] text-gray-400 mb-3">Topics in this category</p>
            <div className="flex flex-wrap gap-2">
              {topics.map(tp => (
                <Link key={tp.topic_id} href={`/${lang}/${categorySlug}/${tp.slug}`}
                  className="inline-flex items-center text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all capitalize">
                  {tp.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "BreadcrumbList", "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/${lang}` },
            { "@type": "ListItem", "position": 2, "name": `${category.name} Coloring Pages` },
          ]},
          { "@type": "CollectionPage", "@id": `${BASE_URL}/${lang}/${categorySlug}`,
            "name": `${category.name} Coloring Pages`,
            "description": category.description ?? `Free printable ${category.name.toLowerCase()} coloring pages.`,
            "url": `${BASE_URL}/${lang}/${categorySlug}`,
            "numberOfItems": topics.length,
          },
        ],
      })}} />
    </div>
  );
}
