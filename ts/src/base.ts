// 评分基础逻辑（1:1 移植自 scoring/base.py）：
// - resolveOption：按「编码 → 文本」匹配选项；
// - computeRaw：逐题匹配选项、累加分值，并按 domain 汇总分项（SUM / ITEMIZED 共用）；
// - applyLevelCutoff / applyEducationCutoff：界值匹配。

import type { Answers, CutoffConfig, ItemConfig, ItemScore, OptionConfig, ScaleConfig } from "./types.ts";

export function resolveOption(item: ItemConfig, answer: string | number): OptionConfig | null {
  const ans = String(answer).trim();
  for (const optItem of item.options) {
    if (optItem.code === ans || optItem.text === ans) return optItem;
  }
  return null;
}

export interface RawScore {
  total: number;
  subScores: Record<string, number>;
  itemScores: ItemScore[];
}

export function computeRaw(config: ScaleConfig, answers: Answers): RawScore {
  let total = 0;
  const subScores: Record<string, number> = {};
  const itemScores: ItemScore[] = [];
  for (const it of config.items) {
    const answer = answers[it.code];
    if (answer === undefined || answer === null) continue; // 非必答未作答跳过
    const optItem = resolveOption(it, answer);
    if (!optItem) {
      throw new Error(`题目 ${it.code} 的作答值 ${String(answer)} 无法匹配任何选项`);
    }
    const score = optItem.isNa ? 0 : optItem.score;
    total += score;
    itemScores.push({
      itemCode: it.code,
      itemText: it.text,
      domain: it.domain,
      answerValue: String(answer),
      optionCode: optItem.code,
      score,
    });
    if (it.domain) subScores[it.domain] = (subScores[it.domain] ?? 0) + score;
  }
  return { total, subScores, itemScores };
}

export interface CutoffResult {
  cutoffGroup: string | null;
  cutoffValue: number | null;
  resultLabel: string;
  isAbnormal: boolean | null;
}

/** LEVEL 分级匹配（SUM 量表），对应 base.py BaseScale.apply_cutoff。 */
export function applyLevelCutoff(cutoffs: CutoffConfig[], total: number): CutoffResult {
  for (const c of cutoffs) {
    if (c.cutoffType !== "LEVEL") continue;
    if ((c.minScore === null || total >= c.minScore) && (c.maxScore === null || total <= c.maxScore)) {
      return { cutoffGroup: c.groupKey, cutoffValue: c.maxScore, resultLabel: c.resultLabel, isAbnormal: c.isAbnormal };
    }
  }
  return { cutoffGroup: null, cutoffValue: null, resultLabel: "", isAbnormal: null };
}

/** EDUCATION 界值匹配（ITEMIZED 量表），对应 base.py EducationScale.apply_cutoff。 */
export function applyEducationCutoff(
  cutoffs: CutoffConfig[],
  educationYears: number,
  total: number,
): CutoffResult {
  for (const c of cutoffs) {
    if (c.cutoffType !== "EDUCATION") continue;
    const lo = c.eduYearsMin ?? -Infinity;
    const hi = c.eduYearsMax ?? Infinity;
    if (lo <= educationYears && educationYears <= hi) {
      const abnormal = c.threshold !== null && total <= c.threshold;
      return { cutoffGroup: c.groupKey, cutoffValue: c.threshold, resultLabel: c.resultLabel, isAbnormal: abnormal };
    }
  }
  return { cutoffGroup: null, cutoffValue: null, resultLabel: "", isAbnormal: null };
}
