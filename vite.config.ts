import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /privacy-toolkit/
export default defineConfig({
  base: '/privacy-toolkit/',
  plugins: [react()],
});
