# TS 移植开发记录（任务 2）

> 本文档完整记录「把任务 1 的 Python 评分引擎 1:1 移植为 TypeScript 独立评分包」的
> **开发过程、变动明细、快速启动方式、注意事项**。
> 供后续维护者 / 后端同学 / 评阅者查阅。

---

## 目录

1. [背景与目标](#1-背景与目标)
2. [运行环境](#2-运行环境)
3. [开发过程（时间线）](#3-开发过程时间线)
4. [变动明细（文件级）](#4-变动明细文件级)
5. [关键实现要点与决策](#5-关键实现要点与决策)
6. [快速启动](#6-快速启动)
7. [验证结果](#7-验证结果)
8. [注意事项（完整清单）](#8-注意事项完整清单)

---

## 1. 背景与目标

### 1.1 前置状态

- **任务 1（已完成）**：Python 3.9 + MySQL 评分引擎 `scoring/`，6 量表（SCD-Q9/GDS/FAQ/MMSE/MoCA-B/CDR），
  29 条断言全过（`tests/test_scoring.py` + `tests/test_cdr_algorithm.py`）。
- **后端**：`dementia-screen-system`（TypeScript + PostgreSQL + 腾讯云 CloudBase，**独立仓库**）。
  经逐行核查，其后端 `backend/src/business/scoring.ts`：
  - SUM / ITEMIZED 已能计分；
  - **CDR 是 `pending_task1_engine` 桩**（返回 null 总分，未计分）；
  - EDUCATION 界值 `resultLabel` 被**硬编码**为「筛查异常 / 筛查未见异常」，丢失真实
    `result_label`（如「文盲（0 年）」）；
  - 无 `subScores`（分项得分）、无 CDR-SB。

### 1.2 任务与决策

任务 2 要求把 6 量表评分（**尤其 CDR**）做成后端可调用的能力。经与用户确认，决策如下：

1. **移植到 TypeScript**（与后端同语言，云函数可直接 `import` 纯函数）；
2. **在 `ad-ouc-master` 内独立交付 TS 包**（不侵入后端仓库；后端同学自行接入并替换 CDR 桩）；
3. 交付形式 = **源码目录 + 单元测试 + golden 正确计分样例 + 接口契约文档 + 后端适配器**；
4. **开发过程 / 变动 / 快速启动 / 注意事项完整写入文档**（即本文档）。

### 1.3 目标原则

- **1:1 移植**：算法、界值、GDS 反序、FAQ NA、MMSE/MoCA-B 教育界值、CDR Morris 规则与 Python 完全一致。
- **纯函数、零 I/O、零运行时依赖**：评分不依赖数据库 / 网络 / 框架。
- **单一数据源**：`ts/src/config.ts`（camelCase TS 配置，逐项 1:1 自 `config_data.py`）。
- **跨语言等价**：golden JSON 由已验证 Python 引擎导出，TS 单测深度对拍。

---

## 2. 运行环境

| 项 | 说明 |
|---|---|
| 操作系统 | Windows 11 Home China（PowerShell 5.1） |
| Node.js | v24.11.1（**原生 TypeScript 类型擦除**，无需 ts-node/tsx） |
| 测试 | `node --test`（Node 内置 runner，零 npm 依赖） |
| Python | 3.9+（仅用于生成 golden 样例，非运行时依赖） |
| npm | **无需 `npm install`** |

> Node ≥ 22.6 原生支持「仅可擦除语法」的 `.ts`；因此 TS 代码**禁用** `enum` / `namespace` /
> **参数属性（parameter properties）** 等非可擦除语法（详见 [8. 注意事项](#8-注意事项完整清单)）。

---

## 3. 开发过程（时间线）

1. **需求与现状核查**
   - 读取任务 1 的 `scoring/`（`base.py` / `engine.py` / `config_data.py` / `models.py` /
     `scales/cdr.py`）与两份测试 `tests/test_scoring.py`、`tests/test_cdr_algorithm.py`。
   - 远程只读核查后端 `backend/src/business/scoring.ts` / `types.ts` / `routes.ts`，确认 CDR 为桩、
     EDUCATION 标签硬编码、缺 `subScores`。

2. **技术方案选定**
   - 确认 Node v24.11.1 原生 `.ts` 可跑：先写 `ts/tests/smoke.test.ts` 做 spike 验证
     「Node 原生 TS 类型擦除可用」通过。
   - 确认 `node --test`（**不带参数**）能自动发现 `tests/*.test.ts`；`node --test tests/` 会失败
     （Node 把 `tests/` 当模块路径）。

3. **配置移植**（`ts/src/types.ts` + `config.ts`）
   - 定义 camelCase 配置类型与 `ScoreResult` / `ItemScore`。
   - 逐项移植 6 量表：94 题 / 245 选项 / 13 界值；GDS 反序内化到选项分值；
     FAQ `NA` 项 `score=0, isNa=true`；MMSE/MoCA-B 教育界值照搬；**CDR `cutoffs=[]`**（分级文字在
     `cdr.ts` 的 `CDR_LEVELS`）。

4. **算法移植**（`ts/src/base.ts` + `cdr.ts` + `engine.ts`）
   - `base.ts`：`resolveOption`（编码→文本匹配）、`computeRaw`（累加 + 按 domain 分项）、
     `applyLevelCutoff` / `applyEducationCutoff`。
   - `cdr.ts`：Morris 全分支 + `DOMAIN_CODES` / `MEMORY_CODE` / `CDR_LEVELS` / `isCdrLevel`。
   - `engine.ts`：`score()` 统一入口；`validateRequired` / `requireEducationYears` / `scoreCdr`。

5. **公共导出与适配器**（`ts/src/index.ts` + `ts/adapters/backend.ts`）
   - `index.ts` 导出 `score` / `ALL_SCALES` / `getScale` / `availableScales` / `globalCdr` / 类型。
   - `backend.ts` 桥接 `SubmittedAnswer[]` / `ScoreSummary`，`Error → errorFactory`。

6. **golden 样例生成**（`scripts/export_golden_cases.py`）
   - 用已验证 Python `score()` 跑 29 条用例，snake→camel 映射后写入 `ts/golden/golden-cases.json`。

7. **测试编写**（`ts/tests/` 四个文件）
   - `scoring.test.ts`（1:1 自 `test_scoring.py`）、`cdr.test.ts`（1:1 自 `test_cdr_algorithm.py`）、
     `golden.test.ts`（对拍 JSON）、`backend.test.ts`（走适配器）。

8. **跑测与修复**
   - 首次 `node --test`：唯一失败 `backend.test.ts` —— 测试内的 `AuthError` 用了 TS 参数属性
     `constructor(public code: number, …)`，Node strip-only 模式不支持，改为显式字段声明 + 赋值后通过。
   - 二次运行：**61 个测试全绿**。

9. **文档编写**（`ts/README.md` + `docs/评分接口契约.md` + 本文档）。

---

## 4. 变动明细（文件级）

### 4.1 新增目录 `ts/`

| 文件 | 说明 |
|---|---|
| `ts/package.json` | `{"name":"ad-ouc-scoring-ts","type":"module"}`；`scripts.test = "node --test"` |
| `ts/tsconfig.json` | `strict` + `verbatimModuleSyntax` + `allowImportingTsExtensions` + `noEmit`（对齐 Node 原生 TS） |
| `ts/src/types.ts` | `OptionConfig / ItemConfig / CutoffConfig / ScaleConfig / ItemScore / ScoreResult / ScaleCode / Answers / PatientCtx` |
| `ts/src/config.ts` | 6 量表完整配置（单一数据源），`opt()` / `item()` 便捷构造器，`ALL_SCALES / SCALES / getScale / availableScales` |
| `ts/src/base.ts` | `resolveOption / computeRaw / applyLevelCutoff / applyEducationCutoff` |
| `ts/src/cdr.ts` | `DOMAIN_CODES / MEMORY_CODE / CDR_LEVELS / isCdrLevel / globalCdr`（含 `closest / majority / nearest`） |
| `ts/src/engine.ts` | `score()` 统一入口 + `validateRequired / requireEducationYears / scoreCdr` |
| `ts/src/index.ts` | 公共导出 |
| `ts/adapters/backend.ts` | `SubmittedAnswer / ScoreSummary` 类型 + `answersFromSubmitted / toScoreSummary / calculateScoreForBackend` |
| `ts/tests/scoring.test.ts` | 6 量表计分（约 33 断言） |
| `ts/tests/cdr.test.ts` | Morris 全分支（约 23 断言） |
| `ts/tests/golden.test.ts` | 读 golden JSON 对拍 29 条 |
| `ts/tests/backend.test.ts` | 走适配器 5 断言 |
| `ts/golden/golden-cases.json` | 29 条正确计分样例（Python 引擎导出） |
| `ts/README.md` | 包说明 + 快速启动 + 用法 + I/O 格式 |

### 4.2 新增脚本 `scripts/`

| 文件 | 说明 |
|---|---|
| `scripts/export_golden_cases.py` | 用已验证 Python 引擎重导 `ts/golden/golden-cases.json`（snake→camel） |

### 4.3 新增文档 `docs/`

| 文件 | 说明 |
|---|---|
| `docs/评分接口契约.md` | I/O 契约 + 后端接入 + golden 说明 + 安全注意事项 |
| `docs/TS移植开发记录.md` | 本文档（过程 / 变动 / 快速启动 / 注意事项） |

### 4.4 未改动的既有文件

- `scoring/`、`tests/`、`db/`、`sql/`、`scripts/generate_seed_sql.py`、`scripts/demo.py`、
  `README.md`、`docs/开发说明文档.md` —— **均未改动**（任务 1 成果保持不变）。
- 删除 `ts/tests/smoke.test.ts`（spike 验证用，任务完成后移除）。

---

## 5. 关键实现要点与决策

### 5.1 CDR Morris 算法（`ts/src/cdr.ts`）

- `DOMAIN_CODES` 首个为 `CDR_MEMORY`（主项 M），其余 5 项为次项。
- 分值域 `{0, 0.5, 1, 2, 3}` 均为 IEEE-754 精确表示，直接 `===` 比较（无需 epsilon）。
- `globalCdr(memory, secondaries)` 分支顺序与 Python 完全一致：
  - M=0 → `≥2 个次项 ≥0.5 ? 0.5 : 0`；
  - M=0.5 → `≥3 个次项 ≥1 ? 1 : 0.5`；
  - M≥1 → 3.1（`nEq≥3`）→ 3.2（`1≤nEq≤2 且 nGt≤2 且 nLt≤2`）→
    3.3（`(nGt==3 && nLt==2) || (nGt==2 && nLt==3)`）→ 4.4（`nZero≥3 → 0.5`）→
    4.1（`nGt≥3 || nLt≥3 → majority`）→ 5（`nearest`）。
  - `closest = min by (|v−target|, −v)`：近者优先、并列取较大者（对应 Python `_closest`）。
- 引擎层 `scoreCdr`：`totalScore = globalCdr`、`subScores = 6 域得分`、
  `resultLabel = CDR_LEVELS[total]`、`isAbnormal = total > 0`、
  `extra = { cdrSb, cdrGlobal, domainScores, cdrSbRange:"0-18" }`。

### 5.2 配置单一数据源（`ts/src/config.ts`）

- 逐项 1:1 自 `config_data.py`；GDS 反序已内化到 `option.score`（反序题 `是=0/否=1`）。
- FAQ `NA` 项 `score=0, isNa=true`。
- **CDR `cutoffs=[]`**（分级文字在 `CDR_LEVELS`，不在配置界值）——故 TS 必须**内置 `CDR_LEVELS`**，
  不能依赖配置 cutoffs（这是与后端 fixture 的差异点）。

### 5.3 命名边界

- **TS DTO 用 camelCase**：`totalScore` / `subScores` / `educationYears` / `cdrSb`。
- **题号编码保留 snake_case**：`MMSE_01` / `CDR_MEMORY`（数据标识，非代码风格）。
- DB / JSONB 字段命名由后端持久层负责。

### 5.4 跨语言等价验证

- 由已验证 Python 引擎导出 29 条 golden 样例（字段：`scaleCode / educationYears / answers /
  expected{totalScore/subScores/resultLabel/cutoffGroup/cutoffValue/isAbnormal/extra}`，
  不含 `itemScores` 以免 JSON 过长）。
- `golden.test.ts` 对 `score()` 输出做 `deepStrictEqual`（7 字段），证明移植等价。

### 5.5 后端适配器（`ts/adapters/backend.ts`）

- 自包含（不 import 后端 auth 模块），错误映射通过**注入的 `errorFactory`** 完成，
  后端传 `(msg) => new AuthError(400, 40001, msg)` 即可复用其错误码体系。
- `ScoreSummary` 新增字段（`subScores / cutoffGroup / cutoffValue / extra`）**全部可选**，
  不破坏后端既有必填字段。

---

## 6. 快速启动

```bash
# 仓库根目录 ad-ouc-master/

# （可选）用 Python 引擎重新生成 golden 样例（需 Python 3.9+，scoring/ 已通过测试）
python scripts/export_golden_cases.py

# 运行 TS 测试（Node 24 原生 .ts，零依赖，无需 npm install）
cd ts
node --test
```

预期：**`pass 61, fail 0`**。

> 关键：`node --test` 必须**不带参数**。写成 `node --test tests/` 会报
> `Cannot find module …\ts\tests`（Node 把 `tests/` 当模块路径而非目录/glob）。

---

## 7. 验证结果

| 验证项 | 结果 |
|---|---|
| `cd ts && node --test` | **61 pass / 0 fail** |
| golden 对拍（29 条） | 全通过（`golden.test.ts`） |
| CDR Morris 全分支 | 全通过（`cdr.test.ts`，20 分支 + 3 结构断言） |
| 后端适配器路径 | 全通过（`backend.test.ts`，5 断言） |
| 6 量表计分 | 全通过（`scoring.test.ts`） |

> 61 个断言等价覆盖 Python 的 29 断言 + CDR 20 分支，并额外覆盖后端接入路径。

---

## 8. 注意事项（完整清单）

### 8.1 Node 原生 TS 语法限制（重要）

Node 的「仅类型擦除」模式**不支持**以下语法，编写 `.ts` 时必须规避：

- ❌ `enum`（含 `const enum`）
- ❌ `namespace`
- ❌ **参数属性**（`constructor(public x: number)`）—— 本次曾因此报
  `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX: TypeScript parameter property is not supported in strip-only mode`
- ❌ `import x = require(...)` / `export =`

规避方式：显式声明字段再赋值（如测试中 `AuthError` 的写法）。

### 8.2 导入必须带 `.ts` 扩展名

ESM + Node 原生 TS 下，相对导入需写全扩展名：

```ts
import { score } from "./engine.ts";   // ✔ 带 .ts
import { score } from "./engine";      // ✌ 会报 Cannot find module
```

### 8.3 `node --test` 必须不带参数

见 [6. 快速启动](#6-快速启动)。默认自动发现 `tests/**/*.test.ts`。

### 8.4 教育年限是 MMSE / MoCA-B 的硬性前置

- `patient.educationYears` 必须是**整数 ≥0**；缺省 / null / 非整数 / 负数均抛错。
- 后端需保证 `patient.educationYears` 真实可靠；`education_level` 仅展示、不参与计分。

### 8.5 FAQ NA 的语义

- `optionCode === "NA"` 计 0 分、不计入总分，但**仍记录**到 `itemScores`（`score=0, optionCode="NA"`）。
- 后端落库时需区分「NA」与「作答 0」，避免混淆。

### 8.6 CDR 分数精度

- 分值域 `{0, 0.5, 1, 2, 3}` 均 IEEE-754 精确，用 `===` 直接比较（无需 epsilon）。
- 后端若以 JSONB 存储，注意 `0.5` 不要被序列化为字符串 `"0.5"`。

### 8.7 反序计分已内化，勿重复实现

GDS 反序题（1/5/7/11/13）的「是=0/否=1」已体现在 `config.ts` 选项分值中；
后端 UI 与持久层**不应**再写反向判断，否则双重反序导致错误。

### 8.8 计分唯一入口

- 全系统计分**只走 `score()`**（或适配器 `calculateScoreForBackend`）。
- 后端 `task1-scale-configs.json` 与本包 `config.ts` 同源于 `config_data.py`，
  但**计分必须用本包**，后端 fixture 仅用于 UI / PG 展示，避免两处计分逻辑漂移。

### 8.9 安全约束（沿用后端）

- 不提交 `.env`、数据库密码、云 API 密钥、`data/users.json`、`data/files.json`、
  本地上传文件或真实患者资料。
- 不在密文字段中明文传输身份证号 / 手机号。

