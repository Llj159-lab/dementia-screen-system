"""演示脚本：对 6 个量表进行端到端评分示例。

既可作为使用示例，也可作为脱离 pytest 的快速自检。
运行：``python scripts/demo.py``
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring import available_scales, score
from scoring.config_data import get_scale
from scoring.scales.cdr import global_cdr


def max_answers(code: str) -> dict:
    return {it.code: max(it.options, key=lambda o: o.score).code
            for it in get_scale(code).items}


GDS_REVERSE_NOS = {1, 5, 7, 11, 13}


def gds_answer(no: int, depressed: bool) -> str:
    if no in GDS_REVERSE_NOS:
        return "否" if depressed else "是"
    return "是" if depressed else "否"


def show(r):
    print(f"  [{r.scale_code}] {r.scale_name}")
    print(f"    总分={r.total_score}  分项={r.sub_scores or '-'}")
    print(f"    结果={r.result_label!r}  界值分组={r.cutoff_group!r} "
          f"界值={r.cutoff_value}  异常={r.is_abnormal}  附加={r.extra or '-'}")
    return r


def main():
    print("支持量表：", available_scales())
    print()

    print("① SCD-Q9（累加）：")
    show(score("SCD_Q9", max_answers("SCD_Q9")))
    print()

    print("② GDS（累加，含反序）：")
    show(score("GDS", {f"GDS_{n:02d}": gds_answer(n, True) for n in range(1, 16)}))
    print()

    print("③ FAQ（累加，含 NA）：")
    ans = {f"FAQ_{i:02d}": "3" for i in range(1, 11)}
    ans["FAQ_01"] = "NA"
    show(score("FAQ", ans))
    print()

    print("④ MMSE（分项 + 教育界值，受教育 9 年）：")
    show(score("MMSE", max_answers("MMSE"), patient={"education_years": 9}))
    print()

    print("⑤ MoCA-B（分项 + 教育界值，受教育 16 年）：")
    show(score("MOCA_B", max_answers("MOCA_B"), patient={"education_years": 16}))
    print()

    print("⑥ CDR（复杂评分）：")
    show(score("CDR", {"CDR_MEMORY": "2", "CDR_ORIENTATION": "1", "CDR_JUDGMENT": "1",
                       "CDR_COMMUNITY": "0.5", "CDR_HOME": "1", "CDR_PERSONAL_CARE": "0.5"}))
    print()

    print("CDR 算法直接调用：M=3, 次要=[3,2,2,1,1] →",
          global_cdr(3.0, [3.0, 2.0, 2.0, 1.0, 1.0]))


if __name__ == "__main__":
    main()
