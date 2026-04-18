// app/api/browse/route.ts
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 24;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      lang       = "en",
      page       = 1,
      categories = [],
      topic      = "",
      difficulty = [],
      query      = "",
      sort       = "",
      featured   = false,
    } = body;

    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    // Use landing_page_cards view — returns properly translated slugs for all 4 URL segments
    let q = supabase
      .from("landing_page_cards")
      .select(
        "coloring_page_id, page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug, views",
        { count: "exact" }
      )
      .eq("language", lang)
      .range(from, to);

    if (query)            q = q.ilike("title", `%${query}%`);
    if (categories?.length) q = q.in("category_slug", categories);
    if (topic)            q = q.eq("topic_slug", topic);
    if (difficulty?.length) q = q.in("difficulty", difficulty);
    if (featured)         q = (q as any).eq("is_featured", true);

    q = sort === "popular"
      ? q.order("views", { ascending: false })
      : q.order("image_generated_at", { ascending: false });

    const { data, count, error } = await q;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      pages:   data ?? [],
      total:   count ?? 0,
      page,
      hasMore: (count ?? 0) > to + 1,
    });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
