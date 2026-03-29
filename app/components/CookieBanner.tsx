"use client";

// app/components/CookieBanner.tsx
// GDPR-compliant cookie consent banner.
// - Shown only until the user makes a choice (stored in localStorage).
// - Granular consent: essential always on, analytics + ads optional.
// - Consent is stored as a JSON object with a timestamp.
// - On accept: loads Google Analytics + AdSense scripts dynamically.
// - On reject: only essential cookies remain. No tracking, no ads.
// - {t.cookieManage} allows granular choices.
// - Complies with EU ePrivacy Directive + GDPR Article 7.

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { getUI } from "@/lib/i18n";


const CONSENT_KEY = "colorversum_cookie_consent";
const CONSENT_VERSION = "1"; // bump when policy changes to re-ask users

type ConsentState = {
  version: string;
  timestamp: number;
  analytics: boolean;
  ads: boolean;
};

function loadConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null; // policy changed
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean, ads: boolean) {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    timestamp: Date.now(),
    analytics,
    ads,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
}

function applyConsent(analytics: boolean, ads: boolean) {
  // Google Consent Mode v2 — must be called before GA/Ads scripts load
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("consent", "update", {
      analytics_storage: analytics ? "granted" : "denied",
      ad_storage: ads ? "granted" : "denied",
      ad_user_data: ads ? "granted" : "denied",
      ad_personalization: ads ? "granted" : "denied",
    });
  }

  // Dynamically inject AdSense only if ads are accepted
  if (ads && !document.getElementById("adsense-script")) {
    const script = document.createElement("script");
    script.id = "adsense-script";
    script.async = true;
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9395639617196023";
    script.setAttribute("crossorigin", "anonymous");
    document.head.appendChild(script);
  }
}

export default function CookieBanner({ lang: langProp }: { lang?: string } = {}) {
  const pathname = usePathname();
  const lang = langProp || pathname.split("/")[1] || "en";
  const t = getUI(lang);
  

  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(true);
  const [adsOn, setAdsOn] = useState(true);

  useEffect(() => {
    const consent = loadConsent();
    if (consent) {
      // Already decided — apply silently
      applyConsent(consent.analytics, consent.ads);
    } else {
      // No decision yet — show banner after tiny delay (avoids layout shift)
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent(true, true);
    applyConsent(true, true);
    setVisible(false);
  }, []);

  const rejectAll = useCallback(() => {
    saveConsent(false, false);
    applyConsent(false, false);
    setVisible(false);
  }, []);

  const saveCustom = useCallback(() => {
    saveConsent(analyticsOn, adsOn);
    applyConsent(analyticsOn, adsOn);
    setVisible(false);
  }, [analyticsOn, adsOn]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4 sm:pb-5"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="max-w-[680px] mx-auto bg-white border border-gray-200 rounded-[20px] shadow-[0_8px_48px_rgba(17,24,39,.18)] p-5 sm:p-6"
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-[15px] font-black text-gray-900 tracking-tight">
              🍪 {t.cookieTitle}
            </p>
            <p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed">
              {t.cookieDesc}
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="mb-4 flex flex-col gap-2.5 border border-gray-100 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-gray-700">{t.cookieEssential}</p>
                <p className="text-[12px] text-gray-400">{t.cookieEssentialDesc}</p>
              </div>
              <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full shrink-0">
                {t.cookieAlwaysOn}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-gray-700">{t.cookieAnalytics}</p>
                <p className="text-[12px] text-gray-400">{t.cookieAnalyticsDesc}</p>
              </div>
              <button
                role="switch" aria-checked={analyticsOn}
                onClick={() => setAnalyticsOn((v) => !v)}
                className={`relative w-[44px] h-[24px] rounded-full transition-colors shrink-0 ${analyticsOn ? "bg-blue-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${analyticsOn ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-gray-700">{t.cookieAds}</p>
                <p className="text-[12px] text-gray-400">{t.cookieAdsDesc}</p>
              </div>
              <button
                role="switch" aria-checked={adsOn}
                onClick={() => setAdsOn((v) => !v)}
                className={`relative w-[44px] h-[24px] rounded-full transition-colors shrink-0 ${adsOn ? "bg-blue-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${adsOn ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
          <button
            onClick={acceptAll}
            className="flex-1 bg-gray-900 text-white text-[14px] font-bold px-5 py-3 rounded-xl hover:opacity-85 transition-opacity"
          >
            {t.cookieAcceptAll}
          </button>
          {showDetails ? (
            <button
              onClick={saveCustom}
              className="flex-1 bg-blue-500 text-white text-[14px] font-bold px-5 py-3 rounded-xl hover:bg-blue-600 transition-colors"
            >
              {t.cookieSave}
            </button>
          ) : (
            <button
              onClick={() => setShowDetails(true)}
              className="flex-1 bg-white border border-gray-200 text-gray-700 text-[14px] font-bold px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {t.cookieManage}
            </button>
          )}
          <button
            onClick={rejectAll}
            className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-500 text-[14px] font-semibold px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {t.cookieRejectAll}
          </button>
        </div>

        <p className="text-[11.5px] text-gray-400 mt-3 text-center">
          {t.cookiePrivacy}{" "}
          <a href="/privacy" className="underline hover:text-gray-600">
            {t.cookiePrivacyLink}
          </a>
          . {t.cookieChange}
        </p>
      </div>
    </div>
  );
}

// ── Helper hook ────────────────────────────────────────────────
export function useCookieConsent(): ConsentState | null {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  useEffect(() => { setConsent(loadConsent()); }, []);
  return consent;
}
