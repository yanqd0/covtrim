'use strict';

/** 纯函数：多框架共享的覆盖率目标（CJS，最大框架兼容）。 */
function add(a, b) {
  return a + b;
}

function mul(a, b) {
  return a * b;
}

function div(a, b) {
  if (b === 0) throw new Error('div by zero');
  return a / b;
}

module.exports = { add, mul, div };
