// app/components/Footer.tsx
// Server component — receives lang prop, all links prefixed, all text translated.

import Link from "next/link";
import { getUI } from "@/lib/i18n";

export default function Footer({ lang = "en" }: { lang?: string }) {
  const t = getUI(lang);

  const BROWSE_LINKS = [
    { label: t.footerAllPages, href: `/${lang}/browse` },
    { label: t.footerNewPages, href: `/${lang}/browse?sort=new` },
    { label: t.footerPopular,  href: `/${lang}/browse?sort=popular` },
    { label: t.easy,           href: `/${lang}/browse?difficulty=easy` },
    { label: t.categories,     href: `/${lang}/categories` },
  ];

  const LEGAL_LINKS = [
    { label: t.footerPrivacy, href: `/${lang}/privacy` },
    { label: t.footerTerms,   href: `/${lang}/terms` },
    { label: t.footerCookies, href: `/${lang}/cookies` },
    { label: t.footerImprint, href: `/${lang}/imprint` },
    { label: t.footerContact, href: `/${lang}/contact` },
  ];

  const BOTTOM_LINKS = [
    { label: t.footerPrivacyShort, href: `/${lang}/privacy` },
    { label: t.footerTermsShort,   href: `/${lang}/terms` },
    { label: t.footerImprint,      href: `/${lang}/imprint` },
    { label: t.footerContact,      href: `/${lang}/contact` },
  ];

  return (
    <footer className="border-t border-gray-200 bg-white mt-20">

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div
        className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-[52px] pb-11"
        style={{
          display: "grid",
          gridTemplateColumns: "1.8fr 1fr 1fr",
          gap: "40px",
        }}
      >
        {/* Brand column */}
        <div className="flex flex-col gap-3">
          <Link
            href={`/${lang}`}
            className="text-[17px] font-black tracking-[-0.04em] text-gray-900 hover:opacity-70 transition-opacity w-fit"
          >
            colorversum
          </Link>
          <p className="text-[13.5px] text-gray-500 leading-[1.7] max-w-[280px]">
            {t.footerTagline}
          </p>
        </div>

        {/* Browse column */}
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3.5">
            {t.footerBrowse}
          </h4>
          <ul className="flex flex-col gap-0.5 list-none">
            {BROWSE_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[13.5px] font-medium text-gray-500 hover:text-gray-900 py-1 block transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal column */}
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-[.08em] text-gray-400 mb-3.5">
            {t.footerCompany}
          </h4>
          <ul className="flex flex-col gap-0.5 list-none">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[13.5px] font-medium text-gray-500 hover:text-gray-900 py-1 block transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────── */}
      <div className="border-t border-gray-200">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-[12.5px] text-gray-400">
            © {new Date().getFullYear()} colorversum — {t.footerCopyright}
          </span>

          <nav className="flex items-center">
            {BOTTOM_LINKS.map((l, i, arr) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[12.5px] text-gray-400 hover:text-gray-600 transition-colors px-2.5 py-0.5 ${
                  i < arr.length - 1 ? "border-r border-gray-200" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

    </footer>
  );
}
