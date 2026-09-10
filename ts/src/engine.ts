// 统一评分入口（1:1 移植自 scoring/engine.py + base.py 的 score() 流程）。
//
// score(scaleCode, answers, patient?) → ScoreResult
// 流程：取配置 → 校验必答 → 计算原始分（含分项）→ 应用界值 → 汇总结果。

import { applyEducationCutoff, applyLevelCutoff, computeRaw, resolveOption } from "./base.ts";
import { CDR_LEVELS, DOMAIN_CODES, globalCdr, isCdrLevel, MEMORY_CODE } from "./cdr.ts";
import { getScale } from "./config.ts";
import type { Answers, ItemScore, PatientCtx, ScaleConfig, ScoreResult } from "./types.ts";

function validateRequired(config: ScaleConfig, answers: Answers): void {
  const missing: string[] = [];
  for (const it of config.items) {
    if (it.required && (answers[it.code] === undefined || answers[it.code] === null)) {
      missing.push(it.code);
    }
  }
  if (missing.length > 0) {
    throw new Error(`以下必答题目缺少作答: ${missing.join(", ")}`);
  }
}

function requireEducationYears(patient: PatientCtx | undefined, scaleCode: string): number {
  const years = patient?.educationYears;
  if (years === undefined || years === null || !Number.isInteger(years) || years < 0) {
    throw new Error(
      `量表 ${scaleCode} 需要受教育年限以匹配教育界值，请在 patient 中提供 educationYears（>=0 的整数），得到 ${years}`,
    );
  }
  return years;
}

function scoreCdr(config: ScaleConfig, answers: Answers): ScoreResult {
  const domainScores: Record<string, number> = {};
  const itemScores: ItemScore[] = [];
  for (const code of DOMAIN_CODES) {
    const it = config.items.find((candidate) => candidate.code === code);
    if (!it) throw new Error(`CDR 配置缺少功能域 ${code}`);
    const answer = answers[code];
    if (answer === undefined || answer === null) throw new Error(`CDR 功能域 ${code} 缺少评分`);
    const optItem = resolveOption(it, answer);
    if (!optItem) throw new Error(`CDR 功能域 ${code} 的作答值 ${String(answer)} 无法匹配任何选项`);
    const score = optItem.score;
    if (!isCdrLevel(score)) throw new Error(`CDR 功能域 ${code} 得分非法: ${score}`);
    domainScores[code] = score;
    itemScores.push({
      itemCode: code,
      itemText: it.text,
      domain: it.domain,
      answerValue: String(answer),
      optionCode: optItem.code,
      score,
    });
  }
  const memory = domainScores[MEMORY_CODE];
  const secondaries = DOMAIN_CODES.filter((c) => c !== MEMORY_CODE).map((c) => domainScores[c]);
  const g = globalCdr(memory, secondaries);
  const cdrSb = DOMAIN_CODES.reduce((sum, c) => sum + domainScores[c], 0);
  return {
    scaleCode: config.code,
    scaleName: config.name,
    totalScore: g,
    subScores: domainScores,
    itemScores,
    resultLabel: CDR_LEVELS[String(g)] ?? `CDR=${g}`,
    cutoffGroup: null,
    cutoffValue: null,
    isAbnormal: g > 0,
    extra: { cdrSb, cdrGlobal: g, domainScores: { ...domainScores }, cdrSbRange: "0-18" },
  };
}

export function score(scaleCode: string, answers: Answers, patient?: PatientCtx): ScoreResult {
  if (answers === null || typeof answers !== "object" || Array.isArray(answers)) {
    throw new Error("answers 必须是对象，形如 {'题号': '选项值'}");
  }
  const config = getScale(scaleCode);
  validateRequired(config, answers);

  if (config.scoringType === "CDR") {
    return scoreCdr(config, answers);
  }

  const raw = computeRaw(config, answers);

  if (config.scoringType === "ITEMIZED") {
    const years = requireEducationYears(patient, config.code);
    const cutoff = applyEducationCutoff(config.cutoffs, years, raw.total);
    return {
      scaleCode: config.code,
      scaleName: config.name,
      totalScore: raw.total,
      subScores: raw.subScores,
      itemScores: raw.itemScores,
      ...cutoff,
      extra: {},
    };
  }

  // SUM
  const cutoff = applyLevelCutoff(config.cutoffs, raw.total);
  return {
    scaleCode: config.code,
    scaleName: config.name,
    totalScore: raw.total,
    subScores: raw.subScores,
    itemScores: raw.itemScores,
    ...cutoff,
    extra: {},
  };
}
