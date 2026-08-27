import type { FileRecord } from './lcov.ts';

/** token 量化结果。 */
export interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  savedPct: number;
}

/**
 * 生成未覆盖降序的 TSV（header + 数据行）。
 *
 * 列：file / uncovered / total / pct；`uncovered = LF - LH`，同值按文件路径升序。
 */
export function toTsv(records: FileRecord[]): string {
  const rows = [...records]
    .map((r) => ({ record: r, uncovered: r.linesFound - r.linesHit }))
    .sort(
      (a, b) => b.uncovered - a.uncovered || a.record.sourceFile.localeCompare(b.record.sourceFile)
    )
    .map(({ record, uncovered }) =>
      [record.sourceFile.replace(/\t/g, ' '), String(uncovered), String(record.linesFound), formatPct(record)].join(
        '\t'
      )
    );
  return ['file\tuncovered\ttotal\tpct', ...rows].join('\n');
}

/** LH/LF 百分比，一位小数；LF=0 记 0.0，LH>LF clamp 到 100。 */
function formatPct(r: FileRecord): string {
  if (r.linesFound === 0) return '0.0';
  const raw = (r.linesHit / r.linesFound) * 100;
  return Math.min(raw, 100).toFixed(1);
}

/** 粗估 token 数（字符数/4，接近常见 tokenizer 行为）。 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** 对比原始 lcov 与 TSV 输出的 token 节省。 */
export function tokenStats(inputText: string, tsvText: string): TokenStats {
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(tsvText);
  const savedPct = inputTokens === 0 ? 0 : Math.round((1 - outputTokens / inputTokens) * 100);
  return { inputTokens, outputTokens, savedPct };
}
