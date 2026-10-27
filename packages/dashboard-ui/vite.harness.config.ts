import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Dev harness: the dashboard on mock data with no SharePoint or Azure (research R14, tasks T037).
export default defineConfig({
  root: fileURLToPath(new URL('./harness', import.meta.url)),
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
