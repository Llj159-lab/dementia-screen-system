import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AuthError } from "../auth/auth.js";
import type { ScoreSummary } from "./types.js";

type ScaleOption = { code: string; text: string; score: number; is_na: boolean };
type ScaleItem = {
  code: string;
  no: number;
  text: string;
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
    const domainScores = answers.map((answer) => {
      const item = config.items.find((candidate) => candidate.code === answer.itemCode)!;
      const option = item.options.find((candidate) => candidate.code === answer.optionCode);
      return option?.score ?? 0;
    });
    const memory = domainScores[0] ?? 0;
    const secondaries = domainScores.slice(1);
    const counts = new Map<number, number>();
    secondaries.forEach((score) => counts.set(score, (counts.get(score) ?? 0) + 1));
    const maxCount = Math.max(...counts.values());
    const majority = [...counts.entries()]
      .filter(([, count]) => count === maxCount)
      .map(([score]) => score)
      .sort((a, b) => Math.abs(a - memory) - Math.abs(b - memory) || b - a)[0] ?? memory;
    let global = memory;
    if (memory === 0) global = secondaries.filter((score) => score >= 0.5).length >= 2 ? 0.5 : 0;
    else if (memory === 0.5) global = secondaries.filter((score) => score >= 1).length >= 3 ? 1 : 0.5;
    else {
      const equal = secondaries.filter((score) => score === memory).length;
      const greater = secondaries.filter((score) => score > memory).length;
      const lower = secondaries.filter((score) => score < memory).length;
      const zeros = secondaries.filter((score) => score === 0).length;
      if (equal >= 3 || (equal >= 1 && greater <= 2 && lower <= 2) || (greater === 3 && lower === 2) || (greater === 2 && lower === 3)) global = memory;
      else if (zeros >= 3) global = 0.5;
      else if (greater >= 3 || lower >= 3) global = majority;
      else global = [...secondaries].sort((a, b) => Math.abs(a - memory) - Math.abs(b - memory) || b - a)[0] ?? memory;
    }
    const summaryScore = Math.round(global * 100) / 100;
    const subScore = Math.round(domainScores.reduce((sum, score) => sum + score, 0) * 100) / 100;
    return {
      totalScore: summaryScore,
      maximumScore: config.scoring.scoreMax,
      resultLabel: `CDR=${summaryScore}，CDR-SB=${subScore}`,
      isAbnormal: summaryScore > 0,
      scoringStatus: "calculated",
      scoringMethod: config.scoring.algorithmSource,
      warning: null,
    };
  }

  let totalScore = 0;
  for (const answer of answers) {
    const item = config.items.find((candidate) => candidate.code === answer.itemCode)!;
    if (answer.answerStatus && answer.answerStatus !== "answered") continue;
    const option = item.options.find((candidate) => candidate.code === answer.optionCode);
    if (!option) continue;
    totalScore += option.score;
  }
  const roundedScore = Math.round(totalScore * 100) / 100;
  return {
    totalScore: roundedScore,
    maximumScore: config.scoring.scoreMax,
    ...resultFromCutoffs(roundedScore, config.scoring.cutoffs, educationYears),
    scoringStatus: "calculated",
    scoringMethod: `task1-config:${config.scoring.algorithmSource}`,
    warning: null,
  };
}
