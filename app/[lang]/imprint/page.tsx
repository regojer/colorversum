// app/[lang]/imprint/page.tsx
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
    title: "Imprint | colorversum",
    description: "Legal notice and imprint for colorversum.",
    alternates: { canonical: `${BASE_URL}/${lang}/imprint` },
    robots: { index: false },
  };
}

export default async function ImprintPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getUI(lang);

  return (
    <>
      <Header lang={lang} />
      <main style={{ paddingTop: 64 }}>
        <LegalPage
          badge={t.legalBadge}
          title={t.imprintPageTitle}
          sections={[
            {
              heading: t.imp1H,
              content: (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800">Gregor Jerey</p>
                  <p>Bayerhammerstraße 15</p>
                  <p>5020 Salzburg, Austria</p>
                </div>
              ),
            },
            {
              heading: t.imp2H,
              content: (
                <p>
                  Email:{" "}
                  <a href="mailto:info@colorversum.com" className="text-blue-500 hover:underline font-semibold">
                    info@colorversum.com
                  </a>
                </p>
              ),
            },
            {
              heading: t.imp3H,
              content: <p>{t.imp3P}</p>,
            },
            {
              heading: t.imp4H,
              content: (
                <>
                  <p>{t.imp4P1}</p>
                  <p>{t.imp4P2}</p>
                </>
              ),
            },
          ]}
        />
      </main>
      <Footer lang={lang} />
    </>
  );
}
