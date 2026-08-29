import { describe, expect, it } from 'vitest';
import { detectFormat } from '../src/detect.ts';

describe('detectFormat', () => {
  it('detects lcov by end_of_record', () => {
    expect(detectFormat('SF:a.ts\nLF:1\nLH:1\nend_of_record')).toBe('lcov');
  });

  it('detects lcov starting directly with SF:', () => {
    expect(detectFormat('SF:a.ts\nDA:1,1')).toBe('lcov');
  });

  it('detects lcov with SF: after a TN: header', () => {
    expect(detectFormat('TN:\nSF:a.ts\nend_of_record')).toBe('lcov');
  });

  it('returns unknown for JSON input', () => {
    expect(detectFormat('{"a":1}')).toBe('unknown');
  });

  it('returns unknown for plain text', () => {
    expect(detectFormat('some log line')).toBe('unknown');
  });

  it('returns unknown for empty input', () => {
    expect(detectFormat('')).toBe('unknown');
  });
});
