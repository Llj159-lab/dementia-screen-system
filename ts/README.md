# ad-ouc-scoring-ts —— 6 量表评分引擎（TypeScript 独立包）

任务 2 交付：把已通过 29 条断言的 **Python 评分引擎**（`scoring/`）1:1 移植为
**零依赖、可被 Node 原生运行的 TypeScript 纯函数包**，供后端
`dementia-screen-system`（TypeScript + PostgreSQL + 云函数）直接 `import` 使用，
尤其补齐后端当前缺失的 **CDR 复杂评分** 与 **分项得分（subScores）**。

> 本包**不依赖任何 npm 包**，无需 `npm install`；运行时仅需 Node ≥ 22.6（原生 TypeScript 类型擦除）。
> 本机验证环境：Node v24.11.1。

---

## 1. 目录结构

```
ts/
├── package.json          # {"type":"module"}；scripts.test = "node --test"
├── tsconfig.json         # strict + verbatimModuleSyntax（仅可擦除语法，对齐 Node 原生 TS）
├── src/
│   ├── types.ts          # 配置类型 + ScoreResult / ItemScore（camelCase）
│   ├── config.ts         # 6 量表配置（单一数据源，1:1 自 scoring/config_data.py）
│   ├── base.ts           # resolveOption + SUM 计分 + ITEMIZED 计分（含界值）
│   ├── cdr.ts            # CDR Morris 算法 + CDR_LEVELS + DOMAIN_CODES
│   ├── engine.ts         # score(scaleCode, answers, patient?) → ScoreResult
│   └── index.ts          # 公共导出：score / availableScales / getScale / 类型
├── adapters/
│   └── backend.ts        # 后端桥接：SubmittedAnswer[]↔answers；ScoreResult↔ScoreSummary
├── tests/
│   ├── scoring.test.ts   # 6 量表计分（1:1 自 tests/test_scoring.py）
│   ├── cdr.test.ts       # Morris 全分支（1:1 自 tests/test_cdr_algorithm.py）
│   ├── golden.test.ts    # 读 golden-cases.json 对拍 score()（跨语言等价证明）
│   └── backend.test.ts   # 走 adapters/backend.ts 验证后端接入
└── golden/
    └── golden-cases.json # 正确计分样例（由已验证 Python 引擎导出，权威）
```

配套脚本与文档（在仓库根目录）：

- `scripts/export_golden_cases.py` —— 用已验证 Python 引擎重新导出 golden 样例；
- `docs/评分接口契约.md` —— 输入输出契约 + 后端接入步骤 + golden 样例说明；
- `docs/TS移植开发记录.md` —— 开发过程 / 变动明细 / 快速启动 / 注意事项。

---

## 2. 快速启动（零依赖）

```bash
# 1) （可选）重新生成 golden 样例 —— 需 Python 3.9+ 与已通过测试的 scoring/ 引擎
python scripts/export_golden_cases.py

# 2) 运行全部测试（Node 原生 .ts，无需 npm install）
cd ts
node --test
```

预期输出：**61 个测试全绿**（`pass 61, fail 0`），其中
`golden.test.ts` 对拍全部 29 条 golden 样例、`cdr.test.ts` 覆盖 Morris 全分支。

> 说明：`node --test` 必须**不带参数**运行（自动发现 `tests/*.test.ts`）。
> 若写成 `node --test tests/` 会失败——Node 会把 `tests/` 当作模块路径而非目录。

---

## 3. 用法

```ts
import { score, availableScales } from "./src/index.ts";

// 累加量表（SUM）—— 无需患者信息
const gds = score("GDS", {
  GDS_01: "是", GDS_02: "否", /* …共 15 题 */,
});

// 分项量表（ITEMIZED）—— MMSE / MoCA-B 需 educationYears
const mmse = score("MMSE", { MMSE_01: "1", /* …共 30 题 */ }, { educationYears: 9 });

// 复杂量表（CDR）—— 6 个功能域
const cdr = score("CDR", {
  CDR_MEMORY: "1", CDR_ORIENTATION: "0.5", CDR_JUDGMENT: "1",
  CDR_COMMUNITY: "0", CDR_HOME: "0.5", CDR_PERSONAL_CARE: "0",
});

console.log(gds.totalScore, gds.resultLabel, gds.isAbnormal);
console.log(mmse.subScores);           // { "时间定向": 5, "视空间": 1, … }
console.log(cdr.extra.cdrSb);          // CDR-SB = 6 域得分之和
```

---

## 4. 输入输出格式

### 4.1 入参

```ts
score(scaleCode: string, answers: Answers, patient?: PatientCtx): ScoreResult

type ScaleCode = "SCD_Q9" | "GDS" | "FAQ" | "MMSE" | "MOCA_B" | "CDR";
type Answers  = Record<string, string | number>;  // key = 题目编码（保留 snake）
interface PatientCtx { educationYears?: number; }
```

- `answers` 的 key 为题号编码（**保留 snake_case**：`MMSE_01` / `GDS_05` / `CDR_MEMORY`）；
  value 为选项编码或选项文本（优先按 `code` 匹配、再按 `text` 匹配，`String(v).trim()`）。
- `patient.educationYears`：MMSE / MoCA-B **必需**（缺省抛错）。

### 4.2 出参 `ScoreResult`（camelCase）

```ts
interface ScoreResult {
  scaleCode: string;
  scaleName: string;
  totalScore: number;
  subScores: Record<string, number>;  // 分项得分（SUM 量表为 {}）
  itemScores: ItemScore[];            // 逐题得分
  resultLabel: string;                // 解释：正常/轻度抑郁/CDR=1…（无界值时为 ""）
  cutoffGroup: string | null;         // 界值分组（教育年段键 或 分级带 如 "12-15"）
  cutoffValue: number | null;         // 界值分（EDUCATION=threshold；LEVEL=带上界）
  isAbnormal: boolean | null;         // 是否异常（无界值时为 null）
  extra: Record<string, unknown>;     // CDR: { cdrSb, cdrGlobal, domainScores, cdrSbRange }
}
```

### 4.3 错误行为

| 情况 | 行为 |
|---|---|
| 未知量表编码 | `throw Error` |
| 缺必答题 / 选项无法匹配 | `throw Error`（中文信息） |
| MMSE / MoCA-B 缺 `educationYears` | `throw Error` |
| CDR 功能域缺作答或分值非法 | `throw Error` |

错误信息统一为中文、可读，交由后端适配器映射为业务错误码（见 `docs/评分接口契约.md`）。

---

## 5. 六大量表速查

| 编码 | 计分类型 | 满分 | 界值方式 |
|---|---|---|---|
| `SCD_Q9` | SUM | 9 | 无（`resultLabel=""`） |
| `GDS` | SUM（含反序） | 15 | LEVEL 4 档（12–15 异常） |
| `FAQ` | SUM（含 NA） | 30 | LEVEL 3 档（9–30 异常） |
| `MMSE` | ITEMIZED | 30 | EDUCATION（17/20/24，`≤` 异常） |
| `MOCA_B` | ITEMIZED | 30 | EDUCATION（19/22/24，`≤` 异常） |
| `CDR` | CDR | 3（整体）/ 18（CDR-SB） | Morris 规则（`>0` 异常） |

---

## 6. 命名边界（重要）

- **TS DTO 用 camelCase**：`totalScore` / `subScores` / `educationYears` / `cdrSb`。
- **题号编码保留 snake_case**：`MMSE_01` / `CDR_MEMORY` —— 属数据标识，非代码风格。
- **DB / JSONB 字段命名**由后端持久层负责，与本包无关（本包不落地存储）。

---

## 7. 后端接入

本包**不修改后端仓库**；后端同学按 `docs/评分接口契约.md` 与 `ts/adapters/backend.ts`
接入，替换其 `scoring.ts` 中的 CDR 桩即可。核心入口：

```ts
import { calculateScoreForBackend } from "./adapters/backend.ts";

const summary = calculateScoreForBackend(
  scaleCode, submittedAnswers, educationYears,
  (msg) => new AuthError(400, 40001, msg),  // 复用后端错误码体系
);
```

完整说明见 [`../docs/评分接口契约.md`](../docs/评分接口契约.md)。
