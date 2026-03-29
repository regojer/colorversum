// app/[lang]/terms/page.tsx
import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import LegalPage from "@/app/components/LegalPage";
import { getUI } from "@/lib/i18n";

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com";
  return {
    title: "Terms of Use | colorversum",
    description: "Terms and conditions for using colorversum and its printable coloring pages.",
    alternates: { canonical: `${BASE_URL}/${lang}/terms` },
    robots: { index: false },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getUI(lang);

  return (
    <>
      <Header lang={lang} />
      <main style={{ paddingTop: 64 }}>
        <LegalPage
          badge={t.legalBadge}
          title={t.termsPageTitle}
          lastUpdated={t.legalUpdated}
          sections={[
            {
              heading: t.terms1H,
              content: <p>{t.terms1P}</p>,
            },
            {
              heading: t.terms2H,
              content: (
                <>
                  <p><strong className="text-gray-800">{t.terms2P}</strong></p>
                  <p className="mt-1">{t.terms2Sub}</p>
                </>
              ),
            },
            {
              heading: t.terms3H,
              content: (
                <>
                  <p className="mb-2">{t.terms3P}</p>
                  <ul className="space-y-1.5 list-none">
                    {[t.terms3L1, t.terms3L2].map(item => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              ),
            },
            {
              heading: t.terms4H,
              content: (
                <>
                  <p>{t.terms4P1}</p>
                  <p>{t.terms4P2}</p>
                  <p>{t.terms4P3}</p>
                </>
              ),
            },
            {
              heading: t.terms5H,
              content: <p>{t.terms5P}</p>,
            },
            {
              heading: t.terms6H,
              content: (
                <p>
                  {t.terms6P}{" "}
                  <a href="mailto:info@colorversum.com" className="text-blue-500 hover:underline font-semibold">
                    info@colorversum.com
                  </a>
                </p>
              ),
            },
          ]}
        />
      </main>
      <Footer lang={lang} />
    </>
  );
}
