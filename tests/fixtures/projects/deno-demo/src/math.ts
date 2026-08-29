/** 纯函数：covtrim deno 封装的覆盖率目标（div 含分支未测 → 部分覆盖）。 */

export function add(a: number, b: number): number {
  return a + b;
}

export function mul(a: number, b: number): number {
  return a * b;
}

export function div(a: number, b: number): number {
  if (b === 0) throw new Error('div by zero');
  return a / b;
}
