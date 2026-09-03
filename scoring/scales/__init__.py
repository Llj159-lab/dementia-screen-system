"""量表实现注册表。

将 6 个量表编码映射到其评分实现类。评分引擎通过本注册表实例化对应量表。
"""

from __future__ import annotations

from typing import Dict, Type

from ..base import BaseScale
from ..config_data import get_scale
from .cdr import Cdr
from .faq import Faq
from .gds import Gds
from .mmse import Mmse
from .moca_b import MocaB
from .scd_q9 import ScdQ9

# 量表编码 → 实现类
SCALE_CLASSES: Dict[str, Type[BaseScale]] = {
    "SCD_Q9": ScdQ9,
    "GDS": Gds,
    "FAQ": Faq,
    "MMSE": Mmse,
    "MOCA_B": MocaB,
    "CDR": Cdr,
}


def get_scaler(scale_code: str) -> BaseScale:
    """按量表编码实例化评分器（自动装载配置）。"""
    if scale_code not in SCALE_CLASSES:
        raise KeyError(f"未知量表编码: {scale_code}，可选值: {list(SCALE_CLASSES.keys())}")
    config = get_scale(scale_code)
    return SCALE_CLASSES[scale_code](config)


__all__ = ["SCALE_CLASSES", "get_scaler", "ScdQ9", "Gds", "Faq", "Mmse", "MocaB", "Cdr"]
