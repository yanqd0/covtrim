import { describe, expect, it } from 'vitest';
import { main } from '../src/index.ts';

function run(argv: string[]): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(['node', 'covtrim', ...argv], {
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
  });
  return { code, out, err };
}

describe('covtrim CLI', () => {
  it('reports the version', () => {
    const { out } = run(['--version']);
    expect(out.join('\n')).toMatch(/\d+\.\d+\.\d+/);
  });

  describe('report (default command)', () => {
    it('compresses an lcov file into sorted TSV', () => {
      const { code, out, err } = run(['fixtures/sample.info']);
      expect(code).toBe(0);
      const tsv = out.join('\n');
      expect(tsv.startsWith('file\tuncovered\ttotal\tpct')).toBe(true);
      expect(tsv).toContain('src/bar.ts\t2\t3\t33.3');
      expect(tsv).toContain('src/foo.ts\t2\t5\t60.0');
      expect(tsv).toContain('src/baz.ts\t0\t2\t100.0');
      // 未覆盖降序，同值按文件名升序：bar, foo, baz
      expect(
        tsv
          .split('\n')
          .slice(1)
          .map((l) => l.split('\t')[0])
      ).toEqual(['src/bar.ts', 'src/foo.ts', 'src/baz.ts']);
      expect(err.join('\n')).not.toContain('tokens:');
    });

    it('prints token stats only with --tokens', () => {
      const { code, out, err } = run(['--tokens', 'fixtures/sample.info']);
      expect(code).toBe(0);
      expect(out.join('\n')).toContain('file\tuncovered\ttotal\tpct');
      expect(err.join('\n')).toMatch(/tokens: \d+ → \d+ \(-\d+%\)/);
    });

    it('shows a plus when output exceeds input (tiny input)', () => {
      const { code, err } = run(['--tokens', 'fixtures/tiny.info']);
      expect(code).toBe(0);
      expect(err.join('\n')).toMatch(/tokens: \d+ → \d+ \(\+\d+%\)/);
    });

    it('exits 1 for a missing input file', () => {
      const { code, err } = run(['nope.info']);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('cannot read');
    });

    it('exits 1 for unsupported format (non-lcov input)', () => {
      const { code, err } = run(['package.json']);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('unsupported format');
    });

    it('processes an edge-case lcov file', () => {
      const { code, out } = run(['fixtures/edge.info']);
      expect(code).toBe(0);
      const files = out
        .join('\n')
        .split('\n')
        .slice(1)
        .map((l) => l.split('\t')[0]);
      expect(files).toEqual(['dup.ts', 'dup.ts', 'zero.ts']);
    });

    it('exits 1 for an empty file (unsupported format)', () => {
      const { code, err } = run(['fixtures/empty.info']);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('unsupported format');
    });
  });
});
