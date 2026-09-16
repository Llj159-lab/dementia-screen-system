"""FAQ —— 功能活动问卷（累加计分，0~3 四级 + NA）。

NA（不适用）项不计入总分；总分 = 非 NA 项得分之和。
"""

from ..base import BaseScale


class Faq(BaseScale):
    code = "FAQ"
    scoring_type = "SUM"
