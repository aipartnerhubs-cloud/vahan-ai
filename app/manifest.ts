import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Vahan AI - Vehicle Verification',
    short_name: 'Vahan AI',
    description: 'RC-first vehicle verification for authorized insurance partners.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f7ff',
    theme_color: '#0f2742',
    categories: ['business', 'utilities'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
    ],
    shortcuts: [
      { name: 'Verify vehicle', short_name: 'Verify RC', url: '/' }
    ]
  };
}