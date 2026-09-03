"""MySQL 连接管理（PyMySQL）。

连接参数优先读环境变量，其次用内置默认值（本机开发默认）。
环境变量：DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME / DB_CHARSET。
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

import pymysql


# 默认连接参数（可按实际环境修改，或通过环境变量覆盖）
DEFAULT_CONFIG: Dict[str, Any] = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "ad_cognition",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": True,
}


def get_connection(config: Optional[Dict[str, Any]] = None) -> pymysql.connections.Connection:
    """建立 MySQL 连接。

    :param config: 连接参数字典；缺省时合并 DEFAULT_CONFIG 与环境变量。
    :return: PyMySQL 连接对象
    """
    cfg = dict(DEFAULT_CONFIG)
    if config:
        cfg.update(config)

    # 环境变量覆盖
    env_map = {
        "DB_HOST": "host",
        "DB_PORT": "port",
        "DB_USER": "user",
        "DB_PASSWORD": "password",
        "DB_NAME": "database",
        "DB_CHARSET": "charset",
    }
    for env_key, cfg_key in env_map.items():
        val = os.environ.get(env_key)
        if val:
            cfg[cfg_key] = int(val) if cfg_key == "port" else val

    return pymysql.connect(**cfg)
