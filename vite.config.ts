import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Public assets retain their filename; a content hash prevents returning visitors
// from pairing new animation code with an older cached Blender export.
const modelVersion = createHash('sha256')
  .update(readFileSync(new URL('./public/models/alderwick-island.glb', import.meta.url)))
  .digest('hex').slice(0, 12);

const portraitVersion = createHash('sha256')
  .update(readFileSync(new URL('./public/images/khloe-404.webp', import.meta.url)))
  .digest('hex').slice(0, 12);

export default defineConfig({
  plugins: [{ name: 'khloe-portrait-version', transformIndexHtml: html => html.replaceAll('__KHLOE_PORTRAIT_VERSION__', portraitVersion) }],
  base: './',
  define: { __ISLAND_MODEL_VERSION__: JSON.stringify(modelVersion) },
  build: {
    target: 'es2022', chunkSizeWarningLimit: 650,
    rollupOptions: { input: { main: 'index.html', notFound: '404.html' } },
  },
});
