"use client";

import { useState, useId } from "react";

const STYLE_OPTIONS = [
  { value: "cartoon",   label: "🐉 Cartoon",   desc: "Rounded, fun, expressive" },
  { value: "simple",    label: "⬟ Simple",     desc: "Minimal, geometric, clean" },
  { value: "realistic", label: "✏️ Realistic",  desc: "Accurate proportions" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy",   label: "Easy",   badge: "bg-green-100 text-green-800", desc: "Ages 3–6 · few regions" },
  { value: "medium", label: "Medium", badge: "bg-amber-100 text-amber-800", desc: "Ages 6–12 · moderate detail" },
  { value: "hard",   label: "Hard",   badge: "bg-blue-100 text-blue-800",   desc: "Adults · rich scene" },
];

const EXAMPLE_PROMPTS = [
  "a cute dragon sitting on a pile of books",
  "two rabbits in a garden with flowers",
  "a rocket ship flying past the moon",
  "a sleepy bear in a forest",
  "a mermaid underwater with fish",
  "a wizard with a magic wand and stars",
];

type GenerateState = "idle" | "loading" | "done" | "error";

export default function GeneratorClient() {
  const id = useId();

  const [prompt,     setPrompt]     = useState("");
  const [style,      setStyle]      = useState("cartoon");
  const [difficulty, setDifficulty] = useState("medium");
  const [state,      setState]      = useState<GenerateState>("idle");
  const [imageUrl,   setImageUrl]   = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setState("loading");
    setImageUrl(null);
    setGeneratedId(null);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ prompt, style, difficulty }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Generation failed");
      }

      setImageUrl(data.image_url);
      setGeneratedId(data.id);
      setState("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  async function handleDownload() {
    if (!generatedId) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ generatedId }),
      });
      const data = await res.json();

      if (data.already_paid && data.image_url) {
        window.open(`/api/download/generated?id=${generatedId}`, "_blank");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Could not start checkout. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10 items-start">

        {/* ── LEFT: Controls ─────────────────────────────────────── */}
        <div className="flex flex-col gap-7">

          {/* Prompt */}
          <div>
            <label htmlFor={`${id}-prompt`} className="block text-[13px] font-bold text-gray-700 mb-2">
              Describe your coloring page
            </label>
            <textarea
              id={`${id}-prompt`}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. a cute dragon sitting on a pile of books"
              rows={3}
              className="w-full bg-white border-[1.5px] border-gray-200 rounded-xl px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 resize-none outline-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,.1)] transition-all leading-relaxed"
              onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleGenerate(); }}
            />
            <p className="text-[12px] text-gray-400 mt-1.5">
              Press <kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1 py-0.5 text-[11px]">⌘ Enter</kbd> to generate
            </p>
          </div>

          {/* Example prompts */}
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[.07em] text-gray-400 mb-2.5">Examples</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map(ex => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="text-[13px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <p className="text-[13px] font-bold text-gray-700 mb-2.5">Style</p>
            <div className="grid grid-cols-3 gap-2.5">
              {STYLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStyle(opt.value)}
                  className={`flex flex-col items-start p-3.5 rounded-xl border-[1.5px] text-left transition-all ${
                    style === opt.value
                      ? "border-blue-400 bg-blue-50 shadow-[0_0_0_3px_rgba(59,130,246,.1)]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-[16px] mb-1">{opt.label}</span>
                  <span className={`text-[11.5px] font-medium leading-snug ${style === opt.value ? "text-blue-600" : "text-gray-400"}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <p className="text-[13px] font-bold text-gray-700 mb-2.5">Difficulty</p>
            <div className="flex gap-2.5">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={`flex-1 flex flex-col items-start p-3.5 rounded-xl border-[1.5px] text-left transition-all ${
                    difficulty === opt.value
                      ? "border-blue-400 bg-blue-50 shadow-[0_0_0_3px_rgba(59,130,246,.1)]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5 ${opt.badge}`}>
                    {opt.label}
                  </span>
                  <span className={`text-[11.5px] font-medium leading-snug ${difficulty === opt.value ? "text-blue-600" : "text-gray-400"}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={state === "loading" || !prompt.trim()}
            className={`w-full flex items-center justify-center gap-3 font-extrabold text-[16px] py-4 rounded-xl transition-all ${
              state === "loading" || !prompt.trim()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,.4)] hover:-translate-y-0.5"
            }`}
          >
            {state === "loading" ? (
              <>
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Generating your page…
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Generate coloring page
              </>
            )}
          </button>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-[14px] text-red-700">
              <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* ── RIGHT: Preview ─────────────────────────────────────── */}
        <div className="lg:sticky lg:top-[80px]">
          <div className="bg-white border border-gray-200 rounded-[20px] overflow-hidden shadow-sm">

            {/* Preview area */}
            <div className="relative bg-[#FAFAFA] border-b border-gray-200" style={{ aspectRatio: "1/1" }}>

              {/* Idle / loading state */}
              {state === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-300">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                  <p className="text-[13px] font-semibold text-gray-400">Your coloring page will appear here</p>
                </div>
              )}

              {state === "loading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-[3px] border-gray-100" />
                    <div className="absolute inset-0 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-gray-700">Creating your page…</p>
                    <p className="text-[12px] text-gray-400 mt-1">Usually takes 10–20 seconds</p>
                  </div>
                </div>
              )}

              {/* Generated image with watermark overlay */}
              {(state === "done" || state === "error") && imageUrl && (
                <>
                  <img
                    src={imageUrl}
                    alt="Generated coloring page preview"
                    className="w-full h-full object-contain"
                  />
                  {/* Watermark */}
                  <div
                    className="absolute inset-0 pointer-events-none select-none flex items-center justify-center"
                    style={{
                      background: "repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(0,0,0,.04) 60px, rgba(0,0,0,.04) 61px)",
                    }}
                  >
                    <div
                      className="text-gray-300 font-black text-[22px] tracking-tight rotate-[-30deg] whitespace-nowrap opacity-70"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,.06)" }}
                    >
                      colorversum · preview
                    </div>
                  </div>
                  {/* Preview label */}
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm">
                    Preview
                  </div>
                </>
              )}
            </div>

            {/* Action area */}
            <div className="p-5 flex flex-col gap-3">
              {state === "done" && generatedId ? (
                <>
                  <button
                    onClick={handleDownload}
                    disabled={checkoutLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:opacity-85 text-white font-extrabold text-[15px] py-3.5 rounded-xl transition-all hover:-translate-y-px disabled:opacity-60"
                  >
                    {checkoutLoading ? (
                      <>
                        <svg className="animate-spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                        Preparing checkout…
                      </>
                    ) : (
                      <>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download — €0.99
                      </>
                    )}
                  </button>
                  <p className="text-[12px] text-gray-400 text-center">
                    One-time payment · No watermark · Print-ready PNG
                  </p>
                  <button
                    onClick={handleGenerate}
                    className="w-full text-[13px] font-semibold text-gray-500 hover:text-gray-700 py-2 transition-colors"
                  >
                    ↺ Generate again
                  </button>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-[13px] font-semibold text-gray-400">
                    Preview is free · Download for €0.99
                  </p>
                  <p className="text-[12px] text-gray-300 mt-0.5">
                    No watermark · Print-ready PNG
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pro upsell */}
          <div className="mt-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-[18px] p-5 text-white">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">⭐</span>
              <div>
                <p className="text-[14px] font-black mb-1">Get Pro — €2.99/month</p>
                <p className="text-[12.5px] text-white/70 leading-relaxed mb-3">
                  50 AI pages per month · No watermark · Ad-free browsing · All bundles included
                </p>
                <a
                  href="/pro"
                  className="inline-flex items-center gap-1.5 bg-white text-gray-900 font-bold text-[13px] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Get Pro →
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
