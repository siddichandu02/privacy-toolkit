import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { offline } from './build/offline.ts';
import { preloadFonts } from './build/preloadFonts.ts';

// GitHub Pages serves the site from /pdfpip/
export default defineConfig({
  base: '/pdfpip/',
  plugins: [react(), tailwindcss(), preloadFonts(), offline()],
  build: {
    // The biggest chunk left is the 3D wait-scene helpers (three.js), which only
    // loads on a tool page once files are added. Pages themselves stay small.
    chunkSizeWarningLimit: 600,
  },
});
