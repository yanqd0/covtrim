import { describe, it } from 'vitest';
import assert from 'node:assert';
import { greet } from '../src/app.js';

describe('app', () => {
  it('greets', () => {
    assert.strictEqual(greet('covtrim'), 'hello covtrim');
  });

  // 故意失败用例：验证 covtrim 对测试失败的报错转发
  it('always fails (intentional)', () => {
    assert.fail('intentional failure');
  });
});
