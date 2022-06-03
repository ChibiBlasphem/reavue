const path = require('path');
const { defineConfig } = require('vite');

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'Revue',
      formats: ['cjs', 'es'],
      fileName: (format) => `revue.${format}.js`,
    },
    rollupOptions: {
      external: ['vue', '@vue/composition-api', 'react', 'react-dom/client'],
    },
  },
});
