"""CDR 复杂评分算法专项测试 —— 覆盖 Morris(1993) 全部判定分支。

依据 `5.CDR.pdf` 的规则：记忆力(M)为主要项目，其余 5 个功能域为次要项目。
每个用例为 (memory, secondaries) → 期望整体 CDR。
"""

from __future__ import annotations

import pytest

from scoring.scales.cdr import DOMAIN_CODES, MEMORY_CODE, global_cdr


@pytest.mark.parametrize("memory,secondaries,expected", [
    # ---- M = 0：≥2 个次要项 ≥0.5 → 0.5，否则 0 ----
    (0.0, [0.0, 0.0, 0.0, 0.0, 0.0], 0.0),
    (0.0, [0.5, 0.0, 0.0, 0.0, 0.0], 0.0),      # 仅 1 个 ≥0.5
    (0.0, [0.5, 0.5, 0.0, 0.0, 0.0], 0.5),      # 2 个 ≥0.5
    (0.0, [1.0, 0.5, 0.0, 0.0, 0.0], 0.5),      # 2 个 ≥0.5

    # ---- M = 0.5：≥3 个次要项 ≥1 → 1，否则 0.5 ----
    (0.5, [0.0, 0.0, 0.0, 0.0, 0.0], 0.5),
    (0.5, [1.0, 1.0, 0.0, 0.0, 0.0], 0.5),      # 2 个 ≥1
    (0.5, [1.0, 1.0, 1.0, 0.0, 0.0], 1.0),      # 3 个 ≥1
    (0.5, [0.5, 0.5, 0.5, 0.0, 0.0], 0.5),      # 0 个 ≥1

    # ---- M ≥ 1：3.1 至少 3 个次要项 = M → CDR = M ----
    (1.0, [1.0, 1.0, 1.0, 0.0, 0.0], 1.0),
    (2.0, [2.0, 2.0, 2.0, 1.0, 0.0], 2.0),

    # ---- M ≥ 1：3.2 仅 1-2 个 = M 且两侧各不多于 2 个 → CDR = M ----
    (1.0, [1.0, 1.0, 2.0, 0.5, 0.5], 1.0),      # 2 个 =M，gt=1 / lt=2
    (1.0, [1.0, 2.0, 2.0, 0.5, 0.5], 1.0),      # 1 个 =M，gt=2 / lt=2

    # ---- M ≥ 1：3.3 3 个在一侧、2 个在另一侧 → CDR = M ----
    (1.0, [2.0, 2.0, 2.0, 0.5, 0.5], 1.0),      # gt=3 / lt=2
    (2.0, [3.0, 3.0, 3.0, 1.0, 1.0], 2.0),      # gt=3 / lt=2
    (2.0, [3.0, 3.0, 1.0, 1.0, 1.0], 2.0),      # gt=2 / lt=3

    # ---- M ≥ 1：4.4 至少 3 个次要项 = 0 → CDR = 0.5 ----
    (1.0, [0.0, 0.0, 0.0, 0.5, 0.5], 0.5),
    (1.0, [1.0, 0.0, 0.0, 0.0, 0.0], 0.5),      # 1 个 =M 但 lt=4，仍取 0.5

    # ---- M ≥ 1：4.1 至少 3 个次要项 > 或 < M → 取多数（并列取近 M 者）----
    (1.0, [2.0, 2.0, 2.0, 2.0, 0.5], 2.0),      # 多数 2
    (2.0, [0.5, 0.5, 0.5, 0.5, 0.0], 0.5),      # 多数 0.5
    # PDF 示例：M=3，次要 [3,2,2,1,1]（众数 2 与 1 并列，取近 M=3 的 2）
    (3.0, [3.0, 2.0, 2.0, 1.0, 1.0], 2.0),
])
def test_global_cdr_branches(memory, secondaries, expected):
    assert global_cdr(memory, secondaries) == expected


def test_global_cdr_requires_five_secondaries():
    with pytest.raises(ValueError):
        global_cdr(1.0, [1.0, 1.0])


def test_memory_is_first_domain():
    assert DOMAIN_CODES[0] == "CDR_MEMORY"
    assert MEMORY_CODE == "CDR_MEMORY"
    assert len(DOMAIN_CODES) == 6


def test_cdr_sb_sum_of_domains():
    """CDR-SB = 6 个功能域得分之和（0~18）。"""
    from scoring import score
    ans = {"CDR_MEMORY": "2", "CDR_ORIENTATION": "1", "CDR_JUDGMENT": "1",
           "CDR_COMMUNITY": "0.5", "CDR_HOME": "1", "CDR_PERSONAL_CARE": "0.5"}
    r = score("CDR", ans)
    assert r.extra["cdr_sb"] == 6.0
    # 整体 CDR 由算法得出：M=2，次要 [1,1,0.5,1,0.5]，3 个 =1 → 1.0
    assert r.total_score == 1.0
