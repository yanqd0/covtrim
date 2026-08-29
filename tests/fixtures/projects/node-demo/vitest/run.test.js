import { describe, it } from 'vitest';
import assert from 'node:assert';
import { add, mul, div } from '../src/math.js';
import { mathCases } from '../cases/cases.js';

const fn = { add, mul, div };

describe('math (vitest)', () => {
  for (const c of mathCases) {
    it(c.name, () => {
      assert.strictEqual(fn[c.fn](...c.args), c.expected);
    });
  }
});
