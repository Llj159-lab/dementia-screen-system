"""认知障碍评估量表评分引擎。

对外公开：
- ``score``：统一评分入口（唯一计分函数）
- ``available_scales``：支持的量表编码
- ``config_data``：内置量表配置（题目/选项/分值/界值/指导语）
- ``cdr.global_cdr``：CDR 整体评分算法（可独立调用）

所有量表计分都必须通过 ``scoring.engine.score`` 完成，保证全系统计分逻辑唯一。
"""

from .engine import available_scales, score
from .models import (
    CutoffConfig,
    ItemConfig,
    ItemScore,
    OptionConfig,
    ScaleConfig,
    ScoreResult,
)

__all__ = [
    "score",
    "available_scales",
    "ScaleConfig",
    "ItemConfig",
    "OptionConfig",
    "CutoffConfig",
    "ItemScore",
    "ScoreResult",
]
