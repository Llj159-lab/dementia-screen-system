// CDR 复杂评分算法专项测试 —— 覆盖 Morris(1993) 全部判定分支
// （1:1 移植自 tests/test_cdr_algorithm.py）。

import { test } from "node:test";
import assert from "node:assert/strict";

import { DOMAIN_CODES, globalCdr, MEMORY_CODE } from "../src/index.ts";
import { score } from "../src/index.ts";

test("globalCdr 全分支", () => {
  const cases: Array<[number, number[], number]> = [
    // ---- M = 0：≥2 个次要项 ≥0.5 → 0.5，否则 0 ----
    [0.0, [0.0, 0.0, 0.0, 0.0, 0.0], 0.0],
    [0.0, [0.5, 0.0, 0.0, 0.0, 0.0], 0.0], // 仅 1 个 ≥0.5
    [0.0, [0.5, 0.5, 0.0, 0.0, 0.0], 0.5], // 2 个 ≥0.5
    [0.0, [1.0, 0.5, 0.0, 0.0, 0.0], 0.5], // 2 个 ≥0.5

    // ---- M = 0.5：≥3 个次要项 ≥1 → 1，否则 0.5 ----
    [0.5, [0.0, 0.0, 0.0, 0.0, 0.0], 0.5],
    [0.5, [1.0, 1.0, 0.0, 0.0, 0.0], 0.5], // 2 个 ≥1
    [0.5, [1.0, 1.0, 1.0, 0.0, 0.0], 1.0], // 3 个 ≥1
    [0.5, [0.5, 0.5, 0.5, 0.0, 0.0], 0.5], // 0 个 ≥1

    // ---- M ≥ 1：3.1 至少 3 个次要项 = M → CDR = M ----
    [1.0, [1.0, 1.0, 1.0, 0.0, 0.0], 1.0],
    [2.0, [2.0, 2.0, 2.0, 1.0, 0.0], 2.0],

    // ---- M ≥ 1：3.2 仅 1-2 个 = M 且两侧各不多于 2 个 → CDR = M ----
    [1.0, [1.0, 1.0, 2.0, 0.5, 0.5], 1.0], // 2 个 =M，gt=1 / lt=2
    [1.0, [1.0, 2.0, 2.0, 0.5, 0.5], 1.0], // 1 个 =M，gt=2 / lt=2

    // ---- M ≥ 1：3.3 3 个在一侧、2 个在另一侧 → CDR = M ----
    [1.0, [2.0, 2.0, 2.0, 0.5, 0.5], 1.0], // gt=3 / lt=2
    [2.0, [3.0, 3.0, 3.0, 1.0, 1.0], 2.0], // gt=3 / lt=2
    [2.0, [3.0, 3.0, 1.0, 1.0, 1.0], 2.0], // gt=2 / lt=3

    // ---- M ≥ 1：4.4 至少 3 个次要项 = 0 → CDR = 0.5 ----
    [1.0, [0.0, 0.0, 0.0, 0.5, 0.5], 0.5],
    [1.0, [1.0, 0.0, 0.0, 0.0, 0.0], 0.5], // 1 个 =M 但 lt=4，仍取 0.5

    // ---- M ≥ 1：4.1 至少 3 个次要项 > 或 < M → 取多数（并列取近 M 者）----
    [1.0, [2.0, 2.0, 2.0, 2.0, 0.5], 2.0], // 多数 2
    [2.0, [0.5, 0.5, 0.5, 0.5, 0.0], 0.5], // 多数 0.5
    // PDF 示例：M=3，次要 [3,2,2,1,1]（众数 2 与 1 并列，取近 M=3 的 2）
    [3.0, [3.0, 2.0, 2.0, 1.0, 1.0], 2.0],
  ];
  for (const [memory, secondaries, expected] of cases) {
    assert.strictEqual(globalCdr(memory, secondaries), expected);
  }
});

test("globalCdr 要求 5 个次要项", () => {
  assert.throws(() => globalCdr(1.0, [1.0, 1.0]));
});

test("记忆力为主要项目且为首个功能域", () => {
  assert.strictEqual(DOMAIN_CODES[0], "CDR_MEMORY");
  assert.strictEqual(MEMORY_CODE, "CDR_MEMORY");
  assert.strictEqual(DOMAIN_CODES.length, 6);
});

test("CDR-SB = 6 个功能域得分之和", () => {
  const ans = {
    CDR_MEMORY: "2", CDR_ORIENTATION: "1", CDR_JUDGMENT: "1",
    CDR_COMMUNITY: "0.5", CDR_HOME: "1", CDR_PERSONAL_CARE: "0.5",
  };
  const r = score("CDR", ans);
  assert.strictEqual(r.extra.cdrSb, 6.0);
  // 整体 CDR：M=2，次要 [1,1,0.5,1,0.5]，3 个 =1 → 1.0
  assert.strictEqual(r.totalScore, 1.0);
});
