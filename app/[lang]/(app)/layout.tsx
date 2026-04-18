import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/app/components/DashboardShell";
import Footer from "@/app/components/Footer";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const { data: cats } = await supabase
    .from("category_translations")
    .select("category_id, name, slug")
    .eq("language", lang)
    .not("slug", "is", null)
    .limit(24);

  const categories = (cats ?? []).filter(c => c.slug !== "null");

  return (
    <Suspense>
      <DashboardShell lang={lang} categories={categories}>
        <div className="min-h-[calc(100vh-52px)] flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <Footer lang={lang} />
        </div>
      </DashboardShell>
    </Suspense>
  );
}
