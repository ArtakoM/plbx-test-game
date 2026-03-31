import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  base: './',
  build: {
    target: 'es2020',
    minify: 'oxc',
    assetsInlineLimit: 100000000,
  },
});
