import { describe, expect, it } from 'vitest';
import { main } from '../src/index.ts';

function run(argv: string[]): { code: number; lines: string[] } {
  const lines: string[] = [];
  const code = main(['node', 'covtrim', ...argv], { stdout: (s) => lines.push(s) });
  return { code, lines };
}

describe('covtrim CLI', () => {
  it('prints a greeting for the hello command', () => {
    const { code, lines } = run(['hello']);
    expect(code).toBe(0);
    expect(lines.join('\n')).toContain('Hello from covtrim');
  });

  it('reports the version', () => {
    const { lines } = run(['--version']);
    expect(lines.join('\n')).toMatch(/\d+\.\d+\.\d+/);
  });

  it('exits non-zero for an unknown command', () => {
    const { code } = run(['bogus']);
    expect(code).not.toBe(0);
  });
});
