'use strict';

/** 数据驱动用例（纯数据，跨框架复用；入口负责映射到真实函数）。 */
const mathCases = [
  { name: 'add positive', fn: 'add', args: [1, 2], expected: 3 },
  { name: 'add negative', fn: 'add', args: [-1, 2], expected: 1 },
  { name: 'mul', fn: 'mul', args: [3, 4], expected: 12 },
  { name: 'div', fn: 'div', args: [10, 2], expected: 5 },
];

module.exports = { mathCases };
