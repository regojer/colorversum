// app/sitemap.ts
// Split sitemap using generateSitemaps — Next.js auto-generates a sitemap index at /sitemap.xml
// GSC will show separate coverage per type: static / categories / topics / pages
//
// URLs served at:
//   /sitemap/static.xml     — 7 homepages
//   /sitemap/categories.xml — category pages (all languages)
//   /sitemap/topics.xml     — topic pages (all languages)
//   /sitemap/pages.xml      — detail pages (all languages)

import { supabase } from "@/lib/supabase";
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
const LANGS = ["en", "de", "es", "fr", "it", "nl", "pt"] as const;

export const revalidate = 86400; // rebuild daily

export async function generateSitemaps() {
  return [
    { id: "static" },
    { id: "categories" },
    { id: "topics" },
    { id: "pages" },
  ];
}

// Build alternates.languages map including x-default → English URL
function buildAlternates(langUrls: Partial<Record<string, string>>) {
  const languages: Record<string, string> = {};
  for (const [lang, url] of Object.entries(langUrls)) {
    if (url) languages[lang] = url;
  }
  if (langUrls["en"]) languages["x-default"] = langUrls["en"];
  return { languages };
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;

  // ── STATIC — one entry per language with full hreflang alternates ──
  if (id === "static") {
    const langUrls: Partial<Record<string, string>> = {};
    for (const lang of LANGS) langUrls[lang] = `${BASE_URL}/${lang}`;
    const alternates = buildAlternates(langUrls);
    return LANGS.map(lang => ({
      url: `${BASE_URL}/${lang}`,
      changeFrequency: "daily" as const,
      priority: lang === "en" ? 1.0 : 0.9,
      lastModified: new Date(),
      alternates,
    }));
  }

  // ── CATEGORIES ─────────────────────────────────────────────────────
  if (id === "categories") {
    const { data: catTrans } = await supabase
      .from("category_translations")
      .select("category_id, language, slug")
      .not("slug", "is", null);

    // Group by category_id → { lang: slug }
    const byId: Record<string, Record<string, string>> = {};
    for (const row of catTrans ?? []) {
      if (!byId[row.category_id]) byId[row.category_id] = {};
      byId[row.category_id][row.language] = row.slug;
    }

    const entries: MetadataRoute.Sitemap = [];
    for (const langSlugs of Object.values(byId)) {
      const langUrls: Partial<Record<string, string>> = {};
      for (const lang of LANGS) {
        if (langSlugs[lang]) langUrls[lang] = `${BASE_URL}/${lang}/${langSlugs[lang]}`;
      }
      const alternates = buildAlternates(langUrls);
      for (const lang of LANGS) {
        const url = langUrls[lang];
        if (!url) continue;
        entries.push({ url, changeFrequency: "weekly", priority: 0.8, alternates });
      }
    }
    return entries;
  }

  // ── TOPICS ─────────────────────────────────────────────────────────
  // Only include topics that have at least one published page in that language
  // (topic_cards can have translations for topics with zero ready pages → 404)
  if (id === "topics") {
    // Get all topic+language combos that have actual pages in landing_page_cards
    const { data: topicPageRows } = await supabase
      .from("landing_page_cards")
      .select("topic_id, language, topic_slug, category_slug")
      .not("topic_slug", "is", null)
      .not("category_slug", "is", null)
      .not("image_url", "is", null);

    // Dedupe: one entry per topic_id+language, grouped by topic_id
    const byId: Record<string, Record<string, { topic_slug: string; category_slug: string }>> = {};
    for (const row of topicPageRows ?? []) {
      if (!LANGS.includes(row.language as typeof LANGS[number])) continue;
      if (!byId[row.topic_id]) byId[row.topic_id] = {};
      // Only store first occurrence — topic_slug/category_slug are the same for all pages in a topic
      if (!byId[row.topic_id][row.language]) {
        byId[row.topic_id][row.language] = { topic_slug: row.topic_slug, category_slug: row.category_slug };
      }
    }

    const entries: MetadataRoute.Sitemap = [];
    for (const langData of Object.values(byId)) {
      const langUrls: Partial<Record<string, string>> = {};
      for (const lang of LANGS) {
        const d = langData[lang];
        if (d) langUrls[lang] = `${BASE_URL}/${lang}/${d.category_slug}/${d.topic_slug}`;
      }
      const alternates = buildAlternates(langUrls);
      for (const lang of LANGS) {
        const url = langUrls[lang];
        if (!url) continue;
        entries.push({ url, changeFrequency: "weekly", priority: 0.7, alternates });
      }
    }
    return entries;
  }

  // ── PAGES ───────────────────────────────────────────────────────────
  // Batch-fetch all landing_page_cards and group by coloring_page_id
  const PAGE_BATCH = 1000;
  let offset = 0;
  const byId: Record<string, Record<string, { category_slug: string; topic_slug: string; page_slug: string }>> = {};

  while (true) {
    const { data } = await supabase
      .from("landing_page_cards")
      .select("coloring_page_id, language, category_slug, topic_slug, page_slug")
      .not("page_slug", "is", null)
      .not("image_url", "is", null)
      .range(offset, offset + PAGE_BATCH - 1);

    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!LANGS.includes(row.language as typeof LANGS[number])) continue;
      if (!byId[row.coloring_page_id]) byId[row.coloring_page_id] = {};
      byId[row.coloring_page_id][row.language] = {
        category_slug: row.category_slug,
        topic_slug: row.topic_slug,
        page_slug: row.page_slug,
      };
    }

    offset += PAGE_BATCH;
    if (data.length < PAGE_BATCH) break;
  }

  const entries: MetadataRoute.Sitemap = [];
  for (const langData of Object.values(byId)) {
    const langUrls: Partial<Record<string, string>> = {};
    for (const lang of LANGS) {
      const d = langData[lang];
      if (d) langUrls[lang] = `${BASE_URL}/${lang}/${d.category_slug}/${d.topic_slug}/${d.page_slug}`;
    }
    const alternates = buildAlternates(langUrls);
    for (const lang of LANGS) {
      const url = langUrls[lang];
      if (!url) continue;
      entries.push({ url, changeFrequency: "monthly", priority: 0.6, alternates });
    }
  }
  return entries;
}
