"use client";

import { useState } from "react";
import Link from "next/link";

const DIFF_BADGE: Record<string, string> = {
  easy:   "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard:   "bg-blue-100  text-blue-700",
};
const DIFF_LABEL: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

type Card = {
  coloring_page_id: string;
  page_slug: string;
  title: string;
  image_thumb_url: string | null;
  image_url: string | null;
  difficulty: string | null;
  topic_slug: string;
  category_slug: string;
  views: number;
};

interface Props {
  initialPages: Card[];
  totalCount: number;
  lang: string;
  /** Browse API params for load-more */
  browseParams: {
    category?: string;
    topic?: string;
    difficulty?: string;
    sort?: string;
    query?: string;
  };
}

const IcoDownload = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function CardGrid({ initialPages, totalCount, lang, browseParams }: Props) {
  const [pages, setPages]       = useState<Card[]>(initialPages);
  const [total]                 = useState(totalCount);
  const [currentPage, setPage]  = useState(1);
  const [hasMore, setHasMore]   = useState(totalCount > initialPages.length);
  const [loading, setLoading]   = useState(false);
  const [hoveredId, setHovered] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch("/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          page: currentPage + 1,
          query:      browseParams.query      ?? "",
          categories: browseParams.category   ? [browseParams.category]  : [],
          topic:      browseParams.topic      ?? "",
          difficulty: browseParams.difficulty ? [browseParams.difficulty] : [],
          sort:       browseParams.sort       ?? "",
        }),
      });
      const data = await res.json();
      setPages(prev => [...prev, ...(data.pages ?? [])]);
      setHasMore(data.hasMore ?? false);
      setPage(p => p + 1);
    } finally {
      setLoading(false);
    }
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-3xl">🎨</div>
        <p className="text-[17px] font-bold text-gray-700 mb-1.5">No pages found</p>
        <p className="text-[13.5px] text-gray-400">Try different keywords or remove some filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
        {pages.map(page => {
          const diff  = page.difficulty?.toLowerCase();
          const badge = diff ? DIFF_BADGE[diff] : null;
          const label = diff ? DIFF_LABEL[diff] : null;
          const thumb = page.image_thumb_url ?? page.image_url;
          const href  = `/${lang}/${page.category_slug}/${page.topic_slug}/${page.page_slug}`;

          return (
            <Link key={page.coloring_page_id} href={href}
              onMouseEnter={() => setHovered(page.coloring_page_id)}
              onMouseLeave={() => setHovered(null)}
              className="group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden
                         hover:border-violet-200 hover:shadow-[0_8px_32px_rgba(109,40,217,.11)]
                         hover:-translate-y-1 transition-all duration-200"
            >
              <div className="relative aspect-square bg-[#FAFAFA] overflow-hidden">
                {thumb
                  ? <img src={thumb} alt={`${page.title} coloring page`}
                      className="w-full h-full object-contain p-3.5 group-hover:scale-[1.05] transition-transform duration-300"
                      loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">🎨</div>
                }
                {badge && label && (
                  <span className={`absolute top-2 left-2 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md ${badge}`}>
                    {label}
                  </span>
                )}
                {/* Hover overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t from-violet-200/60 via-violet-50/10 to-transparent
                                 flex items-end justify-center pb-3 transition-opacity duration-200
                                 ${hoveredId === page.coloring_page_id ? "opacity-100" : "opacity-0"}`}>
                  <span className="inline-flex items-center gap-1.5 bg-white text-violet-700 font-bold text-[12px]
                                   px-4 py-2 rounded-xl shadow-[0_4px_16px_rgba(109,40,217,.2)] border border-violet-100">
                    <IcoDownload /> Free Download
                  </span>
                </div>
              </div>
              <div className="px-3 pt-2.5 pb-3">
                <p className="text-[12.5px] font-bold text-gray-800 line-clamp-2 leading-snug mb-1">{page.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium truncate capitalize">
                    {page.category_slug.replace(/-coloring-pages$/, "").replace(/-/g, " ")}
                  </span>
                  {page.views > 0 && (
                    <span className="text-[10.5px] text-gray-400 font-semibold shrink-0 flex items-center gap-0.5">
                      <IcoDownload /> {page.views.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {/* Loading skeletons */}
        {loading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-100" />
            <div className="px-3 py-3 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-4/5" />
              <div className="h-2.5 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button onClick={loadMore} disabled={loading}
            className="inline-flex items-center gap-2.5 bg-white border border-gray-200 text-gray-700 font-bold
                       text-[14px] px-8 py-3.5 rounded-2xl hover:border-violet-300 hover:text-violet-700
                       hover:shadow-[0_4px_16px_rgba(109,40,217,.12)] transition-all disabled:opacity-50">
            {loading
              ? <><span className="w-4 h-4 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" /> Loading…</>
              : <>Load more · {(total - pages.length).toLocaleString()} remaining</>
            }
          </button>
        </div>
      )}
    </>
  );
}
