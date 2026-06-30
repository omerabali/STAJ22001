// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

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
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },

  adapter: node({
    mode: 'standalone',
  }),
});