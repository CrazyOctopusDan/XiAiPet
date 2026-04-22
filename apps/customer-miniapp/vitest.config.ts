import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@xiaipet/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')
    },
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.json']
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'pages/**/*.test.ts']
  }
});
