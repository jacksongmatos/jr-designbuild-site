import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // @pascal-app/editor is a Next.js library; shim its Next imports so it
      // runs under Vite. See src/pascal/next-*-shim.tsx.
      'next/image': path.resolve(__dirname, './src/pascal/next-image-shim.tsx'),
      'next/link': path.resolve(__dirname, './src/pascal/next-link-shim.tsx'),
    },
  },
  // Pascal reads Next-style env vars at runtime. Browsers have no `process`,
  // so replace these reads at build time. To self-host Pascal assets, point
  // NEXT_PUBLIC_ASSETS_CDN_URL at your own origin (and VITE_PASCAL_ASSET_BASE).
  define: {
    'process.env.NEXT_PUBLIC_ASSETS_CDN_URL': JSON.stringify('https://editor.pascal.app'),
    'process.env.NEXT_PUBLIC_APP_URL': JSON.stringify('https://editor.pascal.app'),
    'process.env.NEXT_PUBLIC_VERCEL_ENV': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_VERCEL_URL': JSON.stringify(''),
    'process.env.PORT': JSON.stringify(''),
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
