// lib/hreflang.ts
// Generates hreflang alternate URLs for Next.js generateMetadata

const SUPPORTED_LANGS = ["en", "de", "es", "fr", "it", "nl", "pt"] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";

/** Landing page — /[lang] */
export function landingHreflang() {
  const languages: Record<string, string> = {};
  for (const l of SUPPORTED_LANGS) languages[l] = `${BASE_URL}/${l}`;
  languages["x-default"] = `${BASE_URL}/en`;
  return { alternates: { languages } };
}

/** Category page — slugs differ per language, pass the full map */
export function categoryHreflang(
  slugsByLang: Partial<Record<SupportedLang, string>>
) {
  const languages: Record<string, string> = {};
  for (const l of SUPPORTED_LANGS) {
    const slug = slugsByLang[l];
    if (slug) languages[l] = `${BASE_URL}/${l}/${slug}`;
  }
  if (slugsByLang["en"]) languages["x-default"] = `${BASE_URL}/en/${slugsByLang["en"]}`;
  return { alternates: { languages } };
}

/** Topic page — /[lang]/[catSlug]/[topicSlug] */
export function topicHreflang(
  catSlugsByLang: Partial<Record<SupportedLang, string>>,
  topicSlugsByLang: Partial<Record<SupportedLang, string>>
) {
  const languages: Record<string, string> = {};
  for (const l of SUPPORTED_LANGS) {
    const cat = catSlugsByLang[l];
    const topic = topicSlugsByLang[l];
    if (cat && topic) languages[l] = `${BASE_URL}/${l}/${cat}/${topic}`;
  }
  if (catSlugsByLang["en"] && topicSlugsByLang["en"]) {
    languages["x-default"] = `${BASE_URL}/en/${catSlugsByLang["en"]}/${topicSlugsByLang["en"]}`;
  }
  return { alternates: { languages } };
}

/** Page detail — /[lang]/[catSlug]/[topicSlug]/[pageSlug] */
export function pageHreflang(
  catSlugsByLang: Partial<Record<SupportedLang, string>>,
  topicSlugsByLang: Partial<Record<SupportedLang, string>>,
  pageSlugsByLang: Partial<Record<SupportedLang, string>>
) {
  const languages: Record<string, string> = {};
  for (const l of SUPPORTED_LANGS) {
    const cat = catSlugsByLang[l];
    const topic = topicSlugsByLang[l];
    const page = pageSlugsByLang[l];
    if (cat && topic && page) languages[l] = `${BASE_URL}/${l}/${cat}/${topic}/${page}`;
  }
  if (catSlugsByLang["en"] && topicSlugsByLang["en"] && pageSlugsByLang["en"]) {
    languages["x-default"] =
      `${BASE_URL}/en/${catSlugsByLang["en"]}/${topicSlugsByLang["en"]}/${pageSlugsByLang["en"]}`;
  }
  return { alternates: { languages } };
}

/** Helper: fetch all lang slugs for a given category_id from category_translations */
export async function fetchCategorySlugsByLang(
  supabase: { from: (t: string) => any },
  categoryId: string
): Promise<Partial<Record<SupportedLang, string>>> {
  const { data } = await supabase
    .from("category_translations")
    .select("language, slug")
    .eq("category_id", categoryId);
  const map: Partial<Record<SupportedLang, string>> = {};
  for (const row of data ?? []) map[row.language as SupportedLang] = row.slug;
  return map;
}

/** Helper: fetch all lang slugs for a given topic_id from topic_translations */
export async function fetchTopicSlugsByLang(
  supabase: { from: (t: string) => any },
  topicId: string
): Promise<Partial<Record<SupportedLang, string>>> {
  const { data } = await supabase
    .from("topic_translations")
    .select("language, slug")
    .eq("topic_id", topicId);
  const map: Partial<Record<SupportedLang, string>> = {};
  for (const row of data ?? []) map[row.language as SupportedLang] = row.slug;
  return map;
}

/** Helper: fetch all lang slugs for a given coloring_page_id */
export async function fetchPageSlugsByLang(
  supabase: { from: (t: string) => any },
  coloringPageId: string
): Promise<Partial<Record<SupportedLang, string>>> {
  const { data } = await supabase
    .from("coloring_page_translations")
    .select("language, slug")
    .eq("coloring_page_id", coloringPageId);
  const map: Partial<Record<SupportedLang, string>> = {};
  for (const row of data ?? []) map[row.language as SupportedLang] = row.slug;
  return map;
}

export const SUPPORTED_LANGS_LIST = SUPPORTED_LANGS;
