import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import GeneratorClient from "@/app/components/GeneratorClient";

export const metadata: Metadata = {
  title: "AI Coloring Page Generator — Create Custom Pages | colorversum",
  description:
    "Generate a unique custom coloring page from any text description using AI. Preview free, download for €0.99. No account required.",
  openGraph: {
    title: "AI Coloring Page Generator | colorversum",
    description: "Type any idea — get a printable coloring page in seconds.",
    type: "website",
  },
};

export default function GeneratorPage() {
  return (
    <>
      <Header />

      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200" style={{ paddingTop: 64 }}>
        <div className="max-w-[1100px] mx-auto px-8 pt-10 pb-8">
          <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-2">
            ✨ AI Powered
          </p>
          <h1 className="text-[clamp(26px,4vw,40px)] font-black text-gray-900 tracking-tight leading-tight mb-2">
            Custom Coloring Page Generator
          </h1>
          <p className="text-[15px] text-gray-500 max-w-[500px] leading-relaxed">
            Describe anything — an animal, a scene, a character — and get a
            unique printable coloring page in seconds. Preview is free.
          </p>
        </div>
      </div>

      {/* ── GENERATOR ─────────────────────────────────────────────── */}
      <GeneratorClient />

      <Footer lang={lang} />
    </>
  );
}
