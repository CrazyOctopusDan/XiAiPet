import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@xiaipet/shared',
        replacement: path.resolve(__dirname, '../../packages/shared/src/index.ts')
      },
      {
        find: /^@xiaipet\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/shared/src/$1')
      }
    ],
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.json']
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
