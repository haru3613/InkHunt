import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InkHunt — 找到你的刺青師',
    short_name: 'InkHunt',
    description: '台灣第一個刺青師媒合平台',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#292524',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
