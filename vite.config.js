import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Minify with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_debugger: true,
        passes: 2,
      },
    },
    // Target modern browsers for smaller output
    target: 'es2020',
    // Asset naming for long-term caching
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
  },
});
