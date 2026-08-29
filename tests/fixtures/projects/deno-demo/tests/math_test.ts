import { strict as assert } from 'node:assert';
import { add, mul } from '../src/math.ts';

// node:assert 避免 jsr:@std/assert 网络依赖（deno 2 内置 node 兼容）。
Deno.test('add', () => {
  assert.equal(add(1, 2), 3);
});

Deno.test('mul', () => {
  assert.equal(mul(3, 4), 12);
});
// div 未测 → src/math.ts 部分覆盖（uncovered > 0）
