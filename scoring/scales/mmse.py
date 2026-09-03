"""MMSE —— 简易精神状态检查（分项计分 + 教育界值）。"""

from ..base import EducationScale


class Mmse(EducationScale):
    code = "MMSE"
    scoring_type = "ITEMIZED"
