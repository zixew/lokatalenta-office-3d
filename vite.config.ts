import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 4105,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 4105,
    strictPort: true,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }
        },
      },
    },
  },
});
