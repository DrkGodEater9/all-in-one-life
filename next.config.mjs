/** @type {import('next').NextConfig} */

// La CSP va en middleware.ts (necesita un nonce distinto por request para
// cubrir los <script> inline que el App Router usa para el streaming de RSC).
// Aquí solo las cabeceras que no dependen del request.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  // No anunciar "X-Powered-By: Next.js" — menos huella para fingerprinting.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
