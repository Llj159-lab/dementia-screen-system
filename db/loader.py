"""从 MySQL 加载量表配置（题目 / 选项 / 分值 / 界值）。

将数据库中的 4 张量表配置表（scale / scale_item / scale_option / scale_cutoff）
反序列化为评分引擎消费的 ``ScaleConfig`` 对象，实现「数据在库、逻辑在码」。

用法::

    from db.loader import load_scale_config
    from scoring.engine import score

    config = load_scale_config("MMSE")
    result = score("MMSE", answers, patient={"education_years": 9}, config=config)

若数据库不可用，可直接使用 ``scoring.config_data`` 内置配置（测试可离线运行）。
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from scoring.models import CutoffConfig, ItemConfig, OptionConfig, ScaleConfig

from .connection import get_connection


def _to_float(v) -> Optional[float]:
    if v is None:
        return None
    return float(v)


def _to_int(v) -> Optional[int]:
    if v is None:
        return None
    return int(v)


def _to_bool(v) -> bool:
    return bool(v)


def load_scale_config(scale_code: str, conn=None) -> ScaleConfig:
    """加载单个量表的完整配置。

    :param scale_code: 量表编码（如 MMSE / GDS / CDR），大小写不敏感
    :param conn: 已建立的 PyMySQL 连接；缺省时新建
    :return: ScaleConfig（含题目、选项、界值）
    """
    code = scale_code.upper()
    own_conn = conn is None
    if own_conn:
        conn = get_connection()
    try:
        with conn.cursor() as cur:
            # 1. 量表元数据
            cur.execute("SELECT * FROM `scale` WHERE `code` = %s", (code,))
            srow = cur.fetchone()
            if srow is None:
                raise KeyError(f"数据库中没有量表编码: {code}")

            # 2. 题目（按 item_no 排序）
            cur.execute(
                "SELECT * FROM `scale_item` WHERE `scale_id` = %s ORDER BY `item_no`",
                (srow["id"],))
            irows = cur.fetchall()

            # 3. 选项（按 sort_order 排序，按 item_id 分组）
            cur.execute(
                "SELECT o.* FROM `scale_option` o "
                "JOIN `scale_item` i ON i.id = o.item_id "
                "WHERE i.scale_id = %s ORDER BY o.item_id, o.sort_order",
                (srow["id"],))
            orows = cur.fetchall()
            opts_by_item: Dict[int, List[OptionConfig]] = {}
            for o in orows:
                opts_by_item.setdefault(o["item_id"], []).append(OptionConfig(
                    code=o["option_code"],
                    text=o["option_text"] or "",
                    score=_to_float(o["score_value"]),
                    is_na=_to_bool(o["is_na"]),
                ))

            # 4. 界值（按 sort_order 排序）
            cur.execute(
                "SELECT * FROM `scale_cutoff` WHERE `scale_id` = %s ORDER BY `sort_order`",
                (srow["id"],))
            crows = cur.fetchall()
    finally:
        if own_conn:
            conn.close()

    items = [
        ItemConfig(
            code=r["item_code"], no=_to_int(r["item_no"]),
            text=r["item_text"], options=opts_by_item.get(r["id"], []),
            domain=r["domain"], max_score=_to_float(r["max_score"]),
            score_method=r["score_method"] or "DIRECT",
            required=_to_bool(r["required"]), remark=r["remark"] or "",
        )
        for r in irows
    ]

    cutoffs = [
        CutoffConfig(
            cutoff_type=r["cutoff_type"], group_key=r["group_key"] or "",
            result_label=r["result_label"] or "", is_abnormal=_to_bool(r["is_abnormal"]),
            edu_years_min=_to_int(r["edu_years_min"]), edu_years_max=_to_int(r["edu_years_max"]),
            min_score=_to_float(r["min_score"]), max_score=_to_float(r["max_score"]),
            threshold=_to_float(r["threshold"]),
        )
        for r in crows
    ]

    return ScaleConfig(
        code=srow["code"], name=srow["name"], full_name=srow["full_name"] or "",
        scoring_type=srow["scoring_type"], score_min=_to_float(srow["score_min"]),
        score_max=_to_float(srow["score_max"]), summary=srow["summary"] or "",
        instruction=srow["instruction"] or "", items=items, cutoffs=cutoffs,
        version=srow["version"] or "1.0", remark=srow["remark"] or "",
    )


def load_all_scales(conn=None) -> Dict[str, ScaleConfig]:
    """加载数据库中的全部量表配置，返回 {code: ScaleConfig}。"""
    own_conn = conn is None
    if own_conn:
        conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT `code` FROM `scale` ORDER BY `id`")
            codes = [r["code"] for r in cur.fetchall()]
    finally:
        if own_conn:
            conn.close()

    # 逐个加载（复用 conn 时避免重复开关连接）
    result: Dict[str, ScaleConfig] = {}
    for code in codes:
        result[code] = load_scale_config(code, conn=conn if not own_conn else None)
    return result
