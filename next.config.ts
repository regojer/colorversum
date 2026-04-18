import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.colorversum.com" }],
        destination: "https://colorversum.com/:path*",
        permanent: true, // 301 — tells Google to never crawl www again
      },
    ];
  },
};

export default nextConfig;
