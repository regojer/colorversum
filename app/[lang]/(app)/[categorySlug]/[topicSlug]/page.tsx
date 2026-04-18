import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUI } from "@/lib/i18n";
import { categoryEmoji as emoji } from "@/lib/emoji";
import { topicHreflang, fetchCategorySlugsByLang, fetchTopicSlugsByLang } from "@/lib/hreflang";
import CardGrid from "@/app/components/CardGrid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
function titleCase(s: string) { return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string; categorySlug: string; topicSlug: string }> }): Promise<Metadata> {
  const { lang, categorySlug, topicSlug } = await params;
  const { data: topic } = await supabase.from("topic_translations")
    .select("topic_id, name, seo_title, seo_description")
    .eq("slug", topicSlug).eq("language", lang).single();
  const rawName    = topic?.name ?? titleCase(topicSlug);
  const displayName = rawName.replace(/\s*coloring pages?\s*$/i, "").trim();
  const title       = topic?.seo_title ?? `${displayName} Coloring Pages — Free Printable | colorversum`;
  const description = topic?.seo_description ?? `Download free printable ${displayName.toLowerCase()} coloring pages. High-quality PDF — no sign-up required.`;
  let alternates: Record<string, unknown> = {};
  if (topic?.topic_id) {
    const { data: baseTopic } = await supabase.from("topics").select("category_id").eq("id", topic.topic_id).single();
    if (baseTopic?.category_id) {
      const [catSlugs, topicSlugs] = await Promise.all([
        fetchCategorySlugsByLang(supabase, baseTopic.category_id),
        fetchTopicSlugsByLang(supabase, topic.topic_id),
      ]);
      alternates = topicHreflang(catSlugs, topicSlugs).alternates ?? {};
    }
  }
  const canonical = `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}`;
  return { title, description, alternates: { ...(alternates as Record<string, unknown>), canonical }, openGraph: { title, description, type: "website", url: canonical } };
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; categorySlug: string; topicSlug: string }>;
  searchParams: Promise<{ sort?: string; difficulty?: string }>;
}) {
  const { lang, categorySlug, topicSlug } = await params;
  const sp = await searchParams;
  if (!topicSlug || topicSlug === "null") notFound();

  const t = getUI(lang);
  const { data: topic } = await supabase.from("topic_translations")
    .select("topic_id, name, slug").eq("slug", topicSlug).eq("language", lang).single();
  if (!topic) notFound();

  const rawName    = titleCase(topic.name ?? topicSlug);
  const displayName = rawName.replace(/\s*coloring pages?\s*$/i, "").trim();

  const { data: baseTopic } = await supabase.from("topics").select("category_id").eq("id", topic.topic_id).single();
  const categoryId = baseTopic?.category_id ?? null;

  const [categoryRes, countRes, relatedRes] = await Promise.all([
    supabase.from("category_translations").select("name, slug").eq("slug", categorySlug).eq("language", lang).single(),
    supabase.from("coloring_pages").select("id", { count: "exact", head: true })
      .eq("topic_id", topic.topic_id).eq("is_published", true).eq("is_ready", true),
    categoryId
      ? supabase.from("topics").select("id").eq("category_id", categoryId).neq("id", topic.topic_id).limit(12)
      : Promise.resolve({ data: [] }),
  ]);

  const category   = categoryRes.data;
  const totalCount = countRes.count ?? 0;

  // Related topics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relatedIds = ((relatedRes as any).data ?? []).map((t: { id: string }) => t.id) as string[];
  const { data: relatedRaw } = relatedIds.length
    ? await supabase.from("topic_translations").select("topic_id, slug, name")
        .eq("language", lang).in("topic_id", relatedIds)
    : { data: [] };
  const related = ((relatedRaw ?? []) as Array<{ topic_id: string; slug: string | null; name: string | null }>)
    .filter(t => t.slug && t.slug.trim() !== "") as Array<{ topic_id: string; slug: string; name: string | null }>;

  // Grid: use landing_page_cards for pre-joined slugs
  let gridQuery = supabase
    .from("landing_page_cards")
    .select("coloring_page_id, page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug, views")
    .eq("language", lang).eq("topic_slug", topicSlug)
    .not("image_url", "is", null).limit(24);

  if (sp.difficulty) gridQuery = gridQuery.eq("difficulty", sp.difficulty);
  gridQuery = sp.sort === "popular"
    ? gridQuery.order("views", { ascending: false })
    : gridQuery.order("image_generated_at", { ascending: false });

  const [pagesRes, gridCountRes] = await Promise.all([
    gridQuery,
    supabase.from("landing_page_cards")
      .select("coloring_page_id", { count: "exact", head: true })
      .eq("language", lang).eq("topic_slug", topicSlug)
      .not("image_url", "is", null),
  ]);

  type Card = {
    coloring_page_id: string; page_slug: string; title: string;
    image_thumb_url: string | null; image_url: string | null;
    difficulty: string | null; topic_slug: string; category_slug: string; views: number;
  };

  const pages    = (pagesRes.data ?? []) as Card[];
  const gridTotal = gridCountRes.count ?? 0;

  if (pages.length === 0 && !sp.difficulty && !sp.sort) notFound();

  const gridKey = `${topicSlug}-${sp.sort ?? ""}-${sp.difficulty ?? ""}`;

  return (
    <div>
      {/* ── Breadcrumb + Header ──────────────────────────────────── */}
      <div className="px-4 sm:px-6 xl:px-8 pt-5 pb-4">
        <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400 mb-4 flex-wrap">
          <Link href={`/${lang}`} className="hover:text-violet-500 transition-colors">Home</Link>
          <span className="text-gray-300">›</span>
          {category && (
            <>
              <Link href={`/${lang}/${categorySlug}`} className="hover:text-violet-500 transition-colors flex items-center gap-1">
                <span>{emoji(categorySlug)}</span>{category.name}
              </Link>
              <span className="text-gray-300">›</span>
            </>
          )}
          <span className="text-gray-700 capitalize">{displayName}</span>
        </nav>

        {/* Hero bar */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 sm:px-7 py-5">
          <p className="text-[11px] font-black uppercase tracking-[.12em] text-violet-500 mb-1.5">Free Printable</p>
          <h1 className="font-black text-gray-900 tracking-tight leading-tight mb-1.5"
              style={{ fontSize: "clamp(20px, 2.8vw, 28px)" }}>
            {displayName} {t.coloringPages ?? "Coloring Pages"}
          </h1>
          <p className="text-[13.5px] text-gray-500">{totalCount.toLocaleString()} pages · Free PDF download</p>
        </div>
      </div>

      {/* ── Card Grid ────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 xl:px-8 pb-8">
        <CardGrid
          key={gridKey}
          initialPages={pages}
          totalCount={gridTotal}
          lang={lang}
          browseParams={{ topic: topicSlug, sort: sp.sort, difficulty: sp.difficulty }}
        />
      </div>

      {/* ── Related Topics ───────────────────────────────────────── */}
      {related.length > 0 && (
        <div className="px-4 sm:px-6 xl:px-8 pb-6">
          <div className="rounded-2xl bg-white border border-gray-200 p-5">
            <p className="text-[11px] font-black uppercase tracking-[.12em] text-gray-400 mb-3">
              More {category?.name ?? ""} topics
            </p>
            <div className="flex flex-wrap gap-2">
              {related.slice(0, 12).map(rt => (
                <Link key={rt.slug} href={`/${lang}/${categorySlug}/${rt.slug}`}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all capitalize">
                  {rt.name ?? titleCase(rt.slug)}
                </Link>
              ))}
              {category && (
                <Link href={`/${lang}/${categorySlug}`}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-3.5 py-1.5 hover:bg-violet-100 transition-all">
                  All {category.name} →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SEO Block ────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 xl:px-8 pb-8">
        <div className="rounded-2xl bg-white border border-gray-200 px-6 sm:px-10 py-7">
          <h2 className="text-[18px] font-black text-gray-900 tracking-tight mb-3">
            Free Printable {displayName} Coloring Pages
          </h2>
          <div className="text-[14px] leading-[1.85] text-gray-500 space-y-2.5 max-w-[720px]">
            <p>
              Our <strong className="text-gray-700 font-semibold">{displayName.toLowerCase()} coloring pages</strong>{" "}
              are completely free to download and print — no account needed, no watermarks.
              Each page is a high-resolution PDF with clean bold outlines perfect for crayons, markers, or colored pencils.
            </p>
            <p>
              Whether you need easy {displayName.toLowerCase()} coloring pages for young kids or more detailed designs for adults,
              you&apos;ll find a variety of difficulty levels above. New sheets are added regularly.
            </p>
          </div>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "BreadcrumbList", "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/${lang}` },
            { "@type": "ListItem", "position": 2, "name": category?.name ?? titleCase(categorySlug), "item": `${BASE_URL}/${lang}/${categorySlug}` },
            { "@type": "ListItem", "position": 3, "name": `${displayName} Coloring Pages` },
          ]},
          { "@type": "CollectionPage", "@id": `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}`,
            "name": `${displayName} Coloring Pages`,
            "url": `${BASE_URL}/${lang}/${categorySlug}/${topicSlug}`,
            "numberOfItems": totalCount,
          },
        ],
      })}} />
    </div>
  );
}
