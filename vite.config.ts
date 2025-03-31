import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', 'snarkjs'],
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': {
        target: 'https://ic0.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/identity': {
        target: 'https://identity.ic0.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/identity/, ''),
      },
    },
    fs: {
      strict: false,
      allow: ['..']
    }
  },
  assetsInclude: ['**/*.wasm', '**/*.zkey', '**/*.json', '**/*.r1cs'],
});