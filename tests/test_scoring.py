"""评分引擎单元测试 —— 覆盖 6 个量表。

运行：``python -m pytest tests/ -v``
"""

from __future__ import annotations

import pytest

from scoring import available_scales, score
from scoring.config_data import get_scale


# ---------------------------------------------------------------------------
# 工具：按配置构造「满分 / 零分」作答
# ---------------------------------------------------------------------------

def max_answers(code: str) -> dict:
    """每个题目取分值最高的选项编码。"""
    return {it.code: max(it.options, key=lambda o: o.score).code
            for it in get_scale(code).items}


# GDS 反向题题号（是=0/否=1）；其余为正向（是=1/否=0）
GDS_REVERSE_NOS = {1, 5, 7, 11, 13}


def gds_answer(no: int, depressed: bool) -> str:
    """返回第 no 题在「是否表达抑郁」下的作答。

    :param depressed: True 表示该题应记 1 分（表达抑郁）的作答
    """
    if no in GDS_REVERSE_NOS:
        return "否" if depressed else "是"   # 反向：答「否」记 1 分
    return "是" if depressed else "否"        # 正向：答「是」记 1 分


# ---------------------------------------------------------------------------
# 入口与公共行为
# ---------------------------------------------------------------------------

def test_available_scales():
    assert set(available_scales()) == {"SCD_Q9", "GDS", "FAQ", "MMSE", "MOCA_B", "CDR"}


def test_unknown_scale_raises():
    with pytest.raises(KeyError):
        score("NOT_A_SCALE", {})


def test_missing_required_answer_raises():
    with pytest.raises(ValueError):
        score("SCD_Q9", {"SCD_Q9_01": "是"})   # 其余必答题缺失


def test_invalid_answer_value_raises():
    with pytest.raises(ValueError):
        score("SCD_Q9", {"SCD_Q9_01": "是", "SCD_Q9_02": "是", "SCD_Q9_03": "是",
                         "SCD_Q9_04": "也许", "SCD_Q9_05": "经常", "SCD_Q9_06": "是",
                         "SCD_Q9_07": "经常", "SCD_Q9_08": "是", "SCD_Q9_09": "是"})


# ---------------------------------------------------------------------------
# SCD-Q9（累加，0~9）
# ---------------------------------------------------------------------------

def test_scd_q9_max():
    r = score("SCD_Q9", max_answers("SCD_Q9"))
    assert r.total_score == 9.0


def test_scd_q9_zero():
    ans = {}
    for it in get_scale("SCD_Q9").items:
        ans[it.code] = "从未" if it.no in (4, 5, 7) else "否"
    r = score("SCD_Q9", ans)
    assert r.total_score == 0.0


def test_scd_q9_frequency_half_point():
    ans = {it.code: ("从未" if it.no in (4, 5, 7) else "否")
           for it in get_scale("SCD_Q9").items}
    ans["SCD_Q9_04"] = "偶尔"   # 频率题「偶尔」= 0.5
    r = score("SCD_Q9", ans)
    assert r.total_score == 0.5


# ---------------------------------------------------------------------------
# GDS（累加，0~15，含反序计分）
# ---------------------------------------------------------------------------

def test_gds_zero():
    ans = {f"GDS_{n:02d}": gds_answer(n, False) for n in range(1, 16)}
    r = score("GDS", ans)
    assert r.total_score == 0.0
    assert r.result_label == "正常"
    assert r.is_abnormal is False


def test_gds_full():
    ans = {f"GDS_{n:02d}": gds_answer(n, True) for n in range(1, 16)}
    r = score("GDS", ans)
    assert r.total_score == 15.0
    assert r.result_label == "重度抑郁"
    assert r.is_abnormal is True


def test_gds_reverse_scoring_isolated():
    """反序题答「否」应记 1 分，正向题答「否」应记 0 分。"""
    ans = {f"GDS_{n:02d}": "否" for n in range(1, 16)}
    r = score("GDS", ans)
    # 5 道反序题各 1 分，其余 10 道正序题 0 分 → 5 分
    assert r.total_score == 5.0
    assert r.result_label == "轻度抑郁"


@pytest.mark.parametrize("n_depressed,label,abnormal", [
    (4, "正常", False),
    (5, "轻度抑郁", False),
    (9, "中度抑郁", False),
    (12, "重度抑郁", True),
])
def test_gds_levels(n_depressed, label, abnormal):
    ans = {f"GDS_{n:02d}": gds_answer(n, n <= n_depressed) for n in range(1, 16)}
    r = score("GDS", ans)
    assert r.total_score == float(n_depressed)
    assert r.result_label == label
    assert r.is_abnormal is abnormal


# ---------------------------------------------------------------------------
# FAQ（累加，0~30，0~3 四级 + NA 跳过）
# ---------------------------------------------------------------------------

def test_faq_max():
    ans = {f"FAQ_{i:02d}": "3" for i in range(1, 11)}
    r = score("FAQ", ans)
    assert r.total_score == 30.0
    assert r.result_label == "MCI（轻度认知损害）"
    assert r.is_abnormal is True


def test_faq_na_skipped():
    ans = {f"FAQ_{i:02d}": "0" for i in range(1, 11)}
    ans["FAQ_01"] = "NA"   # 不适用 → 不计分
    ans["FAQ_02"] = "NA"
    ans["FAQ_03"] = "1"
    r = score("FAQ", ans)
    assert r.total_score == 1.0   # NA 项不计入总分
    # NA 项仍被记录（score=0、option_code=NA），但不影响总分
    by_code = {s.item_code: s for s in r.item_scores}
    assert by_code["FAQ_01"].option_code == "NA"
    assert by_code["FAQ_01"].score == 0.0
    assert by_code["FAQ_03"].score == 1.0


# ---------------------------------------------------------------------------
# MMSE（分项计分，0~30，教育界值）
# ---------------------------------------------------------------------------

def test_mmse_full_score_and_sub_scores():
    r = score("MMSE", max_answers("MMSE"), patient={"education_years": 9})
    assert r.total_score == 30.0
    assert r.result_label == "中学及以上（>6 年）"
    assert r.cutoff_value == 24.0
    assert r.is_abnormal is False
    assert r.sub_scores["时间定向"] == 5.0
    assert r.sub_scores["视空间"] == 1.0
    assert sum(r.sub_scores.values()) == 30.0
    assert len(r.item_scores) == 30


@pytest.mark.parametrize("years,label,threshold", [
    (0, "文盲（0 年）", 17.0),
    (3, "小学（1-6 年）", 20.0),
    (6, "小学（1-6 年）", 20.0),
    (7, "中学及以上（>6 年）", 24.0),
    (16, "中学及以上（>6 年）", 24.0),
])
def test_mmse_education_matching(years, label, threshold):
    r = score("MMSE", max_answers("MMSE"), patient={"education_years": years})
    assert r.result_label == label
    assert r.cutoff_value == threshold
    assert r.is_abnormal is False   # 满分 30 > 任何界值


def test_mmse_abnormal_at_threshold():
    """总分 == 界值 → 判异常（≤ 界值判异常）。"""
    ans = max_answers("MMSE")
    for code in ["MMSE_01", "MMSE_02", "MMSE_03", "MMSE_04", "MMSE_05", "MMSE_06"]:
        ans[code] = "0"
    r = score("MMSE", ans, patient={"education_years": 9})
    assert r.total_score == 24.0
    assert r.is_abnormal is True


def test_mmse_requires_education():
    with pytest.raises(ValueError):
        score("MMSE", max_answers("MMSE"))


# ---------------------------------------------------------------------------
# MoCA-B（分项计分，0~30，教育界值）
# ---------------------------------------------------------------------------

def test_moca_b_full():
    r = score("MOCA_B", max_answers("MOCA_B"), patient={"education_years": 16})
    assert r.total_score == 30.0
    assert r.result_label == "大学（>12 年）"
    assert r.cutoff_value == 24.0
    assert r.is_abnormal is False


@pytest.mark.parametrize("years,label,threshold", [
    (0, "文盲/小学（≤6 年）", 19.0),
    (6, "文盲/小学（≤6 年）", 19.0),
    (7, "中学（7-12 年）", 22.0),
    (12, "中学（7-12 年）", 22.0),
    (13, "大学（>12 年）", 24.0),
])
def test_moca_b_education_matching(years, label, threshold):
    r = score("MOCA_B", max_answers("MOCA_B"), patient={"education_years": years})
    assert r.result_label == label
    assert r.cutoff_value == threshold


# ---------------------------------------------------------------------------
# CDR（复杂评分，经统一入口）
# ---------------------------------------------------------------------------

CDR_ZERO = {"CDR_MEMORY": "0", "CDR_ORIENTATION": "0", "CDR_JUDGMENT": "0",
            "CDR_COMMUNITY": "0", "CDR_HOME": "0", "CDR_PERSONAL_CARE": "0"}


def test_cdr_zero_via_engine():
    r = score("CDR", CDR_ZERO)
    assert r.total_score == 0.0
    assert r.result_label == "无痴呆（CDR=0）"
    assert r.is_abnormal is False
    assert r.extra["cdr_sb"] == 0.0


def test_cdr_one_via_engine():
    ans = dict(CDR_ZERO)
    ans.update({"CDR_MEMORY": "1", "CDR_ORIENTATION": "1",
                "CDR_JUDGMENT": "1", "CDR_COMMUNITY": "1"})
    r = score("CDR", ans)
    assert r.total_score == 1.0
    assert r.result_label == "轻度痴呆（CDR=1）"
    assert r.is_abnormal is True
    assert r.extra["cdr_sb"] == 4.0


def test_cdr_point_five_via_engine():
    ans = dict(CDR_ZERO)
    ans["CDR_MEMORY"] = "0.5"
    r = score("CDR", ans)
    assert r.total_score == 0.5
    assert r.result_label == "可疑痴呆（CDR=0.5）"
    assert r.is_abnormal is True
