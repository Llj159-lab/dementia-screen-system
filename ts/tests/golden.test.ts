// 跨语言一致性对拍：读取由已验证 Python 引擎导出的 golden 样例，
// 对 score() 输出的 7 个字段做深度断言，证明 TS 移植与 Python 等价。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { score } from "../src/index.ts";

interface GoldenCase {
  scaleCode: string;
  educationYears: number | null;
  answers: Record<string, string | number>;
  expected: {
    totalScore: number;
    subScores: Record<string, number>;
    resultLabel: string;
    cutoffGroup: string | null;
    cutoffValue: number | null;
    isAbnormal: boolean | null;
    extra: Record<string, unknown>;
  };
}

const goldenPath = join(dirname(fileURLToPath(import.meta.url)), "..", "golden", "golden-cases.json");
const cases = JSON.parse(readFileSync(goldenPath, "utf-8")) as GoldenCase[];

for (const c of cases) {
  test(`${c.scaleCode} golden 对拍 (edu=${c.educationYears ?? "—"})`, () => {
    const patient = c.educationYears === null ? undefined : { educationYears: c.educationYears };
    const r = score(c.scaleCode, c.answers, patient);
    assert.strictEqual(r.totalScore, c.expected.totalScore);
    assert.deepStrictEqual(r.subScores, c.expected.subScores);
    assert.strictEqual(r.resultLabel, c.expected.resultLabel);
    assert.strictEqual(r.cutoffGroup, c.expected.cutoffGroup);
    assert.strictEqual(r.cutoffValue, c.expected.cutoffValue);
    assert.strictEqual(r.isAbnormal, c.expected.isAbnormal);
    assert.deepStrictEqual(r.extra, c.expected.extra);
  });
}

test("golden 样例非空", () => {
  assert.ok(cases.length > 0);
});
