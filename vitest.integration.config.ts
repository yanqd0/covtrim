import { defineConfig } from 'vitest/config';

// 集成测试独立配置：只跑 tests/integration-*.itest.ts（真实 spawn 工具链，需本机多语言环境）。
export default defineConfig({
  test: {
    include: [
      'tests/integration-node.itest.ts',
      'tests/integration-rust.itest.ts',
      'tests/integration-python.itest.ts',
    ],
  },
});
