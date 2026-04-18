// app/[lang]/browse/page.tsx
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import BrowseSidebar from "@/app/components/BrowseSidebar";

export const revalidate = 0; // always fresh — browse is interactive


export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
  return {
    title: "Browse Free Coloring Pages — Search 1,000+ Printables | colorversum",
    description:
      "Search and filter 1,000+ free printable coloring pages by category, difficulty, and style. Instant PDF download, no sign-up required.",
    alternates: {
      canonical: `${BASE_URL}/${lang}/browse`,
    },
  };
}

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    q?: string; category?: string; difficulty?: string;
    sort?: string; featured?: string;
  }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;

  // ── Initial pages from landing_page_cards (slugs pre-joined) ──
  let query = supabase
    .from("landing_page_cards")
    .select("coloring_page_id, page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug, views")
    .eq("language", lang)
    .limit(24);

  if (sp.q)          query = query.ilike("title", `%${sp.q}%`);
  if (sp.category)   query = query.eq("category_slug", sp.category);
  if (sp.difficulty) query = query.eq("difficulty", sp.difficulty);
  if (sp.featured)   query = (query as any).eq("is_featured", true);

  query = sp.sort === "popular"
    ? query.order("views", { ascending: false })
    : query.order("image_generated_at", { ascending: false });

  // ── Categories in current language ───────────────────────────
  const [pagesRes, catRes, countRes] = await Promise.all([
    query,
    supabase
      .from("category_translations")
      .select("category_id, name, slug")
      .eq("language", lang)
      .not("slug", "is", null)
      .limit(24),
    supabase
      .from("landing_page_cards")
      .select("coloring_page_id", { count: "exact", head: true })
      .eq("language", lang),
  ]);

  type LandingCard = {
    coloring_page_id: string; page_slug: string; title: string;
    image_thumb_url: string | null; image_url: string | null;
    difficulty: string | null; topic_slug: string; category_slug: string; views: number;
  };

  const initialPages = (pagesRes.data ?? []) as LandingCard[];
  const categories   = catRes.data ?? [];
  const totalCount   = countRes.count ?? 0;

  return (
    <>
      <Header lang={lang} />
      <BrowseSidebar
        lang={lang}
        initialPages={initialPages}
        categories={categories}
        totalCount={totalCount}
        topOffset={64}
        initialQuery={sp.q ?? ""}
        initialCategory={sp.category ?? ""}
        initialDifficulty={sp.difficulty ?? ""}
        initialSort={sp.sort ?? ""}
      />
      <Footer lang={lang} />
    </>
  );
}
