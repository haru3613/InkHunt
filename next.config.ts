import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
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
