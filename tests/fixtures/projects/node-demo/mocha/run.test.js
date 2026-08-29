'use strict';
const assert = require('node:assert');
const { add, mul, div } = require('../src/math.js');
const { mathCases } = require('../cases/cases.js');

const fn = { add, mul, div };

describe('math (mocha)', () => {
  for (const c of mathCases) {
    it(c.name, () => {
      assert.strictEqual(fn[c.fn](...c.args), c.expected);
    });
  }
});
