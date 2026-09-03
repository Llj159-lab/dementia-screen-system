"""数据库访问层。

提供 MySQL 连接与量表配置加载：
- ``connection.get_connection``：建立 PyMySQL 连接
- ``loader.load_scale_config``：从数据库加载单个量表配置（ScaleConfig）
- ``loader.load_all_scales``：从数据库加载全部量表配置

加载得到的 ``ScaleConfig`` 可直接传入 ``scoring.engine.score`` 的 ``config`` 参数，
实现「数据在库、逻辑在码」的单一数据源闭环。
"""

from .connection import get_connection
from .loader import load_all_scales, load_scale_config

__all__ = ["get_connection", "load_scale_config", "load_all_scales"]
