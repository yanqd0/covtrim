import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseLcov } from '../src/lcov.ts';

/** 读根 fixtures/ 样本（cwd = 项目根，与 cli.test.ts 一致）。 */
function readFixture(name: string): string {
  return readFileSync(`fixtures/${name}`, 'utf8');
}

describe('multi-language lcov compatibility', () => {
  it('parses rust cargo llvm-cov output (TN/FN/FNDA/DA fields)', () => {
    const records = parseLcov(readFixture('rust-llvm-cov.info'));
    expect(records).toEqual([
      { sourceFile: 'src/lib.rs', linesFound: 5, linesHit: 3 },
      { sourceFile: 'src/main.rs', linesFound: 2, linesHit: 2 },
    ]);
  });

  it('parses python pytest-cov output (absolute paths)', () => {
    const records = parseLcov(readFixture('python-pytest-cov.info'));
    expect(records).toEqual([
      { sourceFile: '/home/user/project/app/core.py', linesFound: 4, linesHit: 2 },
      { sourceFile: '/home/user/project/app/utils.py', linesFound: 2, linesHit: 1 },
    ]);
  });

  it('parses node c8 output (ignores branch fields BRDA/BRF/BRH)', () => {
    const records = parseLcov(readFixture('node-c8.info'));
    expect(records).toEqual([
      { sourceFile: 'src/index.js', linesFound: 4, linesHit: 3 },
      { sourceFile: 'src/util.js', linesFound: 2, linesHit: 0 },
    ]);
  });
});
