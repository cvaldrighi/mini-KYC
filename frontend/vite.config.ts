import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // No GitHub Pages o site fica em /mini-KYC/, e não na raiz: o workflow define BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  server: {
    // Porta fixa: o CORS do bucket e das Function URLs libera só http://localhost:5173.
    // Com strictPort, o Vite falha se a porta estiver ocupada, em vez de subir em outra.
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
