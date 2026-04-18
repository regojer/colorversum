// app/alternative/page.tsx
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import AlternativeLanding from "./AlternativeLanding";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Free Printable Coloring Pages — Browse & Download | colorversum",
  description:
    "Browse 1,000+ free printable coloring pages for kids and adults. Filter by category, difficulty, and style. Instant PDF download — no sign-up required.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com"}/alternative`,
  },
};

export default async function AlternativePage() {
  const lang = "en";

  const [newestRes, popularRes, catRes, countRes] = await Promise.all([
    supabase
      .from("landing_page_cards")
      .select("coloring_page_id, page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug, views")
      .eq("language", lang)
      .not("image_url", "is", null)
      .order("image_generated_at", { ascending: false })
      .limit(24),

    supabase
      .from("landing_page_cards")
      .select("coloring_page_id, page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug, views")
      .eq("language", lang)
      .not("image_url", "is", null)
      .order("views", { ascending: false })
      .limit(8),

    supabase
      .from("category_translations")
      .select("category_id, name, slug")
      .eq("language", lang)
      .not("slug", "is", null)
      .limit(24),

    supabase
      .from("landing_page_cards")
      .select("coloring_page_id", { count: "exact", head: true })
      .eq("language", lang)
      .not("image_url", "is", null),
  ]);

  type LandingCard = {
    coloring_page_id: string; page_slug: string; title: string;
    image_thumb_url: string | null; image_url: string | null;
    difficulty: string | null; topic_slug: string; category_slug: string; views: number;
  };

  return (
    <AlternativeLanding
      newestPages={(newestRes.data ?? []) as LandingCard[]}
      popularPages={(popularRes.data ?? []) as LandingCard[]}
      categories={catRes.data ?? []}
      totalCount={countRes.count ?? 0}
    />
  );
}
