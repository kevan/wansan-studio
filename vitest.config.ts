import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const _dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    alias: {
      '@': resolve(_dirname, 'src/renderer'),
      '@shared': resolve(_dirname, 'src/shared'),
      '@types': resolve(_dirname, 'src/types')
    },
    testTimeout: 30000, // Extend timeout for AI calls
  },
});
