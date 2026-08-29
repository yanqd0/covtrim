import { defineConfig } from 'vitest/config';

// 集成测试独立配置：只跑 tests/integration-node.itest.ts（真实 spawn 框架，需本机工具链）。
export default defineConfig({
  test: {
    include: ['tests/integration-node.itest.ts'],
  },
});
