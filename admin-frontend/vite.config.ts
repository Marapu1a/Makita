import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // Дев-режим: API и кука живут на одном origin через прокси
    // (на проде то же самое делает nginx)
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
});
