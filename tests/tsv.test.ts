import { describe, expect, it } from 'vitest';
import type { FileRecord } from '../src/lcov.ts';
import { estimateTokens, toTsv, tokenStats } from '../src/tsv.ts';

describe('toTsv', () => {
  it('emits header and rows sorted by uncovered desc then file asc', () => {
    const records: FileRecord[] = [
      { sourceFile: 'b.ts', linesFound: 3, linesHit: 1 }, // uncovered 2, 33.3%
      { sourceFile: 'a.ts', linesFound: 5, linesHit: 3 }, // uncovered 2, 60.0%
      { sourceFile: 'c.ts', linesFound: 2, linesHit: 2 }, // uncovered 0, 100%
    ];
    expect(toTsv(records)).toBe(
      [
        'file\tuncovered\ttotal\tpct',
        'a.ts\t2\t5\t60.0',
        'b.ts\t2\t3\t33.3',
        'c.ts\t0\t2\t100.0',
      ].join('\n')
    );
  });

  it('clamps pct to 100 when LH exceeds LF', () => {
    const records: FileRecord[] = [{ sourceFile: 'a.ts', linesFound: 1, linesHit: 5 }];
    expect(toTsv(records)).toBe('file\tuncovered\ttotal\tpct\na.ts\t-4\t1\t100.0');
  });

  it('formats LF=0 as pct 0.0', () => {
    const records: FileRecord[] = [{ sourceFile: 'a.ts', linesFound: 0, linesHit: 0 }];
    expect(toTsv(records)).toContain('a.ts\t0\t0\t0.0');
  });

  it('does not mutate the input array order', () => {
    const records: FileRecord[] = [
      { sourceFile: 'z.ts', linesFound: 1, linesHit: 0 },
      { sourceFile: 'a.ts', linesFound: 1, linesHit: 0 },
    ];
    toTsv(records);
    expect(records.map((r) => r.sourceFile)).toEqual(['z.ts', 'a.ts']);
  });

  it('keeps spaces in source paths', () => {
    const records: FileRecord[] = [{ sourceFile: 'my dir/a.ts', linesFound: 2, linesHit: 1 }];
    expect(toTsv(records)).toContain('my dir/a.ts\t1\t2\t50.0');
  });

  it('sorts equal-uncovered rows by file path asc', () => {
    const records: FileRecord[] = [
      { sourceFile: 'c.ts', linesFound: 10, linesHit: 5 },
      { sourceFile: 'b.ts', linesFound: 10, linesHit: 5 },
      { sourceFile: 'a.ts', linesFound: 10, linesHit: 5 },
      { sourceFile: 'z.ts', linesFound: 10, linesHit: 9 },
    ];
    const files = toTsv(records)
      .split('\n')
      .slice(1)
      .map((l) => l.split('\t')[0]);
    expect(files).toEqual(['a.ts', 'b.ts', 'c.ts', 'z.ts']);
  });
});

describe('token estimation', () => {
  it('estimates tokens as ceil(length / 4)', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abc')).toBe(1);
    expect(estimateTokens('abcdefghi')).toBe(3);
  });

  it('computes the saved percentage between input and TSV', () => {
    const stats = tokenStats('a'.repeat(40), 'a'.repeat(10));
    expect(stats.inputTokens).toBe(10);
    expect(stats.outputTokens).toBe(3);
    expect(stats.savedPct).toBe(70);
  });

  it('returns 0 saved pct for empty input', () => {
    expect(tokenStats('', '').savedPct).toBe(0);
  });
});
