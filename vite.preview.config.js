import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'github-pages',
      closeBundle() {
        writeFileSync(join(process.cwd(), 'docs', '.nojekyll'), '');
      },
    },
  ],
  base: '/libtv-author-tag-admin/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
