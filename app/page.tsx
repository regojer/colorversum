// app/page.tsx
// Reads the browser's Accept-Language header and redirects to the best
// matching language. Falls back to English if no match is found.
//
// Supported languages must match the keys in lib/i18n.ts exactly.

import { redirect } from "next/navigation";
import { headers } from "next/headers";

const SUPPORTED_LANGS = ["en", "de", "es", "fr", "it", "nl", "pt"] as const;
type SupportedLang = typeof SUPPORTED_LANGS[number];

// Accept-Language can look like:
//   "de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7"
//   "fr-FR,fr;q=0.9"
//   "en"
function detectLang(acceptLanguage: string | null): SupportedLang {
  if (!acceptLanguage) return "en";

  // Split into individual tags, sorted by q-value (browser already sorts them)
  const tags = acceptLanguage
    .split(",")
    .map(part => {
      const [tag] = part.trim().split(";");
      // Strip region suffix: "de-AT" → "de", "en-US" → "en"
      return tag.split("-")[0].toLowerCase();
    });

  // Return first supported language found
  for (const tag of tags) {
    if ((SUPPORTED_LANGS as readonly string[]).includes(tag)) {
      return tag as SupportedLang;
    }
  }

  return "en";
}

export default async function RootPage() {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  const lang = detectLang(acceptLanguage);
  redirect(`/${lang}`);
}
