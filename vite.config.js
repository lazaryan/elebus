import { resolve } from 'node:path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import rootPackage from './package.json' assert { type: 'json' };

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: '**/*.test.ts',
    }),
  ],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: rootPackage['name'],
      // the proper extensions will be added
      fileName: 'index',
    },
  },
});
