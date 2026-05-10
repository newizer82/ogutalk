import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 자동 등록 비활성화 — main.jsx 에서 환경별로 직접 처리
      // (네이티브 Capacitor 에선 SW 미등록, 웹에선 등록)
      injectRegister: false,

      // injectManifest: 커스텀 SW에 Workbox 캐시 목록 자동 주입
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw-custom.js',

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },

      includeAssets: ['icon-192.png', 'icon-512.png'],

      manifest: {
        name: '오구톡',
        short_name: '오구톡',
        description: '매시 59분 알람으로 스마트폰 과몰입을 방지해요',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ko',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
