// app/components/LegalPage.tsx
// Shared layout for all legal/static pages.

import type { ReactNode } from "react";

interface LegalSection {
  heading?: string;
  content: ReactNode;
}

interface LegalPageProps {
  badge?: string;
  title: string;
  lastUpdated?: string;
  sections: LegalSection[];
}

export default function LegalPage({ badge, title, lastUpdated, sections }: LegalPageProps) {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-8 py-14 sm:py-20">

      {/* Page header */}
      <div className="mb-12">
        {badge && (
          <p className="text-[11.5px] font-bold uppercase tracking-[.1em] text-blue-500 mb-3">
            {badge}
          </p>
        )}
        <h1 className="text-[clamp(28px,4vw,42px)] font-black text-gray-900 tracking-tight leading-tight mb-3">
          {title}
        </h1>
        {lastUpdated && (
          <p className="text-[13.5px] text-gray-400 font-medium">{lastUpdated}</p>
        )}
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-5">
        {sections.map((section, i) => (
          <section key={i} className="bg-white border border-gray-200 rounded-[18px] px-7 sm:px-9 py-7 sm:py-8">
            {section.heading && (
              <h2 className="text-[15.5px] font-black text-gray-900 tracking-tight mb-4">
                {section.heading}
              </h2>
            )}
            <div className="text-[14.5px] text-gray-600 leading-[1.8] space-y-3.5">
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
