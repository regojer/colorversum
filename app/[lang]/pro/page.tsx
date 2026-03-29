// app/[lang]/pro/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { getUI } from "@/lib/i18n";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
  return {
    title: "colorversum Pro — Unlimited Coloring Pages",
    description:
      "Unlimited PDF downloads, AI coloring generator, and high-resolution files — for €2.99/month. Cancel anytime.",
    alternates: { canonical: `${BASE_URL}/${lang}/pro` },
    openGraph: {
      title: "colorversum Pro",
      description: "Unlimited downloads + AI generator for €2.99/month.",
      url: `${BASE_URL}/${lang}/pro`,
      type: "website",
    },
  };
}

// ── Checkmark icon ─────────────────────────────────────────────────
function Check({ className = "text-blue-500" }: { className?: string }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      className={`shrink-0 ${className}`}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── X icon for "not included" ──────────────────────────────────────
function Dash() {
  return (
    <span className="text-gray-300 font-bold text-[15px]">—</span>
  );
}

export default async function ProPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = getUI(lang);

  const included = [
    t.proIncluded1,
    t.proIncluded2,
    t.proIncluded3,
    t.proIncluded4,
    t.proIncluded5,
    t.proIncluded6,
  ];

  const compareRows: { feature: string; free: string | null; pro: string }[] = [
    { feature: t.proFeatureDownloads,   free: t.proFreeDownloads,   pro: t.proProDownloads   },
    { feature: t.proFeatureAi,          free: t.proFreeAi,          pro: t.proProAi          },
    { feature: t.proFeatureResolution,  free: t.proFreeResolution,  pro: t.proProResolution  },
    { feature: t.proFeatureWatermark,   free: t.proFreeWatermark,   pro: t.proProWatermark   },
    { feature: t.proFeatureEarlyAccess, free: null,                 pro: t.proProEarlyAccess },
    { feature: t.proFeatureSupport,     free: null,                 pro: t.proProSupport     },
  ];

  const faqs: { q: string; a: string }[] = [
    { q: t.proFaq1Q, a: t.proFaq1A },
    { q: t.proFaq2Q, a: t.proFaq2A },
    { q: t.proFaq3Q, a: t.proFaq3A },
    { q: t.proFaq4Q, a: t.proFaq4A },
    { q: t.proFaq5Q, a: t.proFaq5A },
  ];

  return (
    <>
      <Header lang={lang} />

      <main className="overflow-x-hidden" style={{ paddingTop: 64 }}>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-4">
              ⭐ {t.proEyebrow}
            </span>
            <h1 className="text-[clamp(36px,5vw,64px)] font-black text-gray-900 tracking-[-0.03em] leading-none mb-5">
              {t.proTitle}
            </h1>
            <p className="text-[17px] sm:text-[19px] text-gray-500 leading-relaxed max-w-[520px] mx-auto">
              {t.proSubtitle}
            </p>
          </div>
        </div>

        <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-14 sm:py-20">

          {/* ── PRICING CARD + INCLUDED ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16 sm:mb-20">

            {/* Pricing card */}
            <div className="rounded-[24px] border-2 border-blue-500 bg-white p-7 sm:p-9 flex flex-col shadow-[0_8px_40px_rgba(29,78,216,.12)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white text-[18px]">
                  ⭐
                </div>
                <div>
                  <p className="text-[13px] font-bold text-blue-500 uppercase tracking-[.08em]">
                    {t.proProLabel}
                  </p>
                  <p className="text-[15px] font-black text-gray-900">colorversum</p>
                </div>
              </div>

              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-[56px] font-black text-gray-900 leading-none tracking-[-0.04em]">
                  €2.99
                </span>
                <span className="text-[16px] font-semibold text-gray-400 mb-2">
                  {t.proMonthly}
                </span>
              </div>
              <p className="text-[13px] text-gray-400 mb-8">{t.proBilled}</p>

              <Link
                href={`/${lang}/checkout`}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-[15px] px-6 py-4 rounded-[14px] transition-all hover:-translate-y-0.5 shadow-[0_4px_16px_rgba(29,78,216,.3)] mb-4"
              >
                {t.proCtaButton}
              </Link>
              <p className="text-[12.5px] text-gray-400 text-center mb-8">
                🔒 {t.proCtaNote}
              </p>

              <div className="border-t border-gray-100 pt-6 flex items-center gap-3">
                <svg width="28" height="18" viewBox="0 0 28 18" fill="none" className="shrink-0 opacity-30">
                  <rect width="28" height="18" rx="3" fill="#1a1a1a"/>
                  <circle cx="10" cy="9" r="5" fill="#eb001b" fillOpacity=".9"/>
                  <circle cx="18" cy="9" r="5" fill="#f79e1b" fillOpacity=".9"/>
                  <path d="M14 5.2a5 5 0 0 1 0 7.6A5 5 0 0 1 14 5.2z" fill="#ff5f00" fillOpacity=".9"/>
                </svg>
                <span className="text-[12px] text-gray-400 font-medium">Stripe · Visa · Mastercard · Amex</span>
              </div>
            </div>

            {/* What's included */}
            <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-7 sm:p-9 flex flex-col">
              <h2 className="text-[18px] font-black text-gray-900 tracking-tight mb-6">
                {t.proIncludedTitle}
              </h2>
              <ul className="flex flex-col gap-4 flex-1">
                {included.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 shrink-0">
                      <Check className="text-blue-500" />
                    </div>
                    <span className="text-[14.5px] text-gray-700 font-medium leading-snug">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Guarantee pill */}
              <div className="mt-8 bg-white border border-gray-200 rounded-[14px] p-4 flex items-start gap-3">
                <span className="text-[22px] shrink-0">🛡️</span>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 mb-0.5">{t.proGuaranteeTitle}</p>
                  <p className="text-[12.5px] text-gray-500 leading-snug">{t.proGuaranteeText}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── COMPARISON TABLE ───────────────────────────────────── */}
          <section className="mb-16 sm:mb-20">
            <h2 className="text-[clamp(22px,2.8vw,30px)] font-black text-gray-900 tracking-tight mb-8 text-center">
              {t.proCompareHeading}
            </h2>
            <div className="rounded-[20px] border border-gray-200 overflow-hidden bg-white">
              {/* Header row */}
              <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
                <div className="px-5 sm:px-7 py-4" />
                <div className="px-4 py-4 text-center border-l border-gray-200">
                  <span className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400">
                    {t.proFreeLabel}
                  </span>
                </div>
                <div className="px-4 py-4 text-center border-l border-gray-200 bg-blue-50">
                  <span className="text-[12px] font-bold uppercase tracking-[.08em] text-blue-600">
                    {t.proProLabel} ⭐
                  </span>
                </div>
              </div>

              {/* Feature rows */}
              {compareRows.map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-3 border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <div className="px-5 sm:px-7 py-4">
                    <span className="text-[13.5px] font-semibold text-gray-700">{row.feature}</span>
                  </div>
                  <div className="px-4 py-4 flex items-center justify-center border-l border-gray-100">
                    {row.free === null
                      ? <Dash />
                      : <span className="text-[13px] font-medium text-gray-500 text-center">{row.free}</span>
                    }
                  </div>
                  <div className="px-4 py-4 flex items-center justify-center border-l border-gray-100 bg-blue-50/60">
                    {row.pro === "✓"
                      ? <Check className="text-blue-500" />
                      : <span className="text-[13px] font-bold text-blue-600 text-center">{row.pro}</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FAQ ────────────────────────────────────────────────── */}
          <section className="mb-16 sm:mb-20">
            <h2 className="text-[clamp(22px,2.8vw,30px)] font-black text-gray-900 tracking-tight mb-8 text-center">
              {t.proFaqTitle}
            </h2>
            <div className="max-w-[720px] mx-auto flex flex-col gap-3">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-[16px] px-6 sm:px-7 py-5"
                >
                  <p className="text-[15px] font-bold text-gray-900 mb-2">{faq.q}</p>
                  <p className="text-[14px] text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── BOTTOM CTA ─────────────────────────────────────────── */}
          <section>
            <div
              className="rounded-[24px] sm:rounded-[32px] px-6 sm:px-14 py-12 sm:py-16 text-center relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#1D4ED8 100%)" }}
            >
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
              <div className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full bg-white/5" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-1.5 mb-6 text-[12.5px] font-bold text-white/90">
                  ⭐ {t.proProLabel}
                </div>
                <h2 className="text-[clamp(24px,3.5vw,40px)] font-black text-white tracking-tight leading-tight mb-4">
                  {t.proTitle}
                </h2>
                <p className="text-white/70 text-[16px] max-w-md mx-auto mb-8 leading-relaxed">
                  {t.proSubtitle}
                </p>
                <Link
                  href={`/${lang}/checkout`}
                  className="inline-flex items-center gap-2 bg-white text-blue-700 font-extrabold text-[15px] px-10 py-4 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,.25)] hover:-translate-y-0.5 transition-all"
                >
                  {t.proCtaButton}
                </Link>
                <p className="text-white/50 text-[12.5px] mt-4">🔒 {t.proCtaNote}</p>
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer lang={lang} />
    </>
  );
}
