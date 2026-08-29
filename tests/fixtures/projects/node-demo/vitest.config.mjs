import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 只跑 vitest/ 目录，避免误扫 jest/mocha/node/bun 入口
    include: ['vitest/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      include: ['src/math.js'],
    },
  },
});
