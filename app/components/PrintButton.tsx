"use client";

export default function PrintButton({ imageUrl, title }: { imageUrl: string; title: string }) {
  function handlePrint() {
    const win = window.open("", "_blank", "width=800,height=1000");
    if (!win) return;

    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title} — colorversum</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    html, body {
      width: 210mm;
      height: 297mm;
      background: #fff;
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 14mm 14mm 18mm 14mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .image-wrap {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }

    .footer {
      position: absolute;
      bottom: 7mm;
      left: 0;
      right: 0;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 9pt;
      color: #9CA3AF;
      letter-spacing: 0.04em;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="image-wrap">
      <img src="${imageUrl}" alt="${title}" />
    </div>
    <div class="footer">colorversum.com</div>
  </div>
  <script>
    // Wait for image to load, then print
    const img = document.querySelector("img");
    if (img.complete) {
      window.print();
      window.close();
    } else {
      img.onload = () => { window.print(); window.close(); };
      img.onerror = () => { window.print(); window.close(); };
    }
  </script>
</body>
</html>
    `);
    win.document.close();
  }

  return (
    <button
      onClick={handlePrint}
      className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 font-bold text-sm py-3 rounded-xl transition-all"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Print
    </button>
  );
}
