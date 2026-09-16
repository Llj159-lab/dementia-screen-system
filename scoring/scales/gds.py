"""GDS-15 —— 老年抑郁量表（累加计分，含反序计分）。

反序计分（第 1、5、7、11、13 题）已内化到选项分值中，
故本量表与其它累加量表一致，直接对选项分值求和即可。
"""

from ..base import BaseScale


class Gds(BaseScale):
    code = "GDS"
    scoring_type = "SUM"
