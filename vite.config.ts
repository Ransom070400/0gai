import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: [
        'buffer', 'process', 'stream', 'util', 'events',
        'path', 'crypto', 'string_decoder', 'http', 'https',
        'os', 'url', 'assert', 'querystring', 'zlib',
      ],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    include: [
      'ethers',
      '@0glabs/0g-serving-broker',
      'crypto-js',
    ],
  },
});
