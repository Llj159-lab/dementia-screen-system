"""CDR —— 临床痴呆评定量表（复杂评分）。

实现 Morris(1993) CDR 整体评分算法（严格依据 `5.CDR.pdf`）：

6 个功能域各记 0 / 0.5 / 1 / 2 / 3 分，其中「记忆力(M)」为主要项目，
其余 5 项（定向力、判断与解决问题、社会事务、家务与业余爱好、个人自理）为次要项目。

CDR 整体评分规则：
1. M=0：≥2 个次要项 ≥0.5 → CDR=0.5；否则 CDR=0。
2. M=0.5：≥3 个次要项 ≥1 → CDR=1；否则 CDR=0.5（CDR 不能为 0）。
3. M≥1：
   3.1 至少 3 个次要项 =M → CDR=M；
   3.2 仅 1-2 个次要项 =M 且两侧各不多于 2 个 → CDR=M；
   3.3 3 个次要项在 M 一侧、另 2 个在另一侧 → CDR=M；
   4.4 ≥3 个次要项 =0 → CDR=0.5；
   4.1 ≥3 个次要项 >或< M → CDR=大多数次要项分数（并列时取与 M 最接近者）；
   5 就近联合：以上皆不满足 → CDR=与 M 最接近的次要项分数。

CDR-SB = 6 个功能域得分之和（0~18）。
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from ..base import BaseScale
from ..models import ItemScore, ScoreResult

# CDR 6 个功能域编码（顺序即判定顺序，第一个为记忆力主要项目）
DOMAIN_CODES = [
    "CDR_MEMORY", "CDR_ORIENTATION", "CDR_JUDGMENT",
    "CDR_COMMUNITY", "CDR_HOME", "CDR_PERSONAL_CARE",
]
MEMORY_CODE = "CDR_MEMORY"

# 整体 CDR 分级解释
CDR_LEVELS = {
    0.0: "无痴呆（CDR=0）",
    0.5: "可疑痴呆（CDR=0.5）",
    1.0: "轻度痴呆（CDR=1）",
    2.0: "中度痴呆（CDR=2）",
    3.0: "重度痴呆（CDR=3）",
}

_VALID_SCORES = (0.0, 0.5, 1.0, 2.0, 3.0)


def global_cdr(memory: float, secondaries: List[float]) -> float:
    """Morris(1993) CDR 整体评分算法。

    :param memory: 记忆力(M)得分，取值 {0, 0.5, 1, 2, 3}
    :param secondaries: 其余 5 个功能域得分列表
    :return: 整体 CDR（0 / 0.5 / 1 / 2 / 3）
    """
    if len(secondaries) != 5:
        raise ValueError(f"CDR 次要项目必须为 5 个，得到 {len(secondaries)} 个")
    s = list(secondaries)

    if memory == 0.0:
        return 0.5 if sum(1 for x in s if x >= 0.5) >= 2 else 0.0

    if memory == 0.5:
        return 1.0 if sum(1 for x in s if x >= 1.0) >= 3 else 0.5

    # memory >= 1.0
    n_eq = sum(1 for x in s if x == memory)
    n_gt = sum(1 for x in s if x > memory)
    n_lt = sum(1 for x in s if x < memory)
    n_zero = sum(1 for x in s if x == 0.0)

    # 3.1 至少 3 个次要项 =M
    if n_eq >= 3:
        return memory
    # 3.2 仅 1-2 个次要项 =M 且两侧各不多于 2 个
    if 1 <= n_eq <= 2 and n_gt <= 2 and n_lt <= 2:
        return memory
    # 3.3 3 个次要项在 M 一侧、另 2 个在另一侧
    if (n_gt == 3 and n_lt == 2) or (n_gt == 2 and n_lt == 3):
        return memory
    # 4.4 M≥1 且 ≥3 个次要项 =0
    if n_zero >= 3:
        return 0.5
    # 4.1 ≥3 个次要项 >或< M → 大多数（并列取与 M 最接近者）
    if n_gt >= 3 or n_lt >= 3:
        return _majority(s, memory)
    # 5 就近联合
    return _nearest(s, memory)


def _majority(s: List[float], memory: float) -> float:
    """次要项目众数，并列时取与 memory 最接近者（仍并列取较大者）。"""
    from collections import Counter
    counter = Counter(s)
    max_count = max(counter.values())
    candidates = [v for v, c in counter.items() if c == max_count]
    return _closest(candidates, memory)


def _nearest(s: List[float], memory: float) -> float:
    """与 memory 最接近的次要项目分数（并列取较大者）。"""
    return _closest(list(set(s)), memory)


def _closest(candidates: List[float], target: float) -> float:
    return min(candidates, key=lambda v: (abs(v - target), -v))


class Cdr(BaseScale):
    code = "CDR"
    scoring_type = "CDR"

    def validate(self, answers: Dict[str, Any],
                 patient: Optional[Dict[str, Any]] = None) -> None:
        super().validate(answers, patient)
        for code in DOMAIN_CODES:
            if code not in answers or answers[code] is None:
                raise ValueError(f"CDR 功能域 {code} 缺少评分")

    def compute_raw(self, answers: Dict[str, Any],
                    patient: Optional[Dict[str, Any]] = None
                    ) -> Tuple[float, Dict[str, float], List[ItemScore]]:
        """收集 6 个功能域得分；返回值第一项为整体 CDR，第二项为各域得分。"""
        domain_scores: Dict[str, float] = {}
        item_scores: List[ItemScore] = []
        for code in DOMAIN_CODES:
            item = self.config.item_by_code(code)
            answer = answers[code]
            opt = self._resolve_option(item, answer)
            if opt is None:
                raise ValueError(f"CDR 功能域 {code} 的作答值 {answer!r} 无法匹配任何选项")
            score = opt.score
            if score not in _VALID_SCORES:
                raise ValueError(f"CDR 功能域 {code} 得分非法: {score}")
            domain_scores[code] = score
            item_scores.append(ItemScore(
                item_code=code, item_text=item.text, domain=item.domain,
                answer_value=str(answer), option_code=opt.code, score=score,
            ))

        memory = domain_scores[MEMORY_CODE]
        secondaries = [domain_scores[c] for c in DOMAIN_CODES if c != MEMORY_CODE]
        g_cdr = global_cdr(memory, secondaries)
        return g_cdr, domain_scores, item_scores

    def apply_cutoff(self, total: float, patient: Optional[Dict[str, Any]] = None
                     ) -> Tuple[Optional[str], Optional[float], str, Optional[bool]]:
        # CDR 无需教育界值；整体 CDR 即分级，异常判定为 CDR > 0
        label = CDR_LEVELS.get(total, f"CDR={total}")
        abnormal = total > 0.0
        return None, None, label, abnormal

    def extra_info(self, total: float, sub_scores: Dict[str, float],
                   patient: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        cdr_sb = sum(sub_scores.values())
        return {
            "cdr_sb": cdr_sb,
            "cdr_global": total,
            "domain_scores": dict(sub_scores),
            "cdr_sb_range": "0-18",
        }
