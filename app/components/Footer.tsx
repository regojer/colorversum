// app/components/Footer.tsx
// Server component — receives lang prop, all links prefixed, all text translated.

import Link from "next/link";
import { getUI } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { categoryEmoji as emoji } from "@/lib/emoji";

export default async function Footer({ lang = "en" }: { lang?: string }) {
  const t = getUI(lang);

  const BROWSE_LINKS = [
    { label: t.footerAllPages, href: `/${lang}` },
    { label: t.footerNewPages, href: `/${lang}?sort=new` },
    { label: t.footerPopular,  href: `/${lang}?sort=popular` },
    { label: t.easy,           href: `/${lang}?difficulty=easy` },
    { label: t.categories,     href: `/${lang}/categories` },
  ];

  const LEGAL_LINKS = [
    { label: t.footerPrivacy, href: `/${lang}/privacy` },
    { label: t.footerTerms,   href: `/${lang}/terms` },
    { label: t.footerCookies, href: `/${lang}/cookies` },
    { label: t.footerImprint, href: `/${lang}/imprint` },
  ];

  const BOTTOM_LINKS = [
    { label: t.footerPrivacyShort, href: `/${lang}/privacy` },
    { label: t.footerTermsShort,   href: `/${lang}/terms` },
    { label: t.footerImprint,      href: `/${lang}/imprint` },
  ];

  // ── Fetch dynamic link data in parallel ───────────────────────
  const [catTransRes, countRes, topicsRes, trendingRes] = await Promise.all([
    supabase
      .from("category_translations")
      .select("category_id, name, slug")
      .eq("language", lang)
      .not("slug", "is", null),

    supabase
      .from("categories_with_counts")
      .select("id, computed_topic_count")
      .gt("computed_topic_count", 0),

    // Topics sourced from landing_page_cards — guarantees topic has real pages in this language
    supabase
      .from("landing_page_cards")
      .select("topic_id, topic_slug, category_slug")
      .eq("language", lang)
      .not("topic_slug", "is", null)
      .not("category_slug", "is", null)
      .not("image_url", "is", null)
      .order("views", { ascending: false })
      .limit(200),

    supabase
      .from("landing_page_cards")
      .select("page_slug, title, topic_slug, category_slug")
      .eq("language", lang)
      .not("topic_slug", "is", null)
      .not("category_slug", "is", null)
      .not("image_url", "is", null)
      .order("views", { ascending: false })
      .range(30, 49),
  ]);

  // Build topCategories: join catTrans with counts, sort by count desc, top 7
  type CatTrans = { category_id: string; name: string; slug: string };
  type CountRow = { id: string; computed_topic_count: number };
  const catTransData = (catTransRes.data ?? []) as CatTrans[];
  const countData    = (countRes.data    ?? []) as CountRow[];
  const countMap     = new Map(countData.map(r => [r.id, r.computed_topic_count]));

  const topCategories = catTransData
    .filter(cat => cat.slug && countMap.has(cat.category_id))
    .sort((a, b) => (countMap.get(b.category_id) ?? 0) - (countMap.get(a.category_id) ?? 0))
    .slice(0, 7);

  // Dedupe landing_page_cards rows by topic_id — take first occurrence per topic
  type TopicRow = { topic_id: string; topic_slug: string; name: string | null; category_slug: string | null };
  const seenTopicIds = new Set<string>();
  const topTopics: TopicRow[] = [];
  for (const row of (topicsRes.data ?? []) as TopicRow[]) {
    if (!row.topic_id || seenTopicIds.has(row.topic_id)) continue;
    seenTopicIds.add(row.topic_id);
    topTopics.push(row);
    if (topTopics.length >= 9) break;
  }

  type TrendingRow = { page_slug: string; title: string; topic_slug: string | null; category_slug: string | null };
  const trendingPages = ((trendingRes.data ?? []) as TrendingRow[]).slice(0, 10);

  return (
    <footer className="border-t border-gray-200 bg-white mt-10">

      {/* ── Dynamic internal links section ────────────────────────── */}
      <div className="border-b border-gray-100">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Top Categories */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3">
              Top Categories
            </h4>
            <ul className="flex flex-col gap-0.5 list-none">
              {topCategories.map(cat => (
                <li key={cat.category_id}>
                  <Link
                    href={`/${lang}/${cat.slug}`}
                    className="text-[13px] font-medium text-gray-500 hover:text-gray-900 py-0.5 block transition-colors leading-snug"
                  >
                    {emoji(cat.slug)} {cat.name} coloring pages
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/${lang}/categories`}
                  className="text-[13px] font-medium text-gray-500 hover:text-gray-900 py-0.5 block transition-colors leading-snug"
                >
                  All categories →
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Topics */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3">
              Popular Topics
            </h4>
            <ul className="flex flex-col gap-0.5 list-none">
              {topTopics.map(topic => (
                <li key={topic.topic_id}>
                  <Link
                    href={`/${lang}/${topic.category_slug}/${topic.topic_slug}`}
                    className="text-[13px] font-medium text-gray-500 hover:text-gray-900 py-0.5 block transition-colors leading-snug"
                  >
                    {topic.name ?? topic.topic_slug.replace(/-/g, " ")} coloring pages
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trending Now */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3">
              Trending Now
            </h4>
            <ul className="flex flex-col gap-0.5 list-none">
              {trendingPages.map(page => (
                <li key={page.page_slug}>
                  <Link
                    href={`/${lang}/${page.category_slug}/${page.topic_slug}/${page.page_slug}`}
                    className="text-[13px] font-medium text-gray-500 hover:text-gray-900 py-0.5 block transition-colors leading-snug"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/${lang}?sort=popular`}
                  className="text-[13px] font-medium text-gray-500 hover:text-gray-900 py-0.5 block transition-colors leading-snug"
                >
                  See all trending →
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-10 pb-11 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {/* Brand column */}
        <div className="flex flex-col gap-3">
          <Link
            href={`/${lang}`}
            className="text-[17px] font-black tracking-[-0.04em] text-gray-900 hover:opacity-70 transition-opacity w-fit"
          >
            colorversum
          </Link>
          <p className="text-[13.5px] text-gray-500 leading-[1.7] max-w-[280px]">
            {t.footerTagline}
          </p>
        </div>

        {/* Browse column */}
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3.5">
            {t.footerBrowse}
          </h4>
          <ul className="flex flex-col gap-0.5 list-none">
            {BROWSE_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[13.5px] font-medium text-gray-500 hover:text-gray-900 py-1 block transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal column */}
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3.5">
            {t.footerCompany}
          </h4>
          <ul className="flex flex-col gap-0.5 list-none">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[13.5px] font-medium text-gray-500 hover:text-gray-900 py-1 block transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────── */}
      <div className="border-t border-gray-200">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-[12.5px] text-gray-400">
            © {new Date().getFullYear()} colorversum — {t.footerCopyright}
          </span>

          <nav className="flex items-center">
            {BOTTOM_LINKS.map((l, i, arr) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[12.5px] text-gray-400 hover:text-gray-600 transition-colors px-2.5 py-0.5 ${
                  i < arr.length - 1 ? "border-r border-gray-200" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

    </footer>
  );
}
