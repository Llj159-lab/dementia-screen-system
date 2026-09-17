// 后端接入适配器：桥接后端 SubmittedAnswer[] / ScoreSummary 与本包 score()。
//
// 后端同学可把本文件并入其 backend/src/business/scoring.ts：
//   1) 保留其现有的输入校验（itemCode/optionCode/重复项）与 AuthError 包装；
//   2) 用 calculateScoreForBackend 替换其 calculateScore 的计分部分（含 CDR 桩）。
//
// 本文件自包含（不 import 后端 auth 模块）：错误映射通过注入的 errorFactory 完成，
// 后端传入 (msg) => new AuthError(400, 40001, msg) 即可。

import { getScale } from "../src/config.ts";
import { score } from "../src/engine.ts";
import type { Answers, ScoreResult } from "../src/types.ts";

export type SubmittedAnswer = {
  itemCode: string;
  optionCode?: string | null;
  value?: Record<string, unknown>;
  answerStatus?: "answered" | "unanswered" | "na" | "unknown" | "refused";
  observation?: Record<string, unknown>;
};

export type ScoreSummary = {
  totalScore: number | null;
  maximumScore: number | null;
  resultLabel: string | null;
  isAbnormal: boolean | null;
  scoringStatus: "calculated" | "pending_task1_engine";
  scoringMethod: string;
  warning: string | null;
  /** 分项得分（按认知域）—— 新增可选字段，后端可忽略 */
  subScores?: Record<string, number> | null;
  /** 匹配到的界值分组（教育年段键 / 分级带） */
  cutoffGroup?: string | null;
  /** 所用界值分 */
  cutoffValue?: number | null;
  /** 附加信息（CDR: cdrSb / cdrGlobal / domainScores / cdrSbRange） */
  extra?: Record<string, unknown> | null;
};

export type ErrorFactory = (message: string) => Error;

/** SubmittedAnswer[] → 本包作答字典（跳过非 answered 状态、optionCode 为空者）。 */
export function answersFromSubmitted(answers: SubmittedAnswer[]): Answers {
  const out: Answers = {};
  for (const a of answers) {
    if (a.answerStatus && a.answerStatus !== "answered") continue;
    if (a.optionCode !== undefined && a.optionCode !== null) out[a.itemCode] = a.optionCode;
  }
  return out;
}

/** ScoreResult → 后端 ScoreSummary（含可选扩展字段，不破坏既有必填字段）。 */
export function toScoreSummary(result: ScoreResult, maximumScore: number): ScoreSummary {
  return {
    totalScore: result.totalScore,
    maximumScore,
    resultLabel: result.resultLabel || null,
    isAbnormal: result.isAbnormal ?? null,
    scoringStatus: "calculated",
    scoringMethod: `task1-engine:${result.scaleCode}`,
    warning: null,
    subScores: result.subScores,
    cutoffGroup: result.cutoffGroup,
    cutoffValue: result.cutoffValue,
    extra: result.extra,
  };
}

/**
 * 后端统一计分入口（含 CDR）。
 * errorFactory 缺省为 (msg) => new Error(msg)；后端传 AuthError 工厂以复用其错误码体系。
 */
export function calculateScoreForBackend(
  scaleCode: string,
  submitted: SubmittedAnswer[],
  educationYears: number | null,
  errorFactory: ErrorFactory = (message) => new Error(message),
): ScoreSummary {
  try {
    const config = getScale(scaleCode);
    const result = score(scaleCode, answersFromSubmitted(submitted), {
      educationYears: educationYears ?? undefined,
    });
    return toScoreSummary(result, config.scoreMax);
  } catch (err) {
    if (err instanceof Error) throw errorFactory(err.message);
    throw err;
  }
}
