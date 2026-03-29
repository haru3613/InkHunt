import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InkHunt — 找到你的刺青師',
    short_name: 'InkHunt',
    description: '台灣第一個刺青師媒合平台',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      {
        src: '/logo-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
