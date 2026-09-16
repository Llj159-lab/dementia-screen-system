"""MoCA-B —— 蒙特利尔认知评估基础量表（分项计分 + 教育界值）。"""

from ..base import EducationScale


class MocaB(EducationScale):
    code = "MOCA_B"
    scoring_type = "ITEMIZED"
