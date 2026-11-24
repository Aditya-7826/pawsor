import { defineConfig } from 'vite';

/**
 * Two builds into dist/ (see docs/ARCHITECTURE.md §2):
 * - `vite build` (default mode): popup.html, popup.js, background.js + public/ (manifest, icons)
 * - `vite build --mode content`: content.js as one IIFE with CSS inlined
 */
export default defineConfig(({ mode }) => {
  if (mode === 'content') {
    return {
      publicDir: false,
      build: {
        target: 'es2022',
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: 'src/content/main.ts',
          name: 'Pawsor',
          formats: ['iife'],
          fileName: () => 'content.js',
        },
      },
    };
  }

  return {
    base: './',
    build: {
      target: 'es2022',
      outDir: 'dist',
      emptyOutDir: true,
      modulePreload: false,
      rollupOptions: {
        input: {
          popup: 'popup.html',
          background: 'src/background/background.ts',
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  };
});
