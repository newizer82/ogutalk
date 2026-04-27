// vite.config.js
import { defineConfig } from "file:///sessions/bold-exciting-carson/mnt/ogutalk/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/bold-exciting-carson/mnt/ogutalk/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///sessions/bold-exciting-carson/mnt/ogutalk/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // injectManifest: 커스텀 SW에 Workbox 캐시 목록 자동 주입
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw-custom.js",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"]
      },
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "\uC624\uAD6C\uD1A1",
        short_name: "\uC624\uAD6C\uD1A1",
        description: "\uB9E4\uC2DC 59\uBD84 \uC54C\uB78C\uC73C\uB85C \uC2A4\uB9C8\uD2B8\uD3F0 \uACFC\uBAB0\uC785\uC744 \uBC29\uC9C0\uD574\uC694",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "ko",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvYm9sZC1leGNpdGluZy1jYXJzb24vbW50L29ndXRhbGtcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9ib2xkLWV4Y2l0aW5nLWNhcnNvbi9tbnQvb2d1dGFsay92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvYm9sZC1leGNpdGluZy1jYXJzb24vbW50L29ndXRhbGsvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcblxuICAgICAgLy8gaW5qZWN0TWFuaWZlc3Q6IFx1Q0VFNFx1QzJBNFx1RDE0MCBTV1x1QzVEMCBXb3JrYm94IFx1Q0U5MFx1QzJEQyBcdUJBQTlcdUI4NUQgXHVDNzkwXHVCM0Q5IFx1QzhGQ1x1Qzc4NVxuICAgICAgc3RyYXRlZ2llczogJ2luamVjdE1hbmlmZXN0JyxcbiAgICAgIHNyY0RpcjogJ3NyYycsXG4gICAgICBmaWxlbmFtZTogJ3N3LWN1c3RvbS5qcycsXG5cbiAgICAgIGluamVjdE1hbmlmZXN0OiB7XG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxwbmcsc3ZnLGljb30nXSxcbiAgICAgIH0sXG5cbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnaWNvbi0xOTIucG5nJywgJ2ljb24tNTEyLnBuZyddLFxuXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnXHVDNjI0XHVBRDZDXHVEMUExJyxcbiAgICAgICAgc2hvcnRfbmFtZTogJ1x1QzYyNFx1QUQ2Q1x1RDFBMScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnXHVCOUU0XHVDMkRDIDU5XHVCRDg0IFx1QzU0Q1x1Qjc4Q1x1QzczQ1x1Qjg1QyBcdUMyQTRcdUI5QzhcdUQyQjhcdUQzRjAgXHVBQ0ZDXHVCQUIwXHVDNzg1XHVDNzQ0IFx1QkMyOVx1QzlDMFx1RDU3NFx1QzY5NCcsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzBmMTcyYScsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjMGYxNzJhJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcbiAgICAgICAgc2NvcGU6ICcvJyxcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXG4gICAgICAgIGxhbmc6ICdrbycsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnL2ljb24tMTkyLnBuZycsXG4gICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJy9pY29uLTUxMi5wbmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVCxTQUFTLG9CQUFvQjtBQUM3VSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQTtBQUFBLE1BR2QsWUFBWTtBQUFBLE1BQ1osUUFBUTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BRVYsZ0JBQWdCO0FBQUEsUUFDZCxjQUFjLENBQUMsZ0NBQWdDO0FBQUEsTUFDakQ7QUFBQSxNQUVBLGVBQWUsQ0FBQyxnQkFBZ0IsY0FBYztBQUFBLE1BRTlDLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULGFBQWE7QUFBQSxRQUNiLE9BQU87QUFBQSxRQUNQLFdBQVc7QUFBQSxRQUNYLE1BQU07QUFBQSxRQUNOLE9BQU87QUFBQSxVQUNMO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxZQUNOLFNBQVM7QUFBQSxVQUNYO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
