import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AuthError } from "../auth/auth.js";
import type { ScoreSummary } from "./types.js";

type ScaleOption = { code: string; text: string; score: number; is_na: boolean };
type ScaleItem = {
  code: string;
  no: number;
  text: string;
  domain?: string | null;
  required: boolean;
  max_score: number;
  options: ScaleOption[];
};
type Cutoff = {
  cutoff_type: "LEVEL" | "EDUCATION";
  result_label: string;
  is_abnormal: boolean;
  edu_years_min: number | null;
  edu_years_max: number | null;
  min_score: number | null;
  max_score: number | null;
  threshold: number | null;
};
export type ScaleConfig = {
  scaleConfigId: string;
  scaleCode: string;
  name: string;
  version: string;
  status: string;
  instructions: unknown[];
  items: ScaleItem[];
  scoring: {
    scoringType: "SUM" | "ITEMIZED" | "CDR";
    scoreMin: number;
    scoreMax: number;
    cutoffs: Cutoff[];
    remark: string;
    algorithmSource: string;
  };
};

const fixturePath = fileURLToPath(
  new URL("../../fixtures/task1-scale-configs.json", import.meta.url),
);
const configs = JSON.parse(readFileSync(fixturePath, "utf8")) as ScaleConfig[];

export function listScaleConfigs(): ScaleConfig[] {
  return configs;
}

export function findScaleConfig(scaleCode: string, version?: string): ScaleConfig | undefined {
  return configs.find(
    (config) => config.scaleCode === scaleCode && (!version || config.version === version),
  );
}

export type SubmittedAnswer = {
  itemCode: string;
  optionCode?: string | null;
  value?: Record<string, unknown>;
  answerStatus?: "answered" | "unanswered" | "na" | "unknown" | "refused";
  observation?: Record<string, unknown>;
};

const CDR_DOMAIN_CODES = [
  "CDR_MEMORY", "CDR_ORIENTATION", "CDR_JUDGMENT",
  "CDR_COMMUNITY", "CDR_HOME", "CDR_PERSONAL_CARE",
] as const;
const CDR_LABELS: Record<string, string> = {
  "0": "无痴呆（CDR=0）", "0.5": "可疑痴呆（CDR=0.5）",
  "1": "轻度痴呆（CDR=1）", "2": "中度痴呆（CDR=2）", "3": "重度痴呆（CDR=3）",
};

function closest(values: number[], target: number): number {
  return values.reduce((best, value) => {
    const bestDistance = Math.abs(best - target);
    const distance = Math.abs(value - target);
    return distance < bestDistance || (distance === bestDistance && value > best) ? value : best;
  });
}

/** Morris (1993) CDR global score, ported from the task-1 engine. */
export function globalCdr(memory: number, secondaries: number[]): number {
  if (secondaries.length !== 5) throw new Error("CDR requires five secondary domains");
  if (memory === 0) return secondaries.filter((value) => value >= 0.5).length >= 2 ? 0.5 : 0;
  if (memory === 0.5) return secondaries.filter((value) => value >= 1).length >= 3 ? 1 : 0.5;
  const equal = secondaries.filter((value) => value === memory).length;
  const greater = secondaries.filter((value) => value > memory).length;
  const lower = secondaries.filter((value) => value < memory).length;
  if (equal >= 3 || (equal >= 1 && equal <= 2 && greater <= 2 && lower <= 2)) return memory;
  if ((greater === 3 && lower === 2) || (greater === 2 && lower === 3)) return memory;
  if (secondaries.filter((value) => value === 0).length >= 3) return 0.5;
  if (greater >= 3 || lower >= 3) {
    const counts = new Map<number, number>();
    for (const value of secondaries) counts.set(value, (counts.get(value) ?? 0) + 1);
    const maximum = Math.max(...counts.values());
    return closest([...counts].filter(([, count]) => count === maximum).map(([value]) => value), memory);
  }
  return closest([...new Set(secondaries)], memory);
}

function resultFromCutoffs(
  totalScore: number,
  cutoffs: Cutoff[],
  educationYears: number | null,
): Pick<ScoreSummary, "resultLabel" | "isAbnormal"> {
  const level = cutoffs.find(
    (cutoff) =>
      cutoff.cutoff_type === "LEVEL" &&
      cutoff.min_score !== null && totalScore >= cutoff.min_score &&
      cutoff.max_score !== null && totalScore <= cutoff.max_score,
  );
  if (level) return { resultLabel: level.result_label, isAbnormal: level.is_abnormal };

  if (educationYears !== null) {
    const education = cutoffs.find(
      (cutoff) =>
        cutoff.cutoff_type === "EDUCATION" &&
        (cutoff.edu_years_min === null || educationYears >= cutoff.edu_years_min) &&
        (cutoff.edu_years_max === null || educationYears <= cutoff.edu_years_max),
    );
    if (education?.threshold !== null && education?.threshold !== undefined) {
      return {
        resultLabel: totalScore <= education.threshold ? "筛查异常" : "筛查未见异常",
        isAbnormal: totalScore <= education.threshold,
      };
    }
  }
  return { resultLabel: null, isAbnormal: null };
}

export function calculateScore(
  config: ScaleConfig,
  answers: SubmittedAnswer[],
  educationYears: number | null,
): ScoreSummary {
  const byItem = new Map(answers.map((answer) => [answer.itemCode, answer]));
  const missingRequired = config.items.filter((item) => {
    const answer = byItem.get(item.code);
    return item.required && (!answer || answer.answerStatus === "unanswered");
  });
  if (missingRequired.length > 0) {
    throw new AuthError(
      400,
      40001,
      `required answers are missing: ${missingRequired.map((item) => item.code).join(", ")}`,
    );
  }

  for (const answer of answers) {
    const item = config.items.find((candidate) => candidate.code === answer.itemCode);
    if (!item) throw new AuthError(400, 40001, `unknown itemCode: ${answer.itemCode}`);
    if (answer.answerStatus && answer.answerStatus !== "answered") continue;
    if (!item.options.some((candidate) => candidate.code === answer.optionCode)) {
      throw new AuthError(400, 40001, `invalid optionCode for ${answer.itemCode}`);
    }
  }

  if (config.scoring.scoringType === "CDR") {
    const domainScores = CDR_DOMAIN_CODES.map((code) => {
      const answer = byItem.get(code)!;
      const item = config.items.find((candidate) => candidate.code === code)!;
      const option = item.options.find((candidate) => candidate.code === answer.optionCode)!;
      return option.score;
    });
    const globalScore = globalCdr(domainScores[0], domainScores.slice(1));
    const sumOfBoxes = Math.round(domainScores.reduce((sum, value) => sum + value, 0) * 10) / 10;
    return {
      totalScore: globalScore,
      maximumScore: config.scoring.scoreMax,
      resultLabel: CDR_LABELS[String(globalScore)] ?? `CDR=${globalScore}`,
      isAbnormal: globalScore > 0,
      scoringStatus: "calculated",
      scoringMethod: `task1-engine:${config.scoring.algorithmSource}`,
      warning: null,
      subScores: Object.fromEntries(CDR_DOMAIN_CODES.map((code, index) => [code, domainScores[index]])),
      cutoffGroup: String(globalScore),
      cutoffValue: globalScore,
      extra: { cdrGlobal: globalScore, cdrSumOfBoxes: sumOfBoxes },
    };
  }

  let totalScore = 0;
  const subScores: Record<string, number> = {};
  for (const answer of answers) {
    const item = config.items.find((candidate) => candidate.code === answer.itemCode)!;
    if (answer.answerStatus && answer.answerStatus !== "answered") continue;
    const option = item.options.find((candidate) => candidate.code === answer.optionCode);
    if (!option) continue;
    totalScore += option.score;
    if (item.domain) subScores[item.domain] = (subScores[item.domain] ?? 0) + option.score;
  }
  const roundedScore = Math.round(totalScore * 100) / 100;
  return {
    totalScore: roundedScore,
    maximumScore: config.scoring.scoreMax,
    ...resultFromCutoffs(roundedScore, config.scoring.cutoffs, educationYears),
    scoringStatus: "calculated",
    scoringMethod: `task1-config:${config.scoring.algorithmSource}`,
    warning: null,
    subScores,
  };
}
