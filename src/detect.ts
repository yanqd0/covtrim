/** 支持的覆盖率输入格式。首期仅 lcov；未来 JSON/XML 扩展。 */
export type Format = 'lcov' | 'unknown';

const SF_PREFIX = 'SF:';

/**
 * 嗅探输入文本的覆盖率格式。
 *
 * 规则：含 `end_of_record`，或存在 `SF:` 前缀行（含文件首行与换行后行首）→ lcov。
 * 接口预埋：未来按 JSON（`{`）/XML（`<`）嗅探时，Format 增加对应值，调用方按格式路由 parser。
 */
export function detectFormat(text: string): Format {
  if (
    text.includes('end_of_record') ||
    text.startsWith(SF_PREFIX) ||
    text.includes(`\n${SF_PREFIX}`)
  ) {
    return 'lcov';
  }
  return 'unknown';
}
