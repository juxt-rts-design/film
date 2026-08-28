import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { mediaProxyPlugin } from './server/media-proxy.js';

export default defineConfig({
  plugins: [react(), tailwindcss(), mediaProxyPlugin()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://open-otaku.me',
        changeOrigin: true,
        secure: true,
        headers: {
          Referer: 'https://open-otaku.me/',
          Origin: 'https://open-otaku.me',
        },
      },
    },
  },
  preview: {
    host: true,
    port: 5174,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://open-otaku.me',
        changeOrigin: true,
        secure: true,
        headers: {
          Referer: 'https://open-otaku.me/',
          Origin: 'https://open-otaku.me',
        },
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
