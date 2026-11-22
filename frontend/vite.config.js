import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Todas las llamadas a /api van al API Gateway (Principio II.4 de la constitución).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
