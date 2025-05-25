import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy requests from /api to your Python backend
      '/api': {
        target: 'http://127.0.0.1:8000', // Your FastAPI server address
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // Optional: if you need to remove /api prefix
      },
    },
  },
})