// 评分引擎单元测试 —— 覆盖 6 个量表（1:1 移植自 tests/test_scoring.py）。

import { test } from "node:test";
import assert from "node:assert/strict";

import { availableScales, getScale, score } from "../src/index.ts";

// ---------------------------------------------------------------------------
// 工具：按配置构造「满分 / 零分」作答
// ---------------------------------------------------------------------------

function maxAnswers(code: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const it of getScale(code).items) {
    let best = it.options[0];
    for (const o of it.options) if (o.score > best.score) best = o;
    out[it.code] = best.code;
  }
  return out;
}

// GDS 反向题题号（是=0/否=1）；其余为正向（是=1/否=0）
const GDS_REVERSE_NOS = new Set([1, 5, 7, 11, 13]);

function gdsAnswer(no: number, depressed: boolean): string {
  if (GDS_REVERSE_NOS.has(no)) return depressed ? "否" : "是";
  return depressed ? "是" : "否";
}

function gdsAnswers(nDepressed: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (let n = 1; n <= 15; n++) {
    out[`GDS_${String(n).padStart(2, "0")}`] = gdsAnswer(n, n <= nDepressed);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 入口与公共行为
// ---------------------------------------------------------------------------

test("availableScales 返回 6 个量表", () => {
  assert.deepStrictEqual(new Set(availableScales()), new Set(["SCD_Q9", "GDS", "FAQ", "MMSE", "MOCA_B", "CDR"]));
});

test("未知量表编码抛错", () => {
  assert.throws(() => score("NOT_A_SCALE", {}));
});

test("缺必答题抛错", () => {
  assert.throws(() => score("SCD_Q9", { SCD_Q9_01: "是" }));
});

test("非法作答值抛错", () => {
  assert.throws(() =>
    score("SCD_Q9", {
      SCD_Q9_01: "是", SCD_Q9_02: "是", SCD_Q9_03: "是",
      SCD_Q9_04: "也许", SCD_Q9_05: "经常", SCD_Q9_06: "是",
      SCD_Q9_07: "经常", SCD_Q9_08: "是", SCD_Q9_09: "是",
    }),
  );
});

// ---------------------------------------------------------------------------
// SCD-Q9（累加，0~9）
// ---------------------------------------------------------------------------

test("SCD-Q9 满分 9 分", () => {
  const r = score("SCD_Q9", maxAnswers("SCD_Q9"));
  assert.strictEqual(r.totalScore, 9.0);
});

test("SCD-Q9 零分", () => {
  const ans: Record<string, string> = {};
  for (const it of getScale("SCD_Q9").items) {
    ans[it.code] = [4, 5, 7].includes(it.no) ? "从未" : "否";
  }
  const r = score("SCD_Q9", ans);
  assert.strictEqual(r.totalScore, 0.0);
});

test("SCD-Q9 频率题「偶尔」= 0.5", () => {
  const ans: Record<string, string> = {};
  for (const it of getScale("SCD_Q9").items) {
    ans[it.code] = [4, 5, 7].includes(it.no) ? "从未" : "否";
  }
  ans["SCD_Q9_04"] = "偶尔";
  const r = score("SCD_Q9", ans);
  assert.strictEqual(r.totalScore, 0.5);
});

// ---------------------------------------------------------------------------
// GDS（累加，0~15，含反序计分）
// ---------------------------------------------------------------------------

test("GDS 零分", () => {
  const r = score("GDS", gdsAnswers(0));
  assert.strictEqual(r.totalScore, 0.0);
  assert.strictEqual(r.resultLabel, "正常");
  assert.strictEqual(r.isAbnormal, false);
});

test("GDS 满分 15", () => {
  const r = score("GDS", gdsAnswers(15));
  assert.strictEqual(r.totalScore, 15.0);
  assert.strictEqual(r.resultLabel, "重度抑郁");
  assert.strictEqual(r.isAbnormal, true);
});

test("GDS 反序题隔离验证（全答否 = 5 分）", () => {
  const ans: Record<string, string> = {};
  for (let n = 1; n <= 15; n++) ans[`GDS_${String(n).padStart(2, "0")}`] = "否";
  const r = score("GDS", ans);
  assert.strictEqual(r.totalScore, 5.0);
  assert.strictEqual(r.resultLabel, "轻度抑郁");
});

test("GDS 分级（4/5/9/12 分）", () => {
  const cases: Array<[number, string, boolean]> = [
    [4, "正常", false],
    [5, "轻度抑郁", false],
    [9, "中度抑郁", false],
    [12, "重度抑郁", true],
  ];
  for (const [nDepressed, label, abnormal] of cases) {
    const r = score("GDS", gdsAnswers(nDepressed));
    assert.strictEqual(r.totalScore, nDepressed);
    assert.strictEqual(r.resultLabel, label);
    assert.strictEqual(r.isAbnormal, abnormal);
  }
});

// ---------------------------------------------------------------------------
// FAQ（累加，0~30，0~3 四级 + NA 跳过）
// ---------------------------------------------------------------------------

test("FAQ 满分 30", () => {
  const ans: Record<string, string> = {};
  for (let i = 1; i <= 10; i++) ans[`FAQ_${String(i).padStart(2, "0")}`] = "3";
  const r = score("FAQ", ans);
  assert.strictEqual(r.totalScore, 30.0);
  assert.strictEqual(r.resultLabel, "MCI（轻度认知损害）");
  assert.strictEqual(r.isAbnormal, true);
});

test("FAQ NA 项跳过", () => {
  const ans: Record<string, string> = {};
  for (let i = 1; i <= 10; i++) ans[`FAQ_${String(i).padStart(2, "0")}`] = "0";
  ans["FAQ_01"] = "NA";
  ans["FAQ_02"] = "NA";
  ans["FAQ_03"] = "1";
  const r = score("FAQ", ans);
  assert.strictEqual(r.totalScore, 1.0);
  const byCode: Record<string, { optionCode: string | null; score: number }> = {};
  for (const s of r.itemScores) byCode[s.itemCode] = s;
  assert.strictEqual(byCode["FAQ_01"].optionCode, "NA");
  assert.strictEqual(byCode["FAQ_01"].score, 0.0);
  assert.strictEqual(byCode["FAQ_03"].score, 1.0);
});

// ---------------------------------------------------------------------------
// MMSE（分项计分，0~30，教育界值）
// ---------------------------------------------------------------------------

test("MMSE 满分与分项", () => {
  const r = score("MMSE", maxAnswers("MMSE"), { educationYears: 9 });
  assert.strictEqual(r.totalScore, 30.0);
  assert.strictEqual(r.resultLabel, "中学及以上（>6 年）");
  assert.strictEqual(r.cutoffValue, 24.0);
  assert.strictEqual(r.isAbnormal, false);
  assert.strictEqual(r.subScores["时间定向"], 5.0);
  assert.strictEqual(r.subScores["视空间"], 1.0);
  assert.strictEqual(Object.values(r.subScores).reduce((a, b) => a + b, 0), 30.0);
  assert.strictEqual(r.itemScores.length, 30);
});

test("MMSE 教育界值匹配", () => {
  const cases: Array<[number, string, number]> = [
    [0, "文盲（0 年）", 17.0],
    [3, "小学（1-6 年）", 20.0],
    [6, "小学（1-6 年）", 20.0],
    [7, "中学及以上（>6 年）", 24.0],
    [16, "中学及以上（>6 年）", 24.0],
  ];
  for (const [years, label, threshold] of cases) {
    const r = score("MMSE", maxAnswers("MMSE"), { educationYears: years });
    assert.strictEqual(r.resultLabel, label);
    assert.strictEqual(r.cutoffValue, threshold);
    assert.strictEqual(r.isAbnormal, false);
  }
});

test("MMSE 总分 == 界值判异常", () => {
  const ans = maxAnswers("MMSE");
  for (const code of ["MMSE_01", "MMSE_02", "MMSE_03", "MMSE_04", "MMSE_05", "MMSE_06"]) {
    ans[code] = "0";
  }
  const r = score("MMSE", ans, { educationYears: 9 });
  assert.strictEqual(r.totalScore, 24.0);
  assert.strictEqual(r.isAbnormal, true);
});

test("MMSE 缺教育年限抛错", () => {
  assert.throws(() => score("MMSE", maxAnswers("MMSE")));
});

// ---------------------------------------------------------------------------
// MoCA-B（分项计分，0~30，教育界值）
// ---------------------------------------------------------------------------

test("MoCA-B 满分", () => {
  const r = score("MOCA_B", maxAnswers("MOCA_B"), { educationYears: 16 });
  assert.strictEqual(r.totalScore, 30.0);
  assert.strictEqual(r.resultLabel, "大学（>12 年）");
  assert.strictEqual(r.cutoffValue, 24.0);
  assert.strictEqual(r.isAbnormal, false);
});

test("MoCA-B 教育界值匹配", () => {
  const cases: Array<[number, string, number]> = [
    [0, "文盲/小学（≤6 年）", 19.0],
    [6, "文盲/小学（≤6 年）", 19.0],
    [7, "中学（7-12 年）", 22.0],
    [12, "中学（7-12 年）", 22.0],
    [13, "大学（>12 年）", 24.0],
  ];
  for (const [years, label, threshold] of cases) {
    const r = score("MOCA_B", maxAnswers("MOCA_B"), { educationYears: years });
    assert.strictEqual(r.resultLabel, label);
    assert.strictEqual(r.cutoffValue, threshold);
  }
});

// ---------------------------------------------------------------------------
// CDR（复杂评分，经统一入口）
// ---------------------------------------------------------------------------

const CDR_ZERO: Record<string, string> = {
  CDR_MEMORY: "0", CDR_ORIENTATION: "0", CDR_JUDGMENT: "0",
  CDR_COMMUNITY: "0", CDR_HOME: "0", CDR_PERSONAL_CARE: "0",
};

test("CDR 零分", () => {
  const r = score("CDR", CDR_ZERO);
  assert.strictEqual(r.totalScore, 0.0);
  assert.strictEqual(r.resultLabel, "无痴呆（CDR=0）");
  assert.strictEqual(r.isAbnormal, false);
  assert.strictEqual(r.extra.cdrSb, 0.0);
});

test("CDR=1", () => {
  const ans = { ...CDR_ZERO };
  Object.assign(ans, { CDR_MEMORY: "1", CDR_ORIENTATION: "1", CDR_JUDGMENT: "1", CDR_COMMUNITY: "1" });
  const r = score("CDR", ans);
  assert.strictEqual(r.totalScore, 1.0);
  assert.strictEqual(r.resultLabel, "轻度痴呆（CDR=1）");
  assert.strictEqual(r.isAbnormal, true);
  assert.strictEqual(r.extra.cdrSb, 4.0);
});

test("CDR=0.5", () => {
  const ans = { ...CDR_ZERO };
  ans["CDR_MEMORY"] = "0.5";
  const r = score("CDR", ans);
  assert.strictEqual(r.totalScore, 0.5);
  assert.strictEqual(r.resultLabel, "可疑痴呆（CDR=0.5）");
  assert.strictEqual(r.isAbnormal, true);
});
