// app/components/Header.tsx
import { supabase } from "@/lib/supabase";
import HeaderClient from "./HeaderClient";


export type NavCategory = {
  name: string;
  slug: string;        // translated slug for this lang
  topic_count: number;
};

export default async function Header({ lang = "en" }: { lang?: string }) {
  // Fetch translated category names + slugs for the current language
  const { data: catTrans } = await supabase
    .from("category_translations")
    .select("name, slug, category_id")
    .eq("language", lang)
    .not("slug", "is", null)
    .limit(24);

  // Get topic counts from base table
  const { data: counts } = await supabase
    .from("categories_with_counts")
    .select("id, computed_topic_count")
    .gt("computed_topic_count", 0);

  const countById: Record<string, number> = {};
  for (const row of counts ?? []) countById[row.id] = row.computed_topic_count;

  const categories: NavCategory[] = (catTrans ?? [])
    .map(c => ({
      name:        c.name,
      slug:        c.slug,
      topic_count: countById[c.category_id] ?? 0,
    }))
    .filter(c => c.topic_count > 0)
    .sort((a, b) => b.topic_count - a.topic_count)
    .slice(0, 24);

  return <HeaderClient categories={categories} lang={lang} />;
}
