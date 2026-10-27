import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Library build consumed by the SPFx web part (tasks T040). React is provided by SPFx.
// The sample-data client loads its fixtures through dynamic import(), so they land in a
// separate chunk that only `dataSource = sample` downloads (research R14, tasks T092).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'hrd-dashboard-ui.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
