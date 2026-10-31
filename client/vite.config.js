import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000', '/sitemap.xml': 'http://localhost:5000', '/robots.txt': 'http://localhost:5000' } },
  build: {
    target: 'es2020', sourcemap: false,
    rollupOptions: { output: { manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/recharts|d3-|victory|decimal\.js/.test(id)) return 'charts';
          if (/react-hook-form|@hookform|[\\/]zod[\\/]/.test(id)) return 'forms';
          if (/@radix-ui|sonner|@floating-ui|aria-hidden|react-remove-scroll/.test(id)) return 'ui';
          if (/@tanstack|axios|zustand/.test(id)) return 'data';
          if (/react-router|react-dom|[\\/]react[\\/]|scheduler/.test(id)) return 'react';
        } } },
  },
});
