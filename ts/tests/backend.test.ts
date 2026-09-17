// 后端适配器测试 —— 走 ts/adapters/backend.ts 验证后端接入路径。

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  answersFromSubmitted,
  calculateScoreForBackend,
  toScoreSummary,
  type SubmittedAnswer,
} from "../adapters/backend.ts";
import { score } from "../src/index.ts";

const gdsAnswers: SubmittedAnswer[] = [
  { itemCode: "GDS_01", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_02", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_03", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_04", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_05", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_06", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_07", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_08", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_09", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_10", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_11", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_12", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_13", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_14", optionCode: "是", answerStatus: "answered" },
  { itemCode: "GDS_15", optionCode: "是", answerStatus: "answered" },
];

test("answersFromSubmitted 跳过非 answered 与空 optionCode", () => {
  const submitted: SubmittedAnswer[] = [
    { itemCode: "A", optionCode: "x", answerStatus: "answered" },
    { itemCode: "B", optionCode: "y", answerStatus: "unanswered" },
    { itemCode: "C", optionCode: null, answerStatus: "answered" },
    { itemCode: "D", optionCode: "z" },
  ];
  assert.deepStrictEqual(answersFromSubmitted(submitted), { A: "x", D: "z" });
});

test("calculateScoreForBackend 计 GDS 并返回 ScoreSummary", () => {
  const s = calculateScoreForBackend("GDS", gdsAnswers, null);
  // 全答「是」：反序题 5 题各 0 分，正序题 10 题各 1 分 → 10 分
  assert.strictEqual(s.totalScore, 10);
  assert.strictEqual(s.maximumScore, 15);
  assert.strictEqual(s.resultLabel, "中度抑郁");
  assert.strictEqual(s.isAbnormal, false);
  assert.strictEqual(s.scoringStatus, "calculated");
  assert.strictEqual(s.scoringMethod, "task1-engine:GDS");
  assert.strictEqual(s.warning, null);
});

test("calculateScoreForBackend 计 CDR 并返回 extra", () => {
  const cdr: SubmittedAnswer[] = [
    { itemCode: "CDR_MEMORY", optionCode: "0", answerStatus: "answered" },
    { itemCode: "CDR_ORIENTATION", optionCode: "0", answerStatus: "answered" },
    { itemCode: "CDR_JUDGMENT", optionCode: "0", answerStatus: "answered" },
    { itemCode: "CDR_COMMUNITY", optionCode: "0", answerStatus: "answered" },
    { itemCode: "CDR_HOME", optionCode: "0", answerStatus: "answered" },
    { itemCode: "CDR_PERSONAL_CARE", optionCode: "0", answerStatus: "answered" },
  ];
  const s = calculateScoreForBackend("CDR", cdr, null);
  assert.strictEqual(s.totalScore, 0);
  assert.strictEqual(s.maximumScore, 3);
  assert.strictEqual(s.resultLabel, "无痴呆（CDR=0）");
  assert.strictEqual(s.isAbnormal, false);
  assert.deepStrictEqual(s.extra, {
    cdrSb: 0,
    cdrGlobal: 0,
    domainScores: {
      CDR_MEMORY: 0, CDR_ORIENTATION: 0, CDR_JUDGMENT: 0,
      CDR_COMMUNITY: 0, CDR_HOME: 0, CDR_PERSONAL_CARE: 0,
    },
    cdrSbRange: "0-18",
  });
});

test("calculateScoreForBackend 缺教育年限经 errorFactory 包装", () => {
  const mmse = Array.from({ length: 30 }, (_, i) => ({
    itemCode: `MMSE_${String(i + 1).padStart(2, "0")}`,
    optionCode: "1",
    answerStatus: "answered" as const,
  }));
  class AuthError extends Error {
    code: number;
    bizCode: number;
    constructor(code: number, bizCode: number, message: string) {
      super(message);
      this.code = code;
      this.bizCode = bizCode;
    }
  }
  let caught: AuthError | null = null;
  try {
    calculateScoreForBackend("MMSE", mmse, null, (msg) => new AuthError(400, 40001, msg));
  } catch (e) {
    caught = e as AuthError;
  }
  assert.ok(caught instanceof AuthError);
  assert.strictEqual(caught.code, 400);
  assert.strictEqual(caught.bizCode, 40001);
  assert.match(caught.message, /educationYears/);
});

test("toScoreSummary 空 resultLabel 映射为 null", () => {
  const r = score("SCD_Q9", {
    SCD_Q9_01: "否", SCD_Q9_02: "否", SCD_Q9_03: "否",
    SCD_Q9_04: "从未", SCD_Q9_05: "从未", SCD_Q9_06: "否",
    SCD_Q9_07: "从未", SCD_Q9_08: "否", SCD_Q9_09: "否",
  });
  const s = toScoreSummary(r, 9);
  assert.strictEqual(s.totalScore, 0);
  assert.strictEqual(s.maximumScore, 9);
  assert.strictEqual(s.resultLabel, null);
  assert.strictEqual(s.isAbnormal, null);
});
