# 数据库设计

## 来源和边界

五个核心集合对应项目任务划分：

1. `users`
2. `patients`
3. `scale_configs`
4. `assessment_records`
5. `assessment_answers`

后端基础服务额外保留两个服务集合：

6. `files`
7. `operation_logs`

临床资料用于识别字段和原始观察项，不代表后端可以自行编造诊断阈值。评分公式属于评分引擎任务，并需要和算法版本一起保存。

## 关键建模决策

- `assessment_records` 保存一次测评会话。
- `assessment_answers` 保存题目级原始答案和过程观察。
- 原始答案和计算分数分开保存。
- `answerStatus` 支持 `na`、`unknown` 和 `refused`，不能静默转换为 0。
- `value` 对象支持小数值，例如 SCD-Q9 中的 `0.5` 选项。
- `scale_configs` 带版本号，历史测评始终能按当时使用的配置解释。
- CDR 在分数快照中保存六个功能域、`global_cdr` 和 `cdr_sb`，这些是评分引擎输出，不是患者档案字段。
- 文件用元数据和云存储键表示，本地路径不属于接口契约。
- 敏感标识在应用模型中使用密文字段表示，课程版不提交密钥和真实隐私数据。

## 关系

```text
users 1 ─── * assessment_records
patients 1 ─── * assessment_records
scale_configs 1 ─── * assessment_records
assessment_records 1 ─── * assessment_answers
patients 1 ─── * files
assessment_records 1 ─── * files
users 1 ─── * operation_logs
```

这些是应用层关系。PostgreSQL 实现使用关系表保存，同时保留 JSONB 字段承载量表题目、评分规则和扩展元数据。

## 本地校验

```text
npm run db:validate
```

预期输出：

```text
Database schema 7 collections validated.
Core collections: users, patients, scale_configs, assessment_records, assessment_answers
Extensions: files, operation_logs
```

## CloudBase 状态

- CloudBase 环境 ID：`ad-scd-dev-d1g1y08v5962945fd`。
- PostgreSQL 七张业务表已按任务2脚本创建。
- 私有云存储桶：`ad-scd-files`。
- 代码通过 `DATA_DRIVER` 和 `STORAGE_DRIVER` 在本地模式与 CloudBase 模式之间切换。
- `data/users.json`、`data/business.json` 和本地上传目录仅用于本地开发，已被 Git 忽略。

## PostgreSQL 实现

PostgreSQL 迁移脚本位于 `sql/001_init.sql`，会创建上面七个逻辑集合对应的关系表。`profile`、`items`、`scoring`、`value` 和 `metadata` 等 JSON 结构字段使用 PostgreSQL `JSONB`，保证现有版本化模型可以直接落库。
