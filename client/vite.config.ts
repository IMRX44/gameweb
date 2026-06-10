import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy API + websocket traffic to the Node server on :3001 so the
// client can run on :5173 with no CORS headaches.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on all interfaces so phones on the LAN can connect
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
});
