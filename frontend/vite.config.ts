import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Generate source maps for debugging
    sourcemap: true,
    // Rollup options for better code splitting
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-codemirror': [
            '@uiw/react-codemirror',
            '@codemirror/lang-javascript',
            '@codemirror/lang-python',
            '@uiw/codemirror-theme-vscode',
          ],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    // Increase chunk size warning limit since we're code-splitting
    chunkSizeWarningLimit: 300,
  },
  // Development server options
  server: {
    port: 3000,
    // Proxy API requests to backend in development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
});
