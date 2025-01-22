import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts'], // Add file extensions to resolve
    alias: {
      '@': path.resolve(__dirname, './src'), // Alias for src directory
    },
  },
  server: {
    hmr: true, // Enable Hot Module Replacement (HMR)
  },
});