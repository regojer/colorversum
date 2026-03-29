// app/[lang]/privacy/page.tsx
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
    title: "Privacy Policy | colorversum",
    description: "How colorversum collects, uses, and protects your personal data.",
    alternates: { canonical: `${BASE_URL}/${lang}/privacy` },
    robots: { index: false },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getUI(lang);

  return (
    <>
      <Header lang={lang} />
      <main style={{ paddingTop: 64 }}>
        <LegalPage
          badge={t.legalBadge}
          title={t.privacyPageTitle}
          lastUpdated={t.legalUpdated}
          sections={[
            {
              heading: t.priv1H,
              content: <p>{t.priv1P}</p>,
            },
            {
              heading: t.priv2H,
              content: (
                <>
                  <p>{t.priv2P}</p>
                  <ul className="mt-2 space-y-1.5 list-none">
                    {[t.priv2L1, t.priv2L2].map(item => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="text-blue-400 font-bold shrink-0 mt-0.5">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3">{t.priv2P2}</p>
                </>
              ),
            },
            {
              heading: t.priv3H,
              content: (
                <>
                  <p>{t.priv3P}</p>
                  <ul className="mt-2 space-y-1.5 list-none">
                    {[t.priv3L1, t.priv3L2, t.priv3L3].map(item => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="text-blue-400 font-bold shrink-0 mt-0.5">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 font-semibold text-gray-700">{t.priv3Note}</p>
                </>
              ),
            },
            {
              heading: t.priv4H,
              content: <p>{t.priv4P}</p>,
            },
            {
              heading: t.priv5H,
              content: <p>{t.priv5P}</p>,
            },
            {
              heading: t.priv6H,
              content: (
                <p>
                  {t.priv6P}{" "}
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
