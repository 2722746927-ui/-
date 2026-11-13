import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  ...(process.env.SITES_EXPORT === '1' ? { output: 'export' } : {}),
  async headers() { return [{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
  ] }]; }
};
export default config;
