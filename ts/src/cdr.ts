// CDR —— 临床痴呆评定量表（复杂评分，1:1 移植自 scoring/scales/cdr.py）。
//
// Morris(1993) CDR 整体评分算法：
// 6 个功能域各记 0 / 0.5 / 1 / 2 / 3 分，其中「记忆力(M)」为主要项目，
// 其余 5 项为次要项目。分值域 {0, 0.5, 1, 2, 3} 均为 IEEE-754 精确表示，直接 === 比较。

/** CDR 6 个功能域编码（顺序即判定顺序，第一个为记忆力主要项目） */
export const DOMAIN_CODES = [
  "CDR_MEMORY",
  "CDR_ORIENTATION",
  "CDR_JUDGMENT",
  "CDR_COMMUNITY",
  "CDR_HOME",
  "CDR_PERSONAL_CARE",
] as const;

export const MEMORY_CODE = "CDR_MEMORY";

/** 整体 CDR 分级解释 */
export const CDR_LEVELS: Record<string, string> = {
  "0": "无痴呆（CDR=0）",
  "0.5": "可疑痴呆（CDR=0.5）",
  "1": "轻度痴呆（CDR=1）",
  "2": "中度痴呆（CDR=2）",
  "3": "重度痴呆（CDR=3）",
};

const VALID_SCORES = [0.0, 0.5, 1.0, 2.0, 3.0];

export function isCdrLevel(value: number): boolean {
  return VALID_SCORES.includes(value);
}

/** 与 target 最接近的分数（并列取较大者），对应 _closest。 */
function closest(candidates: number[], target: number): number {
  return candidates.reduce((best, v) => {
    const bestDist = Math.abs(best - target);
    const vDist = Math.abs(v - target);
    if (vDist < bestDist || (vDist === bestDist && v > best)) return v;
    return best;
  });
}

/** 次要项目众数，并列时取与 memory 最接近者（再并列取较大者），对应 _majority。 */
function majority(secondaries: number[], memory: number): number {
  const counter = new Map<number, number>();
  for (const v of secondaries) counter.set(v, (counter.get(v) ?? 0) + 1);
  const maxCount = Math.max(...counter.values());
  const candidates = [...counter.entries()].filter(([, c]) => c === maxCount).map(([v]) => v);
  return closest(candidates, memory);
}

/** 与 memory 最接近的次要项目分数（并列取较大者），对应 _nearest。 */
function nearest(secondaries: number[], memory: number): number {
  return closest([...new Set(secondaries)], memory);
}

/** Morris(1993) CDR 整体评分算法，对应 global_cdr。 */
export function globalCdr(memory: number, secondaries: number[]): number {
  if (secondaries.length !== 5) {
    throw new Error(`CDR 次要项目必须为 5 个，得到 ${secondaries.length} 个`);
  }
  const s = secondaries;

  if (memory === 0.0) {
    return s.filter((x) => x >= 0.5).length >= 2 ? 0.5 : 0.0;
  }
  if (memory === 0.5) {
    return s.filter((x) => x >= 1.0).length >= 3 ? 1.0 : 0.5;
  }

  // memory >= 1.0
  const nEq = s.filter((x) => x === memory).length;
  const nGt = s.filter((x) => x > memory).length;
  const nLt = s.filter((x) => x < memory).length;
  const nZero = s.filter((x) => x === 0.0).length;

  // 3.1 至少 3 个次要项 =M
  if (nEq >= 3) return memory;
  // 3.2 仅 1-2 个次要项 =M 且两侧各不多于 2 个
  if (nEq >= 1 && nEq <= 2 && nGt <= 2 && nLt <= 2) return memory;
  // 3.3 3 个次要项在 M 一侧、另 2 个在另一侧
  if ((nGt === 3 && nLt === 2) || (nGt === 2 && nLt === 3)) return memory;
  // 4.4 M≥1 且 ≥3 个次要项 =0
  if (nZero >= 3) return 0.5;
  // 4.1 ≥3 个次要项 >或< M → 大多数（并列取与 M 最接近者）
  if (nGt >= 3 || nLt >= 3) return majority(s, memory);
  // 5 就近联合
  return nearest(s, memory);
}
