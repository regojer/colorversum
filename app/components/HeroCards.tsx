"use client";

import Link from "next/link";

const DIFFICULTY_BADGE: Record<string, string> = {
  easy:   "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard:   "bg-blue-100 text-blue-800",
};

type HeroCard = {
  id: string;
  slug: string;
  title: string;
  image_thumb_url: string | null;
  image_url: string | null;
  difficulty: string | null;
  href: string;
};

const CARD_CONFIG = [
  { size: "w-[100px] h-[100px] xs:w-[120px] xs:h-[120px] sm:w-[160px] sm:h-[160px] md:w-[180px] md:h-[180px]", animation: "float1", delay: "0s",    hide: false },
  { size: "w-[115px] h-[115px] xs:w-[135px] xs:h-[135px] sm:w-[175px] sm:h-[175px] md:w-[200px] md:h-[200px]", animation: "float2", delay: "0.5s",  hide: false },
  { size: "w-[125px] h-[125px] xs:w-[150px] xs:h-[150px] sm:w-[195px] sm:h-[195px] md:w-[220px] md:h-[220px]", animation: "float3", delay: "0.25s", hide: false },
  { size: "w-[115px] h-[115px] xs:w-[135px] xs:h-[135px] sm:w-[175px] sm:h-[175px] md:w-[200px] md:h-[200px]", animation: "float1", delay: "0.75s", hide: true  },
  { size: "w-[100px] h-[100px] xs:w-[120px] xs:h-[120px] sm:w-[160px] sm:h-[160px] md:w-[180px] md:h-[180px]", animation: "float2", delay: "1s",    hide: true  },
];

// Base rotations that the float animation is applied on top of
const BASE_ROTATIONS = [
  "rotate(-4deg)",
  "rotate(-1.5deg)",
  "rotate(0.5deg)",
  "rotate(2deg)",
  "rotate(4.5deg)",
];

export default function HeroCards({ cards }: { cards: HeroCard[] }) {
  if (cards.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: var(--base-rot) translateY(10px); }
          50%       { transform: var(--base-rot) translateY(-4px); }
        }
        @keyframes float2 {
          0%, 100% { transform: var(--base-rot) translateY(4px); }
          50%       { transform: var(--base-rot) translateY(-10px); }
        }
        @keyframes float3 {
          0%, 100% { transform: var(--base-rot) translateY(0px); }
          50%       { transform: var(--base-rot) translateY(-8px); }
        }
        .hero-card { animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .hero-card:hover { animation-play-state: paused; }
      `}</style>

      <div className="flex items-end justify-center gap-2 sm:gap-4 mt-8 sm:mt-14 pb-2 w-full overflow-hidden">
        {cards.map((card, i) => {
          const config = CARD_CONFIG[i] ?? CARD_CONFIG[0];
          const badge  = card.difficulty ? (DIFFICULTY_BADGE[card.difficulty.toLowerCase()] ?? null) : null;
          const thumb  = card.image_thumb_url ?? card.image_url;

          return (
            <Link
              key={card.id}
              href={card.href}
              className={`hero-card bg-white rounded-[18px] border border-gray-200/70 shadow-[0_8px_32px_rgba(50,80,110,.14)] flex items-center justify-center relative shrink-0 overflow-hidden group hover:shadow-[0_20px_52px_rgba(50,80,110,.22)] transition-shadow ${config.size} ${config.hide ? "hidden sm:flex" : ""}`}
              style={{
                "--base-rot": BASE_ROTATIONS[i],
                animationName: config.animation,
                animationDuration: `${6 + i * 0.8}s`,
                animationDelay: config.delay,
              } as React.CSSProperties}
            >
              {thumb ? (
                <img src={thumb} alt={card.title} className="w-4/5 h-4/5 object-contain" />
              ) : (
                <div className="w-4/5 h-4/5 bg-gray-100 rounded-lg" />
              )}
              {badge && card.difficulty && (
                <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${badge}`}>
                  {card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1)}
                </span>
              )}
              <div className="absolute inset-0 bg-blue-500/[0.08] flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-blue-500 text-white text-[11px] font-extrabold tracking-wider px-3 py-1.5 rounded-full">View</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
