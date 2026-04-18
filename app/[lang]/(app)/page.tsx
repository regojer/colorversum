import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CardGrid from "@/app/components/CardGrid";
import { landingHreflang } from "@/lib/hreflang";

export const revalidate = 3600;

const CAT_EMOJI: Record<string, string> = {
  "animal-coloring-pages": "🦁", "fairy-tales": "🐉", "space-science": "🚀",
  "holiday-coloring": "🎄", "nature-coloring": "🌿", "food-drinks": "🍕",
  "fantasy-coloring": "🐉", "seasonal-coloring": "🍂", "characters": "🎭",
  "emotions-mindfulness": "💛", "education": "📚", "jobs-professions": "👷",
  "pattern-coloring": "🔷", "vehicles": "🚗", "sports": "⚽",
};
const ce = (s: string) => CAT_EMOJI[s] ?? "🎨";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";

type Card = {
  coloring_page_id: string; page_slug: string; title: string;
  image_thumb_url: string | null; image_url: string | null;
  difficulty: string | null; topic_slug: string; category_slug: string; views: number;
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: "Free Printable Coloring Pages for Kids & Adults | colorversum",
    description: "Browse 1,000+ free printable coloring pages. Animals, dinosaurs, fantasy, holidays & more. Instant PDF download — no sign-up required.",
    alternates: {
      ...landingHreflang().alternates,
      canonical: `${BASE_URL}/${lang}`,
    },
    openGraph: {
      title: "Free Coloring Pages for Kids & Adults | colorversum",
      description: "1,000+ free printable coloring sheets. Print instantly.",
      type: "website",
      url: `${BASE_URL}/${lang}`,
    },
  };
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; sort?: string; difficulty?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;

  const hasFilters = !!(sp.q || sp.sort || sp.difficulty);

  // Build filtered query
  let query = supabase
    .from("landing_page_cards")
    .select("coloring_page_id, page_slug, title, image_thumb_url, image_url, difficulty, topic_slug, category_slug, views")
    .eq("language", lang)
    .not("image_url", "is", null)
    .limit(24);

  if (sp.q)          query = query.ilike("title", `%${sp.q}%`);
  if (sp.difficulty) query = query.eq("difficulty", sp.difficulty);
  query = sp.sort === "popular"
    ? query.order("views", { ascending: false })
    : query.order("image_generated_at", { ascending: false });

  const [pagesRes, popularRes, catRes, countRes] = await Promise.all([
    query,
    // Popular strip (always fresh for bento)
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

  const pages       = (pagesRes.data ?? []) as Card[];
  const popular     = (popularRes.data ?? []) as Card[];
  const categories  = (catRes.data ?? []).filter(c => c.slug !== "null");
  const totalCount  = countRes.count ?? 0;
  const heroThumbs  = pages.filter(p => p.image_thumb_url ?? p.image_url).slice(0, 4);

  const gridKey = `${sp.q ?? ""}-${sp.sort ?? ""}-${sp.difficulty ?? ""}`;

  return (
    <div>
      {/* ── BENTO HERO — hidden when filters active ─────────────── */}
      {!hasFilters && (
        <div className="px-4 sm:px-6 xl:px-8 pt-5 pb-3 space-y-3">

          {/* Row 1: Hero + Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Hero bento */}
            <div className="md:col-span-2 rounded-2xl overflow-hidden relative min-h-[190px]"
                 style={{ background: "linear-gradient(135deg, #1e1154 0%, #4C1D95 45%, #7C3AED 80%, #c084fc 100%)" }}>
              <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/[0.04] pointer-events-none" />
              <div className="absolute bottom-4 left-1/2 w-32 h-32 rounded-full bg-white/[0.04] pointer-events-none" />

              {/* Floating thumbnails */}
              <div className="absolute right-0 top-0 bottom-0 hidden md:flex items-center gap-2 pr-5 pointer-events-none">
                {heroThumbs.slice(0, 3).map((card, i) => {
                  const thumb = card.image_thumb_url ?? card.image_url;
                  const tilts = ["rotate-[-4deg] translate-y-1", "rotate-[2deg] -translate-y-2", "rotate-[-2deg] translate-y-3"];
                  return (
                    <div key={card.coloring_page_id}
                      className={`w-[72px] h-[72px] xl:w-20 xl:h-20 bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,.25)] flex items-center justify-center overflow-hidden shrink-0 ${tilts[i]}`}>
                      {thumb && <img src={thumb} alt="" className="w-[80%] h-[80%] object-contain" loading="lazy" />}
                    </div>
                  );
                })}
              </div>

              <div className="relative z-10 p-6 sm:p-7 flex flex-col justify-between gap-5 min-h-[190px]">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold text-white mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    New pages added daily
                  </div>
                  <h1 className="text-white font-black leading-[1.1] tracking-tight max-w-[300px]"
                      style={{ fontSize: "clamp(20px, 2.8vw, 28px)" }}>
                    Free Printable Coloring Pages<br />
                    <span className="text-violet-200 font-extrabold">for kids &amp; adults</span>
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/${lang}?sort=new`}
                    className="inline-flex items-center gap-1.5 bg-white text-violet-700 font-bold text-[13px] px-4 py-2.5 rounded-xl shadow-md hover:-translate-y-px transition-all">
                    ✨ Just added
                  </Link>
                  <Link href={`/${lang}?sort=popular`}
                    className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-white/25 transition-all">
                    🔥 Trending
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats bento */}
            <div className="rounded-2xl bg-white border border-gray-200 p-4 grid grid-cols-2 gap-2.5">
              {([
                { Icon: () => (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
                    </svg>
                  ),
                  stat: totalCount >= 1000 ? "1,000+" : `${totalCount}`, label: "Free pages", accent: "text-violet-500 bg-violet-50" },
                { Icon: () => (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                    </svg>
                  ),
                  stat: "Free", label: "Always & forever", accent: "text-emerald-500 bg-emerald-50" },
                { Icon: () => (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <polyline points="6 9 6 2 18 2 18 9"/>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                      <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                  ),
                  stat: "PDF", label: "Print-ready", accent: "text-blue-500 bg-blue-50" },
                { Icon: () => (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  ),
                  stat: "7", label: "Languages", accent: "text-amber-500 bg-amber-50" },
              ] as { Icon: () => React.JSX.Element; stat: string; label: string; accent: string }[]).map(item => (
                <div key={item.label} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.accent}`}>
                    <item.Icon />
                  </div>
                  <div>
                    <div className="text-[17px] font-black text-gray-900 leading-none">{item.stat}</div>
                    <div className="text-[11px] font-semibold text-gray-400 mt-0.5 leading-tight">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Trending strip */}
          {popular.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[.12em] text-violet-500">Trending now</span>
                  <span className="text-[11px] text-gray-400 font-medium ml-2">Most downloaded</span>
                </div>
                <Link href={`/${lang}?sort=popular`} className="text-[12px] font-bold text-violet-600 hover:text-violet-800 transition-colors">
                  See all →
                </Link>
              </div>
              <div className="flex gap-3 px-5 py-4 overflow-x-auto scrollbar-hide">
                {popular.map((card, i) => {
                  const thumb = card.image_thumb_url ?? card.image_url;
                  const href  = `/${lang}/${card.category_slug}/${card.topic_slug}/${card.page_slug}`;
                  return (
                    <Link key={card.coloring_page_id} href={href}
                      className="group flex flex-col shrink-0 w-[110px] sm:w-[124px] overflow-hidden rounded-2xl border border-gray-100 bg-[#FAFAFA]
                                 hover:border-violet-200 hover:shadow-[0_6px_20px_rgba(109,40,217,.12)] hover:-translate-y-0.5 transition-all duration-200">
                      <div className="aspect-square flex items-center justify-center overflow-hidden relative">
                        {i < 3 && (
                          <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center z-10">
                            {i + 1}
                          </span>
                        )}
                        {thumb
                          ? <img src={thumb} alt={card.title}
                              className="w-[78%] h-[78%] object-contain group-hover:scale-[1.07] transition-transform duration-300"
                              loading="lazy" />
                          : <span className="text-4xl opacity-20">🎨</span>
                        }
                      </div>
                      <div className="px-2.5 pb-3 pt-1">
                        <p className="text-[11px] font-bold text-gray-700 line-clamp-2 leading-snug">{card.title}</p>
                        {card.views > 0 && <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{card.views.toLocaleString()} ↓</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 3: Category chips */}
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black uppercase tracking-[.12em] text-gray-400">Browse by category</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Link key={cat.slug} href={`/${lang}/${cat.slug}`}
                  className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold
                             text-[12.5px] px-3.5 py-2 rounded-full transition-all duration-150
                             hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:-translate-y-px">
                  <span className="text-[15px] leading-none">{ce(cat.slug)}</span>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── Cards section header when filtering ─────────────────── */}
      {hasFilters && (
        <div className="px-4 sm:px-6 xl:px-8 pt-4 pb-2">
          <p className="text-[12px] font-black uppercase tracking-[.1em] text-violet-500">
            {sp.q ? `Results for "${sp.q}"` : "Filtered results"}
          </p>
        </div>
      )}

      {/* ── Card Grid ────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 xl:px-8 pb-10 pt-2">
        <CardGrid
          key={gridKey}
          initialPages={pages}
          totalCount={totalCount}
          lang={lang}
          browseParams={{ query: sp.q, sort: sp.sort, difficulty: sp.difficulty }}
        />
      </div>

      {/* ── SEO Text ─────────────────────────────────────────────── */}
      {!hasFilters && (
        <div className="px-4 sm:px-6 xl:px-8 pb-8">
          <div className="rounded-2xl bg-white border border-gray-200 px-6 sm:px-10 py-8">
            <h2 className="text-[20px] font-black text-gray-900 tracking-tight mb-4">
              Free Printable Coloring Pages for Kids &amp; Adults
            </h2>
            <div className="text-[14.5px] leading-[1.85] text-gray-500 space-y-3 max-w-[760px]">
              <p>
                Colorversum is your free destination for 1,000+ printable coloring pages, available instantly with no sign-up required.
                Whether you&rsquo;re looking for simple designs for toddlers, relaxing mandalas for adults, or exciting fantasy scenes for
                older kids — you&rsquo;ll find it here. Every page downloads as a high-quality PDF, optimized for home printing on A4 or Letter paper.
              </p>
              <p>
                Our collection spans animals, dinosaurs, fairy tales, space, holidays, food, vehicles, nature, sports and many more categories.
                Each sheet is graded by difficulty — <strong className="text-gray-700 font-semibold">Easy</strong> for young children,{" "}
                <strong className="text-gray-700 font-semibold">Medium</strong> for school-age kids, and{" "}
                <strong className="text-gray-700 font-semibold">Hard</strong> for adults who want detailed artwork.
                New pages are added every day.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-[11px] font-black uppercase tracking-[.1em] text-gray-400 mb-3">Popular categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 10).map(cat => (
                  <Link key={cat.slug} href={`/${lang}/${cat.slug}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200
                               rounded-full px-3.5 py-1.5 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all">
                    {ce(cat.slug)} {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
