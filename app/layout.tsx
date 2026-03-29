// app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import CookieBanner from "@/app/components/CookieBanner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Free Printable Coloring Pages | colorversum",
    template: "%s | colorversum",
  },
  description: "60,000+ free printable coloring pages for kids and adults.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://colorversum.com"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // lang="en" is the safe default — [lang]/layout.tsx overrides it synchronously
    // via a beforeInteractive script before first paint
    <html lang="en" className="overflow-x-hidden">
      <head>
        {/*
          Google Consent Mode v2 — MUST load before any GA / Ads scripts.
          Sets all consent signals to "denied" by default (GDPR-safe).
          CookieBanner.tsx calls gtag("consent", "update", ...) after user choice.
        */}
        <Script id="consent-mode-defaults" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500
            });
          `}
        </Script>

        {/*
          Google Tag Manager — loads after consent defaults are set.
          Replace GTM-XXXXXXX with your actual GTM container ID.
          GTM handles GA4 + Ads tags and respects consent mode signals.
        */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-T6T72XQB');`,
          }}
        />
      </head>
      <meta name="google-site-verification" content="5YFuBNzldzucnp8Z6ZIglMA2cVAnBpAlfIondWXwViE" />
      <meta name="google-adsense-account" content="ca-pub-9395639617196023"></meta>
      <body
        className={`${jakarta.variable} font-sans overflow-x-hidden antialiased`}
      >
        {/* GTM noscript fallback */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        {children}

        {/* GDPR cookie consent banner — shown to users who haven't chosen yet */}
        <CookieBanner />
      </body>
    </html>
  );
}
