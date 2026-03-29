// app/[lang]/layout.tsx
// Wraps all [lang]/* routes.
// Hreflang meta tags in generateMetadata() on each page handle multilingual SEO.
// The html lang attribute defaults to "en" in root layout — acceptable since
// hreflang signals are what Google uses for language targeting.

export default function LangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
