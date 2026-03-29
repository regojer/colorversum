// app/[lang]/cookies/page.tsx
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
    title: "Cookie Notice | colorversum",
    description: "How colorversum uses cookies and how you can manage them.",
    alternates: { canonical: `${BASE_URL}/${lang}/cookies` },
    robots: { index: false },
  };
}

export default async function CookiesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getUI(lang);

  const browsers = [
    { name: "Chrome", url: "https://support.google.com/chrome/answer/95647" },
    { name: "Firefox", url: "https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" },
    { name: "Safari", url: "https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" },
    { name: "Edge", url: "https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" },
  ];

  return (
    <>
      <Header lang={lang} />
      <main style={{ paddingTop: 64 }}>
        <LegalPage
          badge={t.legalBadge}
          title={t.cnPageTitle}
          lastUpdated={t.legalUpdated}
          sections={[
            {
              heading: t.cn1H,
              content: <p>{t.cn1P}</p>,
            },
            {
              heading: t.cn2H,
              content: (
                <>
                  <p>{t.cn2P}</p>
                  <ul className="mt-2 space-y-1.5 list-none">
                    {[t.cn2L1, t.cn2L2, t.cn2L3].map(item => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="text-blue-400 font-bold shrink-0 mt-0.5">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 font-semibold text-gray-700">{t.cn2Note}</p>
                </>
              ),
            },
            {
              heading: t.cn3H,
              content: (
                <>
                  <p>{t.cn3P}</p>
                  <ul className="mt-3 space-y-1 list-none">
                    {browsers.map(b => (
                      <li key={b.name} className="flex items-center gap-2">
                        <span className="text-blue-400 font-bold shrink-0">·</span>
                        <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {b.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ),
            },
            {
              heading: t.cn4H,
              content: <p>{t.cn4P}</p>,
            },
            {
              heading: t.cn5H,
              content: (
                <p>
                  {t.cn5P}{" "}
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
