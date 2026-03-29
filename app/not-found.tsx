// app/not-found.tsx
// Global 404 page — shown when Next.js can't match any route
// or when notFound() is called from a page/layout.

import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body className="font-sans antialiased" style={{ fontFamily: "var(--font-jakarta, system-ui, sans-serif)" }}>
        <div
          className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
          style={{ background: "linear-gradient(180deg, #f0f4f8 0%, #ffffff 100%)" }}
        >
          {/* Big soft number */}
          <div
            className="font-black leading-none mb-6 select-none"
            style={{
              fontSize: "clamp(96px, 22vw, 200px)",
              color: "#E5E9EE",
              letterSpacing: "-.06em",
            }}
          >
            404
          </div>

          {/* Emoji */}
          <div className="text-5xl mb-5">🎨</div>

          {/* Heading */}
          <h1
            className="font-black text-gray-900 tracking-tight leading-tight mb-3"
            style={{ fontSize: "clamp(22px, 4vw, 36px)" }}
          >
            Page not found
          </h1>

          <p className="text-[15px] sm:text-[16px] text-gray-500 leading-relaxed max-w-[400px] mb-8">
            Looks like this coloring page went missing. It may have been moved or deleted.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/en"
              className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold text-[14px] px-6 py-3.5 rounded-xl hover:opacity-85 transition-opacity"
            >
              ← Back to home
            </Link>
            <Link
              href="/en/browse"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold text-[14px] px-6 py-3.5 rounded-xl hover:border-blue-400 hover:text-blue-500 transition-all"
            >
              Browse all pages
            </Link>
          </div>

          {/* Brand */}
          <Link
            href="/en"
            className="mt-12 text-[15px] font-black tracking-[-0.04em] text-gray-400 hover:text-gray-700 transition-colors"
          >
            colorversum
          </Link>
        </div>
      </body>
    </html>
  );
}
