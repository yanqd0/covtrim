import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildPath, integrationEnabled, toolAvailable } from './integration-helpers.ts';

// 集成验证：真实跑 cargo llvm-cov（非 mock）。受 integrationEnabled() 开关控制（本地测、CI 跳）。
const ROOT = process.cwd();
const ROOT_BIN = `${ROOT}/node_modules/.bin`;
const RUST_DEMO = `${ROOT}/tests/fixtures/projects/rust-demo`;
const PATH = buildPath(ROOT_BIN);

function covtrimRust(args: string[], cwd: string): { code: number; out: string; err: string } {
  const r = spawnSync('tsx', [`${ROOT}/src/index.ts`, 'rust', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PATH },
  });
  return { code: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

const suite = integrationEnabled() ? describe : describe.skip;
suite('covtrim rust integration', () => {
  (toolAvailable('cargo', { ...process.env, PATH }) ? it : it.skip)(
    'runs cargo llvm-cov on rust-demo and prints TSV',
    () => {
      const { code, out } = covtrimRust([], RUST_DEMO);
      expect(code).toBe(0);
      expect(out).toContain('file\tuncovered\ttotal\tpct');
      expect(out).toContain('src/lib.rs');
    }
  );
});
