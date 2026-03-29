// app/sitemap.ts
// Generates a comprehensive multilingual sitemap for Googlebot.
// Includes all category, topic, and page URLs across 7 languages.
// Next.js automatically serves this at /sitemap.xml

import { supabase } from "@/lib/supabase";
import type { MetadataRoute } from "next";


const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
const LANGS = ["en", "de", "es", "fr", "it", "nl", "pt"];

export const revalidate = 86400; // rebuild sitemap daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ── Homepage per language ──────────────────────────────────────
  for (const lang of LANGS) {
    entries.push({
      url: `${BASE_URL}/${lang}`,
      changeFrequency: "daily",
      priority: lang === "en" ? 1.0 : 0.9,
      lastModified: new Date(),
    });
  }

  // ── Category pages ─────────────────────────────────────────────
  // Fetch all category translations grouped by category_id
  const { data: catTrans } = await supabase
    .from("category_translations")
    .select("category_id, language, slug")
    .not("slug", "is", null);

  // Group by category_id
  const catsByID: Record<string, Record<string, string>> = {};
  for (const row of catTrans ?? []) {
    if (!catsByID[row.category_id]) catsByID[row.category_id] = {};
    catsByID[row.category_id][row.language] = row.slug;
  }

  for (const [, langSlugs] of Object.entries(catsByID)) {
    for (const lang of LANGS) {
      const slug = langSlugs[lang];
      if (!slug) continue;
      entries.push({
        url: `${BASE_URL}/${lang}/${slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  // ── Topic pages ────────────────────────────────────────────────
  // Use topic_cards view which already has both category_slug + topic_slug
  const { data: topicCards } = await supabase
    .from("topic_cards")
    .select("language, topic_slug, category_slug")
    .not("topic_slug", "is", null)
    .not("category_slug", "is", null);

  for (const row of topicCards ?? []) {
    if (!LANGS.includes(row.language)) continue;
    entries.push({
      url: `${BASE_URL}/${row.language}/${row.category_slug}/${row.topic_slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // ── Coloring page detail pages ─────────────────────────────────
  // Use landing_page_cards view for fully pre-joined slugs
  // Fetch in batches to avoid memory issues on large datasets
  const PAGE_BATCH = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: pageCards } = await supabase
      .from("landing_page_cards")
      .select("language, category_slug, topic_slug, page_slug")
      .not("page_slug", "is", null)
      .range(offset, offset + PAGE_BATCH - 1);

    if (!pageCards || pageCards.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of pageCards) {
      if (!LANGS.includes(row.language)) continue;
      entries.push({
        url: `${BASE_URL}/${row.language}/${row.category_slug}/${row.topic_slug}/${row.page_slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    offset += PAGE_BATCH;
    if (pageCards.length < PAGE_BATCH) hasMore = false;
  }

  return entries;
}
