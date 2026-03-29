"use client";

import { useState } from "react";

export default function DownloadButton({
  pdfUrl,
  imageUrl,
  title,
}: {
  pdfUrl: string | null;
  imageUrl: string | null;
  title: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const filename = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-colorversum`;

    try {
      // ── Option A: PDF already exists in storage ──────────────────
      if (pdfUrl) {
        const res  = await fetch(pdfUrl);
        const blob = await res.blob();
        triggerDownload(blob, `${filename}.pdf`);
        await new Promise(r => setTimeout(r, 800));
        return;
      }

      // ── Option B: No PDF — generate one client-side from image ───
      if (!imageUrl) return;

      // Dynamically import jsPDF so it doesn't bloat the initial bundle
      const { jsPDF } = await import("jspdf");

      // Fetch image and convert to base64
      const res    = await fetch(imageUrl);
      const blob   = await res.blob();
      const base64 = await blobToBase64(blob);

      // A4 dimensions in mm
      const A4_W = 210;
      const A4_H = 297;
      const PAD  = 14;  // padding all sides
      const FOOTER_H = 10; // space reserved for footer

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Max available area inside padding
      const maxW = A4_W - PAD * 2;
      const maxH = A4_H - PAD * 2 - FOOTER_H;

      // Get natural image dimensions to preserve aspect ratio
      const naturalDims = await getImageDimensions(imageUrl);
      const ratio = naturalDims.width / naturalDims.height;

      // Fit image inside maxW × maxH without stretching
      let drawW = maxW;
      let drawH = maxW / ratio;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = maxH * ratio;
      }

      // Center within the available area
      const offsetX = PAD + (maxW - drawW) / 2;
      const offsetY = PAD + (maxH - drawH) / 2;

      // Detect format from blob type
      const fmt = blob.type.includes("png") ? "PNG" : "JPEG";
      doc.addImage(base64, fmt, offsetX, offsetY, drawW, drawH, undefined, "FAST");

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text("colorversum.com", A4_W / 2, A4_H - 5, { align: "center" });

      // Download — wait briefly so spinner doesn't cut out before
      // the browser registers the file save
      const pdfBlob = doc.output("blob");
      triggerDownload(pdfBlob, `${filename}.pdf`);
      await new Promise(r => setTimeout(r, 800));

    } catch (err) {
      console.error("Download failed:", err);
      // Last resort fallback
      if (imageUrl) window.open(imageUrl, "_blank");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-extrabold text-[15px] py-3.5 rounded-xl transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(59,130,246,.4)] active:translate-y-0"
    >
      {loading ? (
        <>
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Creating PDF…
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PDF — Free
        </>
      )}
    </button>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src     = src;
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
