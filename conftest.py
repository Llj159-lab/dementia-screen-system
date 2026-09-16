"""pytest 根配置：确保项目根目录在 sys.path 中，便于 import scoring / db。"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
