import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  // Sites builds its own static UI copy in scripts/build-sites.mjs.
  // The source project always retains its server routes for full-stack hosts.
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  async headers() { return [{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
  ] }]; }
};
export default config;
