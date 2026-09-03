# 认知评估量表评分系统

基于 6 份 PDF 量表原始资料构建的**认知障碍评估量表数据库 + 评分引擎**。

对 6 个常用量表（SCD-Q9、GDS-15、FAQ、MMSE、MoCA-B、CDR）进行标准化配置与统一计分，
做到**数据在库、逻辑在码、计分逻辑唯一**。

## 特性

- ✅ **5 张核心表 + 3 张支撑表**（MySQL 8.0，utf8mb4，InnoDB），含索引、外键、注释
- ✅ **6 个量表完整评分算法**：累加（含反序、NA）、分项 + 教育界值、CDR 复杂（Morris 全规则）
- ✅ **单一数据源**：`config_data.py` 同时驱动评分引擎与数据库种子数据
- ✅ **统一计分入口** `score()`，全系统计分逻辑唯一、准确
- ✅ 单元测试 + 演示脚本 + 完整开发文档

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 离线评分（无需数据库）
python scripts/demo.py

# 3. 建库建表 + 种子数据（可选）
mysql -u root -p < sql/01_schema.sql
mysql -u root -p ad_cognition < sql/02_seed_data.sql

# 4. 运行测试
python -m pytest tests/ -v
```

## 最小示例

```python
from scoring import score

# 累加量表
r = score("GDS", {"GDS_01": "是", "GDS_02": "是", "GDS_03": "否",
                  "GDS_04": "否", "GDS_05": "否", "GDS_06": "是",
                  "GDS_07": "否", "GDS_08": "是", "GDS_09": "是",
                  "GDS_10": "是", "GDS_11": "否", "GDS_12": "是",
                  "GDS_13": "否", "GDS_14": "是", "GDS_15": "是"})
print(r.total_score, r.result_label)   # 10.0 中度抑郁

# 分项量表（需受教育年限）
r = score("MMSE", {"MMSE_01": "1", "MMSE_02": "1", "...": "1"},
          patient={"education_years": 9})
print(r.total_score, r.result_label, r.cutoff_value)

# 复杂量表
r = score("CDR", {"CDR_MEMORY": "1", "CDR_ORIENTATION": "1", "CDR_JUDGMENT": "1",
                  "CDR_COMMUNITY": "1", "CDR_HOME": "0", "CDR_PERSONAL_CARE": "0"})
print(r.total_score, r.result_label, r.extra["cdr_sb"])
```

## 目录结构

见 [`docs/开发说明文档.md`](docs/开发说明文档.md)（数据库设计、评分算法、部署步骤）。

```
scoring/   评分引擎（统一入口 score + 6 量表实现）
db/        数据库连接与配置加载
sql/       建表脚本 + 种子数据 + 演示数据
tests/     单元测试（含 CDR Morris 全分支）
scripts/   种子 SQL 生成器 + 演示脚本
docs/      开发说明文档
```

## 支持量表

| 编码 | 量表 | 计分类型 | 满分 |
|---|---|---|---|
| `SCD_Q9` | 主观认知下降自测表 | 累加 | 9 |
| `GDS` | 老年抑郁量表 | 累加（反序） | 15 |
| `FAQ` | 功能活动问卷 | 累加（NA） | 30 |
| `MMSE` | 简明精神状态检查 | 分项 + 教育界值 | 30 |
| `MOCA_B` | MoCA-B 基础量表 | 分项 + 教育界值 | 30 |
| `CDR` | 临床痴呆评定量表 | 复杂（Morris） | 3 / CDR-SB 18 |

## 数据准确性说明

量表题目、选项、分值、界值、指导语均录入自 PDF 原始资料，并以
`scoring/config_data.py` 为唯一权威来源；数据库种子数据由
`scripts/generate_seed_sql.py` 自动生成，保证**库表与代码完全一致**。
