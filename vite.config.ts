import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the site from /privacy-toolkit/
export default defineConfig({
  base: '/privacy-toolkit/',
  plugins: [react(), tailwindcss()],
  build: {
    // The biggest chunk left is the 3D wait-scene helpers (three.js), which only
    // loads on a tool page once files are added. Pages themselves stay small.
    chunkSizeWarningLimit: 600,
  },
});
