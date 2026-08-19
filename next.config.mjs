/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["bullmq", "postgres"],
  // Security hardening: safe defaults that do NOT break the iframed live preview.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Report-only first: measure violations without breaking the preview/ECharts inline styles
          {
            key: "Content-Security-Policy-Report-Only",
            value: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co; frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
