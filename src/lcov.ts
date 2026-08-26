/** 单个源文件的 lcov 文件级统计。 */
export interface FileRecord {
  /** SF：源文件路径 */
  sourceFile: string;
  /** LF：行数（lines found） */
  linesFound: number;
  /** LH：命中行数（lines hit） */
  linesHit: number;
}

const SF_PREFIX = 'SF:';
const LF_PREFIX = 'LF:';
const LH_PREFIX = 'LH:';

/**
 * 解析 lcov 文本，提取每个 record（SF 块）的文件级计数。
 *
 * 按 `end_of_record` 切块，每块扫描 `SF:`/`LF:`/`LH:` 前缀行。
 * 容错：缺 SF、空文件路径、或 LF/LH 缺失/非数字的块跳过。
 */
export function parseLcov(text: string): FileRecord[] {
  const records: FileRecord[] = [];
  for (const block of text.split('end_of_record')) {
    const record = parseBlock(block);
    if (record) records.push(record);
  }
  return records;
}

function parseBlock(block: string): FileRecord | null {
  let sourceFile: string | undefined;
  let linesFound: number | undefined;
  let linesHit: number | undefined;

  for (const line of block.split('\n')) {
    if (line.startsWith(SF_PREFIX)) {
      sourceFile = line.slice(SF_PREFIX.length).trim();
    } else if (line.startsWith(LF_PREFIX)) {
      linesFound = Number.parseInt(line.slice(LF_PREFIX.length), 10);
    } else if (line.startsWith(LH_PREFIX)) {
      linesHit = Number.parseInt(line.slice(LH_PREFIX.length), 10);
    }
  }

  if (
    !sourceFile ||
    linesFound === undefined ||
    linesHit === undefined ||
    Number.isNaN(linesFound) ||
    Number.isNaN(linesHit)
  ) {
    return null;
  }
  return { sourceFile, linesFound, linesHit };
}
