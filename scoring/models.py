"""评分引擎核心数据结构。

本模块定义了量表配置（题目 / 选项 / 界值）与评分结果（总分 / 分项 / 逐题得分）
等数据类。所有量表配置数据最终都收敛到这些结构，供评分引擎统一消费。

设计原则：
- 数据（题目、选项、分值、界值、指导语）以配置对象的形式存在；
- 逻辑（累加 / 反向 / 分项 / CDR 复杂规则）由各量表实现类负责；
- 对外只暴露统一的评分入口，保证全系统计分逻辑唯一、准确。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class OptionConfig:
    """题目选项配置。"""

    code: str                    # 选项编码（作答匹配主键），如 "是" / "1" / "0.5"
    text: str                    # 选项显示文本
    score: float                 # 该选项对应的分值
    is_na: bool = False          # 是否为「不适用 / NA」项（不计分）

    def to_dict(self) -> Dict[str, Any]:
        return {"code": self.code, "text": self.text,
                "score": self.score, "is_na": self.is_na}


@dataclass
class ItemConfig:
    """量表题目配置。"""

    code: str                    # 题目编码，如 "MMSE_01"、"CDR_MEMORY"
    no: int                      # 题号（展示顺序）
    text: str                    # 题干内容
    options: List[OptionConfig]  # 选项列表
    domain: Optional[str] = None # 所属认知域 / 分项（MMSE、MoCA-B、CDR 使用）
    max_score: float = 0.0       # 该题满分
    score_method: str = "DIRECT" # 计分方式：DIRECT(直接取选项分值) / SPECIAL(特殊逻辑)
    required: bool = True        # 是否必答
    remark: str = ""             # 备注（如「练习，不计分」）

    def option_by_code(self, code: str) -> Optional[OptionConfig]:
        """按选项编码精确匹配选项。"""
        for opt in self.options:
            if opt.code == code:
                return opt
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code, "no": self.no, "text": self.text,
            "domain": self.domain, "max_score": self.max_score,
            "score_method": self.score_method, "required": self.required,
            "remark": self.remark,
            "options": [o.to_dict() for o in self.options],
        }


@dataclass
class CutoffConfig:
    """量表界值 / 分级配置。

    两种类型：
    - EDUCATION：教育程度界值，通过受教育年限区间 [edu_years_min, edu_years_max]
      匹配，threshold 为界值分，得分 <= threshold 判为异常（MMSE / MoCA-B）。
    - LEVEL：分级解释，通过总分区间 [min_score, max_score] 匹配，
      result_label 为解释文字（GDS 分级 / FAQ 分级）。
    """

    cutoff_type: str             # EDUCATION / LEVEL
    group_key: str               # 分组键，如 "文盲" / "0-4"
    result_label: str            # 解释文字，如 "正常" / "轻度抑郁"
    is_abnormal: bool = False    # 是否判为异常
    edu_years_min: Optional[int] = None
    edu_years_max: Optional[int] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    threshold: Optional[float] = None   # 界值分

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cutoff_type": self.cutoff_type, "group_key": self.group_key,
            "result_label": self.result_label, "is_abnormal": self.is_abnormal,
            "edu_years_min": self.edu_years_min, "edu_years_max": self.edu_years_max,
            "min_score": self.min_score, "max_score": self.max_score,
            "threshold": self.threshold,
        }


@dataclass
class ScaleConfig:
    """量表级配置（元数据 + 题目 + 界值）。"""

    code: str                    # 量表编码：SCD_Q9 / GDS / FAQ / MMSE / MOCA_B / CDR
    name: str                    # 中文名
    full_name: str               # 英文 / 全称
    scoring_type: str            # SUM(累加) / ITEMIZED(分项) / CDR(复杂)
    score_min: float             # 理论最低分
    score_max: float             # 理论最高分
    summary: str                 # 概述
    instruction: str             # 指导语
    items: List[ItemConfig] = field(default_factory=list)
    cutoffs: List[CutoffConfig] = field(default_factory=list)
    version: str = "1.0"
    remark: str = ""

    def item_by_code(self, code: str) -> Optional[ItemConfig]:
        for it in self.items:
            if it.code == code:
                return it
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code, "name": self.name, "full_name": self.full_name,
            "scoring_type": self.scoring_type, "score_min": self.score_min,
            "score_max": self.score_max, "summary": self.summary,
            "instruction": self.instruction, "version": self.version,
            "remark": self.remark,
            "items": [i.to_dict() for i in self.items],
            "cutoffs": [c.to_dict() for c in self.cutoffs],
        }


@dataclass
class ItemScore:
    """单个题目的得分记录。"""

    item_code: str
    item_text: str
    domain: Optional[str]
    answer_value: str            # 原始作答值
    option_code: Optional[str]    # 命中的选项编码
    score: float


@dataclass
class ScoreResult:
    """一次评分的完整结果。"""

    scale_code: str
    scale_name: str
    total_score: float            # 总分
    sub_scores: Dict[str, float]  # 分项得分（按认知域）
    item_scores: List[ItemScore]  # 逐题得分
    result_label: str = ""        # 解释结果，如 "正常" / "轻度抑郁" / "CDR=1"
    cutoff_group: Optional[str] = None   # 匹配到的界值分组
    cutoff_value: Optional[float] = None # 所用界值
    is_abnormal: Optional[bool] = None   # 是否异常
    extra: Dict[str, Any] = field(default_factory=dict)  # 附加信息（CDR-SB 等）

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scale_code": self.scale_code,
            "scale_name": self.scale_name,
            "total_score": self.total_score,
            "sub_scores": self.sub_scores,
            "item_scores": [
                {
                    "item_code": s.item_code, "item_text": s.item_text,
                    "domain": s.domain, "answer_value": s.answer_value,
                    "option_code": s.option_code, "score": s.score,
                }
                for s in self.item_scores
            ],
            "result_label": self.result_label,
            "cutoff_group": self.cutoff_group,
            "cutoff_value": self.cutoff_value,
            "is_abnormal": self.is_abnormal,
            "extra": self.extra,
        }
