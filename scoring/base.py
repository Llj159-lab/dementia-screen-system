"""量表评分基类。

统一封装评分流程：校验作答 → 计算原始分（含分项）→ 应用界值 → 汇总结果。
- 累加类量表（SCD-Q9 / GDS / FAQ）直接求和选项分值；
- 分项类量表（MMSE / MoCA-B）在求和基础上按认知域汇总，并按教育程度匹配界值；
- CDR 量表完全覆写计算与界值逻辑（复杂 Morris 规则）。
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from .models import ItemConfig, ItemScore, OptionConfig, ScaleConfig, ScoreResult


class BaseScale:
    """累加类量表基类（SUM）。"""

    code: str = ""
    scoring_type: str = "SUM"

    def __init__(self, config: ScaleConfig):
        self.config = config

    # ------------------------------------------------------------------
    # 对外统一入口
    # ------------------------------------------------------------------
    def score(self, answers: Dict[str, Any],
              patient: Optional[Dict[str, Any]] = None) -> ScoreResult:
        self.validate(answers, patient)
        total, sub_scores, item_scores = self.compute_raw(answers, patient)
        cutoff_group, cutoff_value, result_label, is_abnormal = self.apply_cutoff(
            total, patient)
        return ScoreResult(
            scale_code=self.config.code,
            scale_name=self.config.name,
            total_score=total,
            sub_scores=sub_scores,
            item_scores=item_scores,
            result_label=result_label,
            cutoff_group=cutoff_group,
            cutoff_value=cutoff_value,
            is_abnormal=is_abnormal,
            extra=self.extra_info(total, sub_scores, patient),
        )

    # ------------------------------------------------------------------
    # 校验
    # ------------------------------------------------------------------
    def validate(self, answers: Dict[str, Any],
                 patient: Optional[Dict[str, Any]] = None) -> None:
        """校验必答题是否作答、作答值是否能匹配到有效选项。"""
        if not isinstance(answers, dict):
            raise ValueError("answers 必须是 dict，形如 {'题号': '选项值'}")

        missing = []
        for it in self.config.items:
            if it.required and it.code not in answers:
                missing.append(it.code)
        if missing:
            raise ValueError(f"以下必答题目缺少作答: {missing}")

        for it in self.config.items:
            if it.code in answers and answers[it.code] is not None:
                if self._resolve_option(it, answers[it.code]) is None:
                    raise ValueError(
                        f"题目 {it.code} 的作答值 {answers[it.code]!r} 无法匹配任何选项")

    # ------------------------------------------------------------------
    # 计算原始分
    # ------------------------------------------------------------------
    def compute_raw(self, answers: Dict[str, Any],
                    patient: Optional[Dict[str, Any]] = None
                    ) -> Tuple[float, Dict[str, float], List[ItemScore]]:
        """逐题匹配选项、累加分值，并按 domain 汇总分项得分。"""
        total = 0.0
        sub_scores: Dict[str, float] = {}
        item_scores: List[ItemScore] = []

        for it in self.config.items:
            answer = answers.get(it.code)
            if answer is None:
                # 非必答且未作答则跳过
                continue
            opt = self._resolve_option(it, answer)
            if opt is None:
                raise ValueError(f"题目 {it.code} 的作答值 {answer!r} 无法匹配任何选项")

            score = 0.0 if opt.is_na else opt.score
            total += score
            item_scores.append(ItemScore(
                item_code=it.code, item_text=it.text, domain=it.domain,
                answer_value=str(answer), option_code=opt.code, score=score,
            ))
            if it.domain:
                sub_scores[it.domain] = sub_scores.get(it.domain, 0.0) + score

        return total, sub_scores, item_scores

    # ------------------------------------------------------------------
    # 界值匹配（累加类默认按 LEVEL 分级）
    # ------------------------------------------------------------------
    def apply_cutoff(self, total: float, patient: Optional[Dict[str, Any]] = None
                     ) -> Tuple[Optional[str], Optional[float], str, Optional[bool]]:
        for c in self.config.cutoffs:
            if c.cutoff_type != "LEVEL":
                continue
            if (c.min_score is None or total >= c.min_score) and \
               (c.max_score is None or total <= c.max_score):
                return c.group_key, c.max_score, c.result_label, c.is_abnormal
        return None, None, "", None

    # ------------------------------------------------------------------
    # 附加信息
    # ------------------------------------------------------------------
    def extra_info(self, total: float, sub_scores: Dict[str, float],
                   patient: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return {}

    # ------------------------------------------------------------------
    # 工具
    # ------------------------------------------------------------------
    def _resolve_option(self, item: ItemConfig, answer: Any) -> Optional[OptionConfig]:
        """按「编码 → 文本」顺序匹配选项。"""
        ans = str(answer).strip()
        for opt in item.options:
            if opt.code == ans or opt.text == ans:
                return opt
        return None


class EducationScale(BaseScale):
    """分项类量表基类（ITEMIZED）：按受教育年限匹配教育界值。"""

    scoring_type = "ITEMIZED"

    def apply_cutoff(self, total: float, patient: Optional[Dict[str, Any]] = None
                     ) -> Tuple[Optional[str], Optional[float], str, Optional[bool]]:
        years = self._education_years(patient)
        for c in self.config.cutoffs:
            if c.cutoff_type != "EDUCATION":
                continue
            lo = c.edu_years_min if c.edu_years_min is not None else float("-inf")
            hi = c.edu_years_max if c.edu_years_max is not None else float("inf")
            if lo <= years <= hi:
                abnormal = total <= c.threshold
                return c.group_key, c.threshold, c.result_label, abnormal
        return None, None, "", None

    def _education_years(self, patient: Optional[Dict[str, Any]]) -> int:
        if not patient or "education_years" not in patient:
            raise ValueError(
                f"量表 {self.config.code} 需要受教育年限以匹配教育界值，"
                "请在 patient 中提供 education_years")
        years = patient["education_years"]
        if not isinstance(years, int) or years < 0:
            raise ValueError(f"education_years 必须是 >=0 的整数，得到 {years!r}")
        return years
