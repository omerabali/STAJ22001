// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  server: {
    host: true,
    port: 4321,
  },
  output: 'server',

  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        // /api/* isteklerini Express backend'e yönlendir
        '/api': {
          target: process.env.PUBLIC_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },

  adapter: vercel(),
});