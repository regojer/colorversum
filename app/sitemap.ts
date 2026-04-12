// app/sitemap.ts
// Generates a comprehensive multilingual sitemap with hreflang alternates.
// Each URL entry includes xhtml:link alternates for all language variants so
// Google Search Console can associate language variants of the same page.

import { supabase } from "@/lib/supabase";
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
const LANGS = ["en", "de", "es", "fr", "it", "nl", "pt"] as const;

export const revalidate = 86400; // rebuild sitemap daily

// Build the alternates.languages map from a { [lang]: url } record.
// Includes x-default pointing to the English version.
function buildAlternates(langUrls: Partial<Record<string, string>>) {
  const languages: Record<string, string> = {};
  for (const [lang, url] of Object.entries(langUrls)) {
    if (url) languages[lang] = url;
  }
  if (langUrls["en"]) languages["x-default"] = langUrls["en"];
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ── Homepages ─────────────────────────────────────────────────
  // One entry per language, each referencing all other languages.
  const homeLangUrls: Partial<Record<string, string>> = {};
  for (const lang of LANGS) homeLangUrls[lang] = `${BASE_URL}/${lang}`;

  for (const lang of LANGS) {
    entries.push({
      url: `${BASE_URL}/${lang}`,
      changeFrequency: "daily",
      priority: lang === "en" ? 1.0 : 0.9,
      lastModified: new Date(),
      alternates: buildAlternates(homeLangUrls),
    });
  }

  // ── Category pages ─────────────────────────────────────────────
  // Group by category_id → { lang: slug }, then emit one entry per language
  // with full alternates.
  const { data: catTrans } = await supabase
    .from("category_translations")
    .select("category_id, language, slug")
    .not("slug", "is", null);

  const catsByID: Record<string, Record<string, string>> = {};
  for (const row of catTrans ?? []) {
    if (!catsByID[row.category_id]) catsByID[row.category_id] = {};
    catsByID[row.category_id][row.language] = row.slug;
  }

  for (const langSlugs of Object.values(catsByID)) {
    // Build URL map for this category across all languages
    const langUrls: Partial<Record<string, string>> = {};
    for (const lang of LANGS) {
      if (langSlugs[lang]) langUrls[lang] = `${BASE_URL}/${lang}/${langSlugs[lang]}`;
    }
    const alternates = buildAlternates(langUrls);

    for (const lang of LANGS) {
      const url = langUrls[lang];
      if (!url) continue;
      entries.push({
        url,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates,
      });
    }
  }

  // ── Topic pages ────────────────────────────────────────────────
  // topic_cards already has topic_slug + category_slug per language.
  // Group by topic_id to build alternates.
  const { data: topicCards } = await supabase
    .from("topic_cards")
    .select("topic_id, language, topic_slug, category_slug")
    .not("topic_slug", "is", null)
    .not("category_slug", "is", null);

  // Group by topic_id
  const topicsByID: Record<string, Record<string, { topic_slug: string; category_slug: string }>> = {};
  for (const row of topicCards ?? []) {
    if (!LANGS.includes(row.language as typeof LANGS[number])) continue;
    if (!topicsByID[row.topic_id]) topicsByID[row.topic_id] = {};
    topicsByID[row.topic_id][row.language] = {
      topic_slug: row.topic_slug,
      category_slug: row.category_slug,
    };
  }

  for (const langData of Object.values(topicsByID)) {
    const langUrls: Partial<Record<string, string>> = {};
    for (const lang of LANGS) {
      const d = langData[lang];
      if (d) langUrls[lang] = `${BASE_URL}/${lang}/${d.category_slug}/${d.topic_slug}`;
    }
    const alternates = buildAlternates(langUrls);

    for (const lang of LANGS) {
      const url = langUrls[lang];
      if (!url) continue;
      entries.push({
        url,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates,
      });
    }
  }

  // ── Detail pages ───────────────────────────────────────────────
  // landing_page_cards has page_slug + topic_slug + category_slug per language.
  // We need to group by coloring_page_id to build alternates.
  // Fetch in batches to avoid memory issues.
  const PAGE_BATCH = 1000;
  let offset = 0;

  // Map: coloring_page_id → { lang: { category_slug, topic_slug, page_slug } }
  const pagesByID: Record<string, Record<string, { category_slug: string; topic_slug: string; page_slug: string }>> = {};

  while (true) {
    const { data: pageCards } = await supabase
      .from("landing_page_cards")
      .select("coloring_page_id, language, category_slug, topic_slug, page_slug")
      .not("page_slug", "is", null)
      .range(offset, offset + PAGE_BATCH - 1);

    if (!pageCards || pageCards.length === 0) break;

    for (const row of pageCards) {
      if (!LANGS.includes(row.language as typeof LANGS[number])) continue;
      if (!pagesByID[row.coloring_page_id]) pagesByID[row.coloring_page_id] = {};
      pagesByID[row.coloring_page_id][row.language] = {
        category_slug: row.category_slug,
        topic_slug: row.topic_slug,
        page_slug: row.page_slug,
      };
    }

    offset += PAGE_BATCH;
    if (pageCards.length < PAGE_BATCH) break;
  }

  for (const langData of Object.values(pagesByID)) {
    const langUrls: Partial<Record<string, string>> = {};
    for (const lang of LANGS) {
      const d = langData[lang];
      if (d) langUrls[lang] = `${BASE_URL}/${lang}/${d.category_slug}/${d.topic_slug}/${d.page_slug}`;
    }
    const alternates = buildAlternates(langUrls);

    for (const lang of LANGS) {
      const url = langUrls[lang];
      if (!url) continue;
      entries.push({
        url,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates,
      });
    }
  }

  return entries;
}
