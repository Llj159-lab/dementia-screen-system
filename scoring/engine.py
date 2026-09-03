"""评分引擎 —— 全系统唯一计分入口。

所有量表都必须通过本模块的 :func:`score` 进行计分，以保证计分逻辑唯一、准确。

用法::

    from scoring.engine import score

    result = score("GDS", {"GDS_01": "是", "GDS_05": "否", ...})
    result = score("MMSE", {"MMSE_01": "1", ...}, patient={"education_years": 9})

也可通过 `db.loader` 从数据库加载配置后传入（缺省使用内置配置）::

    config = load_scale_config("MMSE")          # 从 MySQL 加载
    result = score("MMSE", answers, patient=patient, config=config)
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from .base import BaseScale
from .models import ScaleConfig, ScoreResult
from .scales import SCALE_CLASSES, get_scaler


def score(scale_code: str,
          answers: Dict[str, Any],
          patient: Optional[Dict[str, Any]] = None,
          config: Optional[ScaleConfig] = None) -> ScoreResult:
    """统一评分入口（唯一对外计分函数）。

    :param scale_code: 量表编码，SCD_Q9 / GDS / FAQ / MMSE / MOCA_B / CDR
    :param answers: 作答字典，形如 {"题目编码": "选项编码/文本"}
    :param patient: 患者上下文（如 {"education_years": 12}），MMSE/MoCA-B 必需
    :param config: 可选，显式传入的量表配置（如来自数据库）；缺省用内置配置
    :return: 评分结果 ScoreResult
    """
    scaler = _build_scaler(scale_code, config)
    return scaler.score(answers, patient)


def _build_scaler(scale_code: str, config: Optional[ScaleConfig] = None) -> BaseScale:
    scale_code = scale_code.upper()
    if scale_code not in SCALE_CLASSES:
        raise KeyError(f"未知量表编码: {scale_code}，可选值: {list(SCALE_CLASSES.keys())}")
    if config is None:
        return get_scaler(scale_code)
    if config.code != scale_code:
        raise ValueError(f"传入配置编码 {config.code} 与量表编码 {scale_code} 不一致")
    return SCALE_CLASSES[scale_code](config)


def available_scales() -> list:
    """返回支持的量表编码列表。"""
    return list(SCALE_CLASSES.keys())
