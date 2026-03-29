"use client";

// app/components/AdSlot.tsx
// Renders real AdSense <ins> tags.
// Self-collapses when AdSense doesn't fill the slot (no empty white space).
//
// SETUP: Set NEXT_PUBLIC_ADSENSE_PUB_ID in Vercel env vars:
//   NEXT_PUBLIC_ADSENSE_PUB_ID=ca-pub-XXXXXXXXXXXXXXXXX
//
// Each slot also needs a data-ad-slot ID from your AdSense dashboard.
// Create ad units at: https://adsense.google.com → Ads → By ad unit
//
// Until AdSense is approved the component renders nothing — no placeholder,
// no empty space. Once approved and script is injected via GTM, ads appear.

import { useEffect, useRef } from "react";

// Your AdSense publisher ID — set in Vercel environment variables
const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID ?? "";

// ── Slot IDs ──────────────────────────────────────────────────────
// Replace these with your real slot IDs from the AdSense dashboard.
// Create one "Leaderboard" unit (728×90) and one "Rectangle" unit (300×250).
export const AD_SLOTS = {
  leaderboard: process.env.NEXT_PUBLIC_AD_SLOT_LEADERBOARD ?? "0000000000",
  rectangle:   process.env.NEXT_PUBLIC_AD_SLOT_RECTANGLE   ?? "0000000001",
} as const;

type AdVariant = keyof typeof AD_SLOTS;

interface AdSlotProps {
  variant: AdVariant;
  className?: string;
}

export default function AdSlot({ variant, className = "" }: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!PUB_ID || PUB_ID === "ca-pub-XXXXXXXXXXXXXXXXX") return;
    try {
      // Push the ad request to the adsbygoogle queue
      (window as Window & { adsbygoogle?: { push: (obj: object) => void }[] })
        .adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch {
      // AdSense script not yet loaded — silently ignore
    }
  }, []);

  // If pub ID not set, render nothing (no empty space)
  if (!PUB_ID || PUB_ID === "ca-pub-XXXXXXXXXXXXXXXXX") return null;

  const isLeaderboard = variant === "leaderboard";

  return (
    <div
      className={`ad-slot-wrapper ${className}`}
      style={{
        // Wrapper collapses when AdSense marks slot as unfilled
        // CSS in globals.css handles the :has([data-ad-status="unfilled"]) case
        overflow: "hidden",
        minHeight: isLeaderboard ? 50 : 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={PUB_ID}
        data-ad-slot={AD_SLOTS[variant]}
        data-ad-format={isLeaderboard ? "horizontal" : "rectangle"}
        data-full-width-responsive={isLeaderboard ? "true" : "false"}
        {...(isLeaderboard && {
          // Responsive leaderboard: 320×50 on mobile, 728×90 on desktop
          "data-ad-format": "auto",
          "data-full-width-responsive": "true",
        })}
      />
    </div>
  );
}

// ── Convenience wrappers ──────────────────────────────────────────

export function AdLeaderboard({ className = "" }: { className?: string }) {
  return (
    <AdSlot
      variant="leaderboard"
      className={`w-full ${className}`}
    />
  );
}

export function AdRectangle({ className = "" }: { className?: string }) {
  return (
    <AdSlot
      variant="rectangle"
      className={className}
    />
  );
}
