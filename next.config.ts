import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const localHarness = process.env.INKHUNT_LOCAL_TEST === 'true' && process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:56321';
const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  experimental: { cpus: 2 },
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  images: {
    unoptimized: localHarness,
    remotePatterns: [
      ...(storageUrl ? [{protocol: storageUrl.protocol.slice(0,-1) as 'http' | 'https', hostname: storageUrl.hostname, port: storageUrl.port, pathname: '/storage/v1/object/public/**'}] : []),
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ktpckytlascxwjsivnym.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.line-scdn.net',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
