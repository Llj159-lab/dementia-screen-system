"""由 `scoring/config_data.py`（单一数据源）生成 `sql/02_seed_data.sql`。

保证数据库种子数据与评分引擎内置配置完全一致。
用法：`python scripts/generate_seed_sql.py`
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring.config_data import ALL_SCALES  # noqa: E402

OUT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "sql", "02_seed_data.sql")


def esc(v):
    """SQL 字符串转义。"""
    if v is None:
        return "NULL"
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"


def num(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, int):
        return str(v)
    return repr(float(v))


def main():
    lines = []
    w = lines.append

    w("-- ============================================================================")
    w("-- 认知障碍评估量表评分系统 —— 种子数据（6 个量表配置）")
    w("-- 本文件由 scripts/generate_seed_sql.py 依据 scoring/config_data.py 自动生成。")
    w("-- 数据出处：PDF 量表原始资料（SCD-Q9 / MMSE / GDS / FAQ / MoCA-B / CDR）。")
    w("-- ============================================================================")
    w("SET NAMES utf8mb4;")
    w("START TRANSACTION;")
    w("")

    scale_id = 0
    item_id = 0
    option_id = 0
    cutoff_id = 0

    for s in ALL_SCALES:
        scale_id += 1
        w("-- --------------------------------------------------------------------------")
        w(f"-- 量表：{s.name}（{s.code}）  计分类型：{s.scoring_type}")
        w("-- --------------------------------------------------------------------------")
        w("INSERT INTO `scale` (`id`,`code`,`name`,`full_name`,`version`,`summary`,"
          "`instruction`,`scoring_type`,`score_min`,`score_max`,`remark`) VALUES ("
          f"{scale_id},{esc(s.code)},{esc(s.name)},{esc(s.full_name)},{esc(s.version)},"
          f"{esc(s.summary)},{esc(s.instruction)},{esc(s.scoring_type)},"
          f"{num(s.score_min)},{num(s.score_max)},{esc(s.remark)});")

        for it in s.items:
            item_id += 1
            w("INSERT INTO `scale_item` (`id`,`scale_id`,`item_code`,`item_no`,`domain`,"
              "`item_text`,`item_type`,`score_method`,`max_score`,`required`,`sort_order`,"
              "`remark`) VALUES ("
              f"{item_id},{scale_id},{esc(it.code)},{it.no},{esc(it.domain)},{esc(it.text)},"
              f"{esc('单选')},{esc(it.score_method)},{num(it.max_score)},"
              f"{1 if it.required else 0},{it.no},{esc(it.remark)});")
            for oi, opt in enumerate(it.options):
                option_id += 1
                w("INSERT INTO `scale_option` (`id`,`item_id`,`option_code`,`option_text`,"
                  "`score_value`,`is_na`,`sort_order`) VALUES ("
                  f"{option_id},{item_id},{esc(opt.code)},{esc(opt.text)},"
                  f"{num(opt.score)},{1 if opt.is_na else 0},{oi});")

        for ci, c in enumerate(s.cutoffs):
            cutoff_id += 1
            w("INSERT INTO `scale_cutoff` (`id`,`scale_id`,`cutoff_type`,`group_key`,"
              "`result_label`,`is_abnormal`,`edu_years_min`,`edu_years_max`,`min_score`,"
              "`max_score`,`threshold`,`sort_order`) VALUES ("
              f"{cutoff_id},{scale_id},{esc(c.cutoff_type)},{esc(c.group_key)},"
              f"{esc(c.result_label)},{1 if c.is_abnormal else 0},"
              f"{num(c.edu_years_min)},{num(c.edu_years_max)},{num(c.min_score)},"
              f"{num(c.max_score)},{num(c.threshold)},{ci});")

        w("")

    w("COMMIT;")
    w("")
    w("-- 数据量统计（执行后可核对）：scale 6 行；scale_item 94 行；scale_cutoff 13 行。")

    content = "\n".join(lines) + "\n"
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"已生成 {OUT_PATH}")
    print(f"  量表 {scale_id} 个 / 题目 {item_id} 条 / 选项 {option_id} 条 / 界值 {cutoff_id} 条")


if __name__ == "__main__":
    main()
