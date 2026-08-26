import { describe, expect, it } from 'vitest';
import { parseLcov } from '../src/lcov.ts';

describe('parseLcov', () => {
  it('extracts SF/LF/LH file-level counts from each record', () => {
    const text = 'SF:a.ts\nLF:5\nLH:3\nend_of_record\nSF:b.ts\nLF:2\nLH:2\nend_of_record';
    expect(parseLcov(text)).toEqual([
      { sourceFile: 'a.ts', linesFound: 5, linesHit: 3 },
      { sourceFile: 'b.ts', linesFound: 2, linesHit: 2 },
    ]);
  });

  it('ignores DA/FN/BRDA lines', () => {
    const text = 'SF:a.ts\nDA:1,1\nDA:2,0\nFN:1,2,f\nBRDA:1,0,0,1\nLF:2\nLH:1\nend_of_record';
    expect(parseLcov(text)).toEqual([{ sourceFile: 'a.ts', linesFound: 2, linesHit: 1 }]);
  });

  it('skips blocks missing LF or LH', () => {
    const text = 'SF:no-lf.ts\nend_of_record\nSF:b.ts\nLF:3\nLH:1\nend_of_record';
    expect(parseLcov(text)).toEqual([{ sourceFile: 'b.ts', linesFound: 3, linesHit: 1 }]);
  });

  it('skips blocks with non-numeric LF/LH', () => {
    expect(parseLcov('SF:a.ts\nLF:abc\nLH:1\nend_of_record')).toEqual([]);
  });

  it('skips blocks with an empty source file path', () => {
    expect(parseLcov('SF:\nLF:1\nLH:1\nend_of_record')).toEqual([]);
  });

  it('returns an empty array for empty or recordless input', () => {
    expect(parseLcov('')).toEqual([]);
    expect(parseLcov('TN:\nFOO:bar')).toEqual([]);
  });

  it('keeps LH > LF as-is (clamping happens at formatting)', () => {
    const records = parseLcov('SF:a.ts\nLF:1\nLH:5\nend_of_record');
    expect(records[0]).toEqual({ sourceFile: 'a.ts', linesFound: 1, linesHit: 5 });
  });

  it('parses CRLF line endings', () => {
    const text = 'SF:a.ts\r\nLF:2\r\nLH:1\r\nend_of_record\r\n';
    expect(parseLcov(text)).toEqual([{ sourceFile: 'a.ts', linesFound: 2, linesHit: 1 }]);
  });

  it('trims whitespace after the SF prefix', () => {
    expect(parseLcov('SF:  a.ts\nLF:2\nLH:1\nend_of_record')).toEqual([
      { sourceFile: 'a.ts', linesFound: 2, linesHit: 1 },
    ]);
  });

  it('keeps negative LF as-is (data anomaly)', () => {
    expect(parseLcov('SF:a.ts\nLF:-1\nLH:1\nend_of_record')).toEqual([
      { sourceFile: 'a.ts', linesFound: -1, linesHit: 1 },
    ]);
  });

  it('parses a record without a trailing newline', () => {
    expect(parseLcov('SF:a.ts\nLF:2\nLH:1\nend_of_record')).toEqual([
      { sourceFile: 'a.ts', linesFound: 2, linesHit: 1 },
    ]);
  });
});
